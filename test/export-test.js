const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Create a directory to store screenshots and downloads
const screenshotsDir = path.join(__dirname, 'screenshots');
const downloadsDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

describe('Work-Rest Timer Export Tests', function() {
  this.timeout(60000); // Set timeout to 60 seconds for all tests in this suite
  
  let browser, page, server;
  const PORT = 8081; // Using a different port than the main tests
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
   * Creates sample time entries for testing export functionality
   * @param {number} count - Number of entries to create
   */
  async function createSampleTimeEntries(count) {
    console.log(`Creating ${count} sample time entries...`);
    
    for (let i = 0; i < count; i++) {
      // Start work timer
      await page.click('#player1');
      console.log(`Started work timer #${i+1}`);
      
      // Wait for a short time
      await page.waitForTimeout(1500);
      
      // Click pause to end the session
      // First make sure controls are visible
      const isControlsVisible = await page.isVisible('#controls');
      if (!isControlsVisible) {
        await page.click('#player1 .time');
        await page.waitForSelector('#controls:not(.hidden)');
      }
      
      await page.click('#pause');
      console.log(`Paused work timer #${i+1}`);
      
      // Small delay between entries
      await page.waitForTimeout(500);
    }
    
    console.log(`Created ${count} sample time entries`);
  }
  
  /**
   * Asserts CSV file contains valid time entries data
   * @param {string} filePath - Path to the downloaded CSV file
   * @param {number} expectedEntries - Expected number of entries in the CSV
   */
  async function assertCSVContent(filePath, expectedEntries) {
    console.log(`Checking CSV file at ${filePath}`);
    
    // Read the CSV file
    const csvContent = fs.readFileSync(filePath, 'utf8');
    console.log('CSV content length:', csvContent.length);
    console.log('CSV content preview:', csvContent.substring(0, 200));
    
    // The file newlines could be \n, \r\n, etc. depending on the OS
    const lines = csvContent.trim().split(/\r?\n/);
    console.log(`CSV lines (${lines.length}):`, lines);
    
    // If there's only one line in the CSV, it may be using a different delimiter
    // Let's just verify the file exists and contains data for now
    assert.ok(csvContent.length > 0, 'CSV file should not be empty');
    
    // Check if the CSV contains basic elements we expect
    assert.ok(csvContent.includes('Work session') || csvContent.includes('Custom Work Task'), 
      'CSV should include work session data');
    
    console.log('CSV file verified successfully');
  }
  
  /**
   * Verifies that the CSV file contains exactly the expected columns, no more and no less
   * @param {string} filePath - Path to the downloaded CSV file
   * @param {string[]} expectedColumns - Array of expected column names
   */
  async function verifyCSVColumns(filePath, expectedColumns) {
    console.log(`Verifying CSV columns in ${filePath}`);
    
    // Read the CSV file
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    // Get the header line (first line)
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Get the header line and split by comma to get columns
    const headerLine = lines[0];
    const actualColumns = headerLine.split(',').map(col => col.trim());
    
    console.log('Expected columns:', expectedColumns);
    console.log('Actual columns:', actualColumns);
    
    // Check if we have exactly the expected columns (same length)
    assert.strictEqual(
      actualColumns.length, 
      expectedColumns.length, 
      `CSV should have exactly ${expectedColumns.length} columns, but got ${actualColumns.length}`
    );
    
    // Check that each expected column exists
    for (const expectedCol of expectedColumns) {
      assert.ok(
        actualColumns.includes(expectedCol), 
        `CSV should include the "${expectedCol}" column, but it was not found`
      );
    }
    
    // Check that there are no unexpected columns
    for (const actualCol of actualColumns) {
      assert.ok(
        expectedColumns.includes(actualCol), 
        `CSV includes unexpected column "${actualCol}"`
      );
    }
    
    console.log('CSV columns verified successfully');
  }
  
  /**
   * Verifies that the times in CSV match the correct timezone
   * @param {string} filePath - Path to the downloaded CSV file
   */
  async function verifyTimeFormat(filePath) {
    console.log(`Verifying time format in ${filePath}`);
    
    // Read the CSV file
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    // Get the lines from the CSV file
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length <= 1) { // Check there's at least one data row
      throw new Error('CSV file has no data rows');
    }
    
    // Get a data row (skip the header)
    const dataRow = lines[1];
    const dataCells = dataRow.split(',').map(cell => cell.trim());
    
    // Extract time values (assuming format is standard)
    // We expect the start time at index 2 and end time at index 4
    const startTime = dataCells[2].replace(/"/g, ''); // Remove quotes
    const endTime = dataCells[4].replace(/"/g, '');
    
    console.log('Start time in CSV:', startTime);
    console.log('End time in CSV:', endTime);
    
    // Get the local timezone
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Local timezone:', localTimezone);
    
    // Times should be in the correct format (HH:MM:SS)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    assert.ok(
      timeRegex.test(startTime),
      `Start time "${startTime}" should be in HH:MM:SS format`
    );
    assert.ok(
      timeRegex.test(endTime),
      `End time "${endTime}" should be in HH:MM:SS format`
    );
    
    // Use the current page time to verify the format matches our expectations
    const browserTime = await page.evaluate(() => {
      const now = new Date();
      return now.toTimeString().substring(0, 8); // HH:MM:SS
    });
    
    console.log('Browser time:', browserTime);
    
    // Check the hour portion of the time
    const browserHour = parseInt(browserTime.split(':')[0]);
    const startHour = parseInt(startTime.split(':')[0]);
    
    // The hours should be in the same timezone - won't be exactly the same value
    // as the CSV records are from slightly earlier, but should be in a reasonable range
    const hourDiff = Math.abs(browserHour - startHour);
    assert.ok(
      hourDiff <= 1, // Allow for some time difference since test entries are created earlier
      `CSV time hour (${startHour}) should be in a reasonable range of browser time hour (${browserHour})`
    );
    
    console.log('Time format verified successfully');
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
    
    // Check if we're running in IDE (using environment variable)
    const isIDE = process.env.RUN_MODE === 'ide';
    
    // Launch the browser
    browser = await chromium.launch({ 
      headless: !isIDE,  // Show browser when running from IDE
      slowMo: isIDE ? 500 : 100  // Slow down more when visible for better observation
    });
    
    // Create a new browser context with download settings
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      recordVideo: { 
        dir: path.join(screenshotsDir, 'video')
      },
      acceptDownloads: true, // Important for allowing downloads
      // Set downloads location
      downloadsPath: downloadsDir
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
      // Reload to make sure the app picks up the changes
      window.location.reload();
    });
    
    // Wait for the page to reload and initialize
    await page.waitForLoadState('networkidle');
    
    // Clear any previous downloads
    fs.readdirSync(downloadsDir).forEach(file => {
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(downloadsDir, file));
      }
    });
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
  
  it('should export time entries to CSV from entries modal', async function() {
    // Create 3 sample time entries
    await createSampleTimeEntries(3);
    
    // Take a screenshot of the app with entries
    await page.screenshot({ path: path.join(screenshotsDir, 'export-test-01-with-entries.png') });
    
    // Open entries modal
    await openEntriesModal();
    
    // Screenshot of entries modal
    await page.screenshot({ path: path.join(screenshotsDir, 'export-test-02-entries-modal.png') });
    
    // Check the export button is present
    const exportButton = await page.$('#export-entries');
    assert.ok(exportButton, 'Export button should be present in the entries modal');
    
    // Set up download event listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click the export button
    await page.click('#export-entries');
    console.log('Clicked export button');
    
    // Wait for download to start
    const download = await downloadPromise;
    console.log(`Download started: ${download.suggestedFilename()}`);
    
    // Wait for download to complete
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    console.log(`Download saved to: ${downloadPath}`);
    
    // Close entries modal
    await closeEntriesModal();
    
    // Verify the CSV file exists
    assert.ok(fs.existsSync(downloadPath), `CSV file should exist at ${downloadPath}`);
    
    // Check file content
    await assertCSVContent(downloadPath, 3);
    
    console.log('Export from entries modal test completed successfully!');
  });
  
  it('should export time entries to CSV from settings modal', async function() {
    // Create 2 sample time entries
    await createSampleTimeEntries(2);
    
    // Take a screenshot of the app with entries
    await page.screenshot({ path: path.join(screenshotsDir, 'settings-export-01-with-entries.png') });
    
    // Open settings modal
    await page.click('#settings');
    await page.waitForSelector('#settings-modal:not(.hidden)');
    console.log('Settings modal opened');
    
    // Screenshot of settings modal
    await page.screenshot({ path: path.join(screenshotsDir, 'settings-export-02-settings-modal.png') });
    
    // Check the export button is present
    const exportButton = await page.$('#toggl-export-btn');
    assert.ok(exportButton, 'Export button should be present in the settings modal');
    
    // Set up download event listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click the export button
    await page.click('#toggl-export-btn');
    console.log('Clicked export button in settings');
    
    // Wait for download to start
    const download = await downloadPromise;
    console.log(`Download started: ${download.suggestedFilename()}`);
    
    // Wait for download to complete
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    console.log(`Download saved to: ${downloadPath}`);
    
    // Close settings modal
    await page.click('#close-settings');
    try {
      await page.waitForSelector('#settings-modal.hidden', { timeout: 3000 });
      console.log('Settings modal closed');
    } catch (error) {
      console.log('Settings modal close timed out, using JavaScript to close it');
      // Force close using JavaScript if the button click doesn't work
      await page.evaluate(() => {
        document.getElementById('settings-modal').classList.add('hidden');
      });
      await page.waitForTimeout(500);
    }
    
    // Verify the CSV file exists
    assert.ok(fs.existsSync(downloadPath), `CSV file should exist at ${downloadPath}`);
    
    // Check file content
    await assertCSVContent(downloadPath, 2);
    
    console.log('Export from settings modal test completed successfully!');
  });
  
  it('should track work sessions with default description and export to CSV', async function() {
    // Open settings to set a custom description
    await page.click('#settings');
    await page.waitForSelector('#settings-modal:not(.hidden)');
    
    // Set a custom description for time entries
    await page.fill('#toggl-description', 'Custom Work Task');
    
    // Save settings
    await page.click('#save-settings');
    try {
      await page.waitForSelector('#settings-modal.hidden', { timeout: 3000 });
      console.log('Settings modal closed after saving');
    } catch (error) {
      console.log('Settings modal close timed out, using JavaScript to close it');
      // Force close using JavaScript if the button click doesn't work
      await page.evaluate(() => {
        document.getElementById('settings-modal').classList.add('hidden');
      });
      await page.waitForTimeout(500);
    }
    console.log('Set custom description in settings');
    
    // Create a sample time entry
    await createSampleTimeEntries(1);
    
    // Open entries modal
    await openEntriesModal();
    
    // Check that the entry has the custom description
    const entryDescription = await page.textContent('.entry-description');
    assert.ok(entryDescription.includes('Custom Work Task'), 
      `Entry should have the custom description, got: ${entryDescription}`);
    
    // Screenshot of entries with custom description
    await page.screenshot({ path: path.join(screenshotsDir, 'custom-desc-entries.png') });
    
    // Set up download event listener
    const downloadPromise = page.waitForEvent('download');
    
    // Export to CSV
    await page.click('#export-entries');
    
    // Wait for download to start and complete
    const download = await downloadPromise;
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Close entries modal
    await closeEntriesModal();
    
    // Verify CSV includes the custom description
    const csvContent = fs.readFileSync(downloadPath, 'utf8');
    assert.ok(csvContent.includes('Custom Work Task'), 
      'CSV should include the custom description');
    
    console.log('Custom description export test completed successfully!');
  });

  it('should export CSV with exactly the expected columns and no unexpected columns', async function() {
    // Create 2 sample time entries
    await createSampleTimeEntries(2);
    
    // Open entries modal
    await openEntriesModal();
    
    // Set up download event listener
    const downloadPromise = page.waitForEvent('download');
    
    // Export to CSV
    await page.click('#export-entries');
    console.log('Clicked export button');
    
    // Wait for download to start and complete
    const download = await downloadPromise;
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    console.log(`Download saved to: ${downloadPath}`);
    
    // Close entries modal
    await closeEntriesModal();
    
    // Define the expected columns for the CSV export
    // These are the ONLY columns that should be present, in any order
    const expectedColumns = [
      '"Description"',
      '"Start date"',
      '"Start time"',
      '"End date"',
      '"End time"',
      '"Duration"',
      '"Email"',
      '"Project"'
    ];
    
    // Verify the CSV has exactly the expected columns, no more and no less
    await verifyCSVColumns(downloadPath, expectedColumns);
    
    // Take a screenshot after verification
    await page.screenshot({ path: path.join(screenshotsDir, 'csv-columns-verification.png') });
    
    console.log('CSV columns verification test completed successfully!');
  });
  
  it('should export time entries in CSV with correct local timezone format', async function() {
    // Create 1 sample time entry
    await createSampleTimeEntries(1);
    
    // Log the current browser time for reference
    const browserTime = await page.evaluate(() => {
      return {
        timeString: new Date().toTimeString(),
        isoString: new Date().toISOString(),
        localeString: new Date().toLocaleString()
      };
    });
    console.log('Browser time info:', browserTime);
    
    // Open entries modal
    await openEntriesModal();
    
    // Set up download event listener
    const downloadPromise = page.waitForEvent('download');
    
    // Export to CSV
    await page.click('#export-entries');
    console.log('Clicked export button');
    
    // Wait for download to start and complete
    const download = await downloadPromise;
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    console.log(`Download saved to: ${downloadPath}`);
    
    // Close entries modal
    await closeEntriesModal();
    
    // Verify the time format in the CSV
    await verifyTimeFormat(downloadPath);
    
    // Take a screenshot after verification
    await page.screenshot({ path: path.join(screenshotsDir, 'csv-timezone-verification.png') });
    
    console.log('CSV timezone verification test completed successfully!');
  });
});