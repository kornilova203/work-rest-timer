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
    browser = await chromium.launch({ 
      headless: false,  // Show the browser window
      slowMo: 500       // Slow down operations by 500ms for better visibility
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
    // Go to the app page
    await page.goto(URL);
    console.log('Loaded the application');
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-state.png') });
    
    // Open entries modal and clear existing entries if any
    await page.click('#entries');
    console.log('Opened entries modal');
    
    await page.screenshot({ path: path.join(screenshotsDir, '02-entries-modal.png') });
    
    // Check if there are entries and clear them if needed
    const hasClearButton = await page.isVisible('#clear-entries');
    const hasNoEntries = await page.isVisible('.no-entries');
    
    if (hasClearButton && !hasNoEntries) {
      page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.accept();
      });
      
      await page.click('#clear-entries');
      console.log('Cleared existing entries');
      
      await page.screenshot({ path: path.join(screenshotsDir, '03-cleared-entries.png') });
    }
    
    // Close the entries modal
    await page.click('#close-entries');
    console.log('Closed entries modal');
    
    await page.screenshot({ path: path.join(screenshotsDir, '04-main-view.png') });
    
    // Click on the work timer to start it
    await page.click('#player1');
    console.log('Clicked on work timer');
    
    // Check that work timer has the "current" class
    const isWorkTimerActive = await page.evaluate(() => {
      return document.getElementById('player1').classList.contains('current');
    });
    assert.ok(isWorkTimerActive, 'Work timer should be active after clicking it');
    
    await page.screenshot({ path: path.join(screenshotsDir, '05-work-timer-active.png') });
    
    // Wait for a few seconds to simulate work time
    await page.waitForTimeout(3000);
    console.log('Waited 3 seconds');
    
    // Click on the rest timer to switch
    await page.click('#player2');
    console.log('Clicked on rest timer');
    
    await page.screenshot({ path: path.join(screenshotsDir, '06-rest-timer-active.png') });
    
    // Check that rest timer has the "current" class
    const isRestTimerActive = await page.evaluate(() => {
      return document.getElementById('player2').classList.contains('current');
    });
    assert.ok(isRestTimerActive, 'Rest timer should be active after clicking it');
    
    // Open the entries modal to check if an entry was created
    await page.click('#entries');
    console.log('Opened entries modal to check for time entry');
    
    await page.screenshot({ path: path.join(screenshotsDir, '07-entries-with-entry.png') });
    
    // Check if there's at least one entry
    const entryCount = await page.evaluate(() => {
      return document.querySelectorAll('.entry-item').length;
    });
    assert.ok(entryCount > 0, 'At least one time entry should exist');
    
    // Check that the entry has the expected elements
    const hasDescription = await page.isVisible('.entry-description');
    assert.ok(hasDescription, 'Entry should have a description');
    
    const hasTimeRange = await page.isVisible('.entry-time');
    assert.ok(hasTimeRange, 'Entry should have a time range');
    
    const hasDuration = await page.isVisible('.entry-duration');
    assert.ok(hasDuration, 'Entry should have a duration');
    
    // Check if the duration is not zero
    const durationText = await page.textContent('.entry-duration');
    assert.ok(durationText.includes('Duration:'), 'Duration element should contain "Duration:" text');
    assert.ok(!durationText.includes('0s'), 'Duration should not be zero seconds');
    
    console.log('Test completed successfully!');
  });
});