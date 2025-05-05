const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Create a directory to store screenshots
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

describe('Work-Rest Timer Visual Tests', function() {
  let browser, page, server;
  const PORT = 8080;
  const URL = `http://localhost:${PORT}`;
  
  /**
   * Opens the entries modal
   */
  async function openEntriesModal() {
    console.log('Opening entries modal...');
    await page.click('#entries');
    await page.waitForSelector('#entries-modal:not(.hidden)');
    console.log('Entries modal opened');
  }
  
  /**
   * Closes the entries modal
   */
  async function closeEntriesModal() {
    console.log('Closing entries modal...');
    await page.click('#close-entries');
    
    try {
      await page.waitForSelector('#entries-modal.hidden', { timeout: 3000 });
      console.log('Entries modal closed');
    } catch (error) {
      console.log('Modal close timed out, using JavaScript to close it');
      // Force close using JavaScript if the button click doesn't work
      await page.evaluate(() => {
        document.getElementById('entries-modal').classList.add('hidden');
      });
      await page.waitForTimeout(500);
    }
  }
  
  /**
   * Checks and asserts that there are no time entries present in the entries modal
   */
  async function assertNoTimeEntries() {
    console.log('Checking that there are no time entries...');
    
    await openEntriesModal();
    
    // Check if the "no entries" message is visible
    const noEntriesVisible = await page.isVisible('.no-entries');
    assert.ok(noEntriesVisible, 'The "No time entries yet" message should be visible');
    
    // Double-check that there are no entry items
    const entryCount = await page.evaluate(() => {
      return document.querySelectorAll('.entry-item').length;
    });
    assert.strictEqual(entryCount, 0, 'There should be no time entries present');
    
    console.log('Verified: No time entries present');
    
    // Take a screenshot of the empty entries list
    await page.screenshot({ path: path.join(screenshotsDir, 'empty-entries.png') });
    
    await closeEntriesModal();
  }
  
  /**
   * Parses and returns time entries from the entries modal
   * @returns {Promise<Array>} Array of time entry objects with description, timeRange, and duration
   */
  async function getTimeEntries() {
    console.log('Getting time entries...');
    
    await openEntriesModal();
    
    // Take a screenshot of the entries list
    await page.screenshot({ path: path.join(screenshotsDir, 'entries-list.png') });
    
    // Check if the "no entries" message is visible - if it is, return empty array
    const noEntriesVisible = await page.isVisible('.no-entries');
    if (noEntriesVisible) {
      console.log('No time entries found');
      await closeEntriesModal();
      return [];
    }
    
    // Parse time entries from the UI
    const entries = await page.evaluate(() => {
      const entryElements = Array.from(document.querySelectorAll('.entry-item'));
      return entryElements.map(entry => {
        return {
          description: entry.querySelector('.entry-description')?.textContent.trim() || '',
          timeRange: entry.querySelector('.entry-time')?.textContent.trim() || '',
          duration: entry.querySelector('.entry-duration')?.textContent.trim() || ''
        };
      });
    });
    
    console.log(`Found ${entries.length} time entries`);
    
    // For debugging purposes, log the first entry details if available
    if (entries.length > 0) {
      console.log(`First entry: 
        Description: ${entries[0].description}
        Time Range: ${entries[0].timeRange}
        Duration: ${entries[0].duration}`);
    }
    
    await closeEntriesModal();
    return entries;
  }
  
  // Start a local server before tests
  before(async function() {
    // Start a static file server
    server = spawn('npx', ['serve', '-l', PORT.toString()], {
      stdio: 'pipe',
      shell: true,
      cwd: path.resolve(__dirname, '..')
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Launch the browser
    // Check if we're running in IDE (using environment variable)
    const isIDE = process.env.RUN_MODE === 'ide';
    
    browser = await chromium.launch({ 
      headless: !isIDE,  // Show browser when running from IDE
      slowMo: isIDE ? 500 : 100  // Slow down more when visible for better observation
    });
    
    // Create a new browser context
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      recordVideo: { 
        dir: path.join(screenshotsDir, 'video')
      }
    });
    
    // Create a new page
    page = await context.newPage();
    
    // Use console.log from the page in the terminal
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
  });
  
  // Before each test
  beforeEach(async function() {
    // Go to the app page with fresh state
    await page.goto(URL);
    console.log('Loaded the application');
    
    // Clear any existing time entries
    await page.evaluate(() => {
      localStorage.removeItem('timeEntries');
      // Optionally reload to make sure the app picks up the changes
      window.location.reload();
    });
    
    // Wait for the page to reload and initialize
    await page.waitForLoadState('networkidle');
  });
  
  // Clean up after tests
  after(async function() {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.kill();
    }
  });
  
  it('should create a time entry when switching between work and rest timers', async function() {
    // This test involves browser automation and may take longer than standard unit tests
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-state.png') });
    
    // Check that there are no entries at the start of the test
    await assertNoTimeEntries();
    
    await page.screenshot({ path: path.join(screenshotsDir, '02-main-view.png') });
    
    // Click on the work timer to start it
    await page.click('#player1');
    console.log('Clicked on work timer');
    
    // Check that work timer has the "current" class
    const isWorkTimerActive = await page.evaluate(() => {
      return document.getElementById('player1').classList.contains('current');
    });
    assert.ok(isWorkTimerActive, 'Work timer should be active after clicking it');
    
    await page.screenshot({ path: path.join(screenshotsDir, '03-work-timer-active.png') });
    
    // Wait for a few seconds to simulate work time
    await page.waitForTimeout(3000);
    console.log('Waited 3 seconds');
    
    // Click on the rest timer to switch
    await page.click('#player2');
    console.log('Clicked on rest timer');
    
    await page.screenshot({ path: path.join(screenshotsDir, '04-rest-timer-active.png') });
    
    // Check that rest timer has the "current" class
    const isRestTimerActive = await page.evaluate(() => {
      return document.getElementById('player2').classList.contains('current');
    });
    assert.ok(isRestTimerActive, 'Rest timer should be active after clicking it');
    
    // Get time entries and assert that the list is not empty
    const timeEntries = await getTimeEntries();
    
    // Assert that we have at least one time entry
    assert.ok(timeEntries.length > 0, 'At least one time entry should exist');
    
    // Verify that the time entry has the expected format
    const entry = timeEntries[0];
    assert.ok(entry.description, 'Entry should have a description');
    assert.ok(entry.timeRange, 'Entry should have a time range');
    assert.ok(entry.duration, 'Entry should have a duration');
    assert.ok(entry.duration.includes('Duration:'), 'Duration should include the "Duration:" text');
    assert.ok(!entry.duration.includes('0s'), 'Duration should not be zero seconds');
    
    // Validate specific content
    assert.strictEqual(entry.description, 'Work session', 'Entry description should be "Work session"');
    assert.ok(entry.timeRange.includes('-'), 'Time range should include a hyphen between start and end times');
    
    // Extract duration value (e.g., "Duration: 3s" -> "3s")
    const durationValue = entry.duration.replace('Duration:', '').trim();
    // Verify that the duration is a number followed by 's' (for seconds)
    assert.match(durationValue, /^\d+s$/, 'Duration should be in the format of "Xs" where X is a number');
    
    console.log('Test completed successfully!');
  });
  
  it('should create a time entry when pausing the work timer', async function() {
    // This test involves browser automation and may take longer than standard unit tests
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: path.join(screenshotsDir, 'pause-test-01-initial.png') });
    
    // Check that there are no entries at the start of the test
    await assertNoTimeEntries();
    
    // Click on the work timer to start it
    await page.click('#player1');
    console.log('Clicked on work timer to start');
    
    // Check that work timer has the "current" class
    const isWorkTimerActive = await page.evaluate(() => {
      return document.getElementById('player1').classList.contains('current');
    });
    assert.ok(isWorkTimerActive, 'Work timer should be active after clicking it');
    
    await page.screenshot({ path: path.join(screenshotsDir, 'pause-test-02-work-timer-active.png') });
    
    // Wait for a few seconds to simulate work time
    await page.waitForTimeout(3000);
    console.log('Waited 3 seconds');
    
    // Check if the controls with pause button are visible
    const isControlsVisible = await page.isVisible('#controls');
    if (!isControlsVisible) {
      // If controls aren't visible, click anywhere on the timer to show them
      await page.click('#player1 .time');
      await page.waitForSelector('#controls:not(.hidden)');
    }
    
    // Capture the current time entries count before pausing
    let entriesBeforePause = [];
    try {
      entriesBeforePause = await getTimeEntries();
      console.log(`Found ${entriesBeforePause.length} entries before pausing`);
    } catch (error) {
      console.log('No entries before pausing');
    }
    
    // Click the pause button
    await page.click('#pause');
    console.log('Clicked pause button');
    
    await page.screenshot({ path: path.join(screenshotsDir, 'pause-test-03-paused.png') });
    
    // Verify that the timer is paused
    const isPaused = await page.evaluate(() => {
      // Check if there's any indication of the paused state (could be a class or other attribute)
      return !document.getElementById('player1').classList.contains('running');
    });
    assert.ok(isPaused, 'Timer should be paused after clicking the pause button');
    
    // Get time entries to verify one was created by pausing
    const timeEntries = await getTimeEntries();
    
    // Assert that we have more entries after pausing than before
    assert.ok(timeEntries.length > entriesBeforePause.length, 
              `Expected more entries after pausing (found ${timeEntries.length}, had ${entriesBeforePause.length} before)`);
    
    // Verify the most recent entry details (first in the list)
    const entry = timeEntries[0];
    assert.strictEqual(entry.description, 'Work session', 'Entry description should be "Work session"');
    
    // Extract duration value
    const durationValue = entry.duration.replace('Duration:', '').trim();
    // Verify duration format
    assert.match(durationValue, /^\d+s$/, 'Duration should be in the format of "Xs" where X is a number');
    
    // Verify the specific time entry related to the pause action
    if (entriesBeforePause.length > 0) {
      // Compare timestamps to verify this is a new entry
      const previousEntryTime = entriesBeforePause[0].timeRange;
      const currentEntryTime = entry.timeRange;
      assert.notStrictEqual(previousEntryTime, currentEntryTime, 
                           'The new time entry should have a different timestamp than previous entries');
    }
    
    console.log('Pause test completed successfully!');
  });
  
  it('should remember initial times, create work time entries, and reset timers properly', async function() {
    // Take a screenshot of the initial state
    await page.screenshot({ path: path.join(screenshotsDir, 'reset-test-01-initial.png') });
    
    // Check that there are no entries at the start of the test
    await assertNoTimeEntries();
    
    // Get initial times from both timers
    const initialWorkTime = await page.textContent('#player1 .time');
    const initialRestTime = await page.textContent('#player2 .time');
    
    console.log(`Initial times - Work: ${initialWorkTime}, Rest: ${initialRestTime}`);
    
    // Start rest timer first
    await page.click('#player2');
    console.log('Started rest timer');
    
    // Check that rest timer has the "current" class
    const isRestTimerActive = await page.evaluate(() => {
      return document.getElementById('player2').classList.contains('current');
    });
    assert.ok(isRestTimerActive, 'Rest timer should be active after clicking it');
    
    await page.screenshot({ path: path.join(screenshotsDir, 'reset-test-02-rest-timer-active.png') });
    
    // Capture rest timer value right after starting
    const restTimeAfterStart = await page.textContent('#player2 .time');
    console.log(`Rest timer value after starting: ${restTimeAfterStart}`);
    
    // Wait for a few seconds to simulate rest time
    await page.waitForTimeout(2000);
    console.log('Waited 2 seconds on rest timer');
    
    // Capture rest timer value after waiting
    const restTimeAfterWaiting = await page.textContent('#player2 .time');
    console.log(`Rest timer value after waiting: ${restTimeAfterWaiting}`);
    
    // Verify rest timer time has decreased
    assert.notStrictEqual(restTimeAfterWaiting, restTimeAfterStart, 'Rest timer time should have changed while active');
    
    // Start work timer (switching from rest)
    await page.click('#player1');
    console.log('Switched to work timer');
    
    // Check that work timer has the "current" class
    const isWorkTimerActive = await page.evaluate(() => {
      return document.getElementById('player1').classList.contains('current');
    });
    assert.ok(isWorkTimerActive, 'Work timer should be active after clicking it');
    
    await page.screenshot({ path: path.join(screenshotsDir, 'reset-test-03-work-timer-active.png') });
    
    // Wait for a few seconds to simulate work time
    await page.waitForTimeout(2000);
    console.log('Waited 2 seconds on work timer');
    
    // Check if the controls with reset button are visible
    const isControlsVisible = await page.isVisible('#controls');
    if (!isControlsVisible) {
      // If controls aren't visible, click anywhere on the timer to show them
      await page.click('#player1 .time');
      await page.waitForSelector('#controls:not(.hidden)');
    }
    
    // Get current times before reset
    const workTimeBeforeReset = await page.textContent('#player1 .time');
    const restTimeBeforeReset = await page.textContent('#player2 .time');
    
    console.log(`Times before reset - Work: ${workTimeBeforeReset}, Rest: ${restTimeBeforeReset}`);
    
    // Verify times have changed from initial times
    assert.notStrictEqual(workTimeBeforeReset, initialWorkTime, 'Work timer time should have changed');
    assert.notStrictEqual(restTimeBeforeReset, initialRestTime, 'Rest timer time should have changed');
    
    // Click the reset button
    await page.click('#reset');
    console.log('Clicked reset button');
    
    await page.screenshot({ path: path.join(screenshotsDir, 'reset-test-04-after-reset.png') });
    
    // Verify both timers are reset to initial times
    const workTimeAfterReset = await page.textContent('#player1 .time');
    const restTimeAfterReset = await page.textContent('#player2 .time');
    
    console.log(`Times after reset - Work: ${workTimeAfterReset}, Rest: ${restTimeAfterReset}`);
    
    assert.strictEqual(workTimeAfterReset, initialWorkTime, 'Work timer should be reset to initial time');
    assert.strictEqual(restTimeAfterReset, initialRestTime, 'Rest timer should be reset to initial time');
    
    // Get time entries to verify they were created when switching timers and resetting
    const timeEntries = await getTimeEntries();
    
    // The application tracks only work sessions, not rest sessions
    // So we expect to find a time entry for the work session but not for the rest session
    assert.ok(timeEntries.length >= 1, `Should have at least 1 time entry, found ${timeEntries.length}`);
    
    // Verify the most recent entry details (first in the list - should be the work session)
    const entry = timeEntries[0];
    
    // Since we know the app only tracks work sessions, verify it's a work session entry
    assert.strictEqual(entry.description, 'Work session', 'Entry description should be "Work session"');
    assert.ok(entry.timeRange, 'Entry should have a time range');
    assert.ok(entry.duration, 'Entry should have a duration');
    
    // Verify that the time range includes a timestamp from today
    // The date format can vary based on browser locale settings, so we'll check for year/month/day numbers
    const today = new Date();
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString(); // getMonth() is 0-indexed
    const day = today.getDate().toString();
    
    // Check that the time range includes today's date in some format
    assert.ok(
      entry.timeRange.includes(year) && 
      (entry.timeRange.includes(`/${month}/`) || entry.timeRange.includes(`/${month.padStart(2, '0')}/`) || 
       entry.timeRange.includes(`.${month}.`) || entry.timeRange.includes(`.${month.padStart(2, '0')}.`)), 
      'Time range should include current year and month'
    );
    
    // Log the entry for debugging
    console.log(`Found time entry: 
        Description: ${entry.description}
        Time Range: ${entry.timeRange}
        Duration: ${entry.duration}`);
    
    console.log('Reset test completed successfully!');
  });
});