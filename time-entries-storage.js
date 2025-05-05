/**
 * TimeEntriesStorage class handles storing and retrieving time entries from localStorage,
 * tracking the current time entry, and providing functionality to export entries to CSV format.
 */
class TimeEntriesStorage {
  constructor() {
    this.localEntries = [];
    this.currentTimeEntry = null;
    this.loadEntries();
    this.loadCurrentEntry();
  }
  
  /**
   * Load saved entries from localStorage
   */
  loadEntries() {
    const savedEntries = localStorage.getItem('timeEntries');
    if (savedEntries) {
      try {
        this.localEntries = JSON.parse(savedEntries);
      } catch (e) {
        console.error('Error loading saved time entries:', e);
        this.localEntries = [];
      }
    }
  }
  
  /**
   * Load current time entry from localStorage if one exists
   */
  loadCurrentEntry() {
    const runningEntry = localStorage.getItem('currentTimeEntry');
    if (runningEntry) {
      try {
        this.currentTimeEntry = JSON.parse(runningEntry);
      } catch (e) {
        console.error('Error loading running time entry:', e);
        this.currentTimeEntry = null;
      }
    }
  }
  
  /**
   * Save the current entries to localStorage
   */
  saveEntries() {
    localStorage.setItem('timeEntries', JSON.stringify(this.localEntries));
  }
  
  /**
   * Add a new completed time entry
   * @param {Object} entry - The time entry to add
   */
  addEntry(entry) {
    this.localEntries.push(entry);
    this.saveEntries();
  }
  
  /**
   * Clear all time entries
   */
  clearEntries() {
    this.localEntries = [];
    this.saveEntries();
  }
  
  /**
   * Get all stored time entries
   * @returns {Array} - Array of time entry objects
   */
  getEntries() {
    return this.localEntries;
  }
  
  /**
   * Start a new time entry
   * @param {string} description - Description for the time entry
   * @param {string|number} workspaceId - Optional workspace ID
   * @param {string|number} projectId - Optional project ID
   * @returns {Object} - The created time entry
   */
  startTimeEntry(description, workspaceId, projectId) {
    // Create a new time entry
    this.currentTimeEntry = {
      id: Date.now().toString(),
      description: description || 'Work session',
      workspace_id: workspaceId || undefined,
      project_id: projectId || undefined,
      start: new Date().toISOString(),
      duration: -1, // Running timer has negative duration
      synced: false
    };
    
    // Save to localStorage
    localStorage.setItem('currentTimeEntry', JSON.stringify(this.currentTimeEntry));
    
    return this.currentTimeEntry;
  }
  
  /**
   * Stop the current time entry
   * @returns {Object|null} - The completed time entry or null if no entry was running
   */
  stopTimeEntry() {
    if (!this.currentTimeEntry) return null;
    
    // Update with stop time and duration
    this.currentTimeEntry.stop = new Date().toISOString();
    this.currentTimeEntry.duration = Math.floor(
      (new Date(this.currentTimeEntry.stop).getTime() - 
       new Date(this.currentTimeEntry.start).getTime()) / 1000
    );
    
    // Add to storage
    this.addEntry(this.currentTimeEntry);
    
    // Clear from localStorage
    localStorage.removeItem('currentTimeEntry');
    
    const completedEntry = {...this.currentTimeEntry};
    
    // Reset current entry
    this.currentTimeEntry = null;
    
    return completedEntry;
  }
  
  /**
   * Check if there is a time entry currently running
   * @returns {boolean} - True if a time entry is running
   */
  hasRunningTimeEntry() {
    return this.currentTimeEntry !== null;
  }
  
  /**
   * Get the current running time entry
   * @returns {Object|null} - The current time entry or null if none is running
   */
  getCurrentTimeEntry() {
    return this.currentTimeEntry;
  }
  
  /**
   * Format a duration in seconds to a readable string
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (hours > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0 || hours > 0) {
      result += `${minutes}m `;
    }
    result += `${secs}s`;
    
    return result;
  }
  
  /**
   * Format a date string to a readable format
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  /**
   * Export entries as CSV for manual import to time tracking tools
   * @returns {string|null} - CSV content or null if no entries
   */
  exportCSV() {
    if (this.localEntries.length === 0) {
      return null;
    }
    
    // Define CSV header - including Email and Project columns for Toggl compatibility
    const header = ['Description', 'Start date', 'Start time', 'End date', 'End time', 'Duration', 'Email', 'Project'];
    
    // Map entries to CSV rows
    const rows = this.localEntries.map(entry => {
      const start = new Date(entry.start);
      const stop = new Date(entry.stop);
      
      // Format dates and times using toLocaleString with the local timezone
      // Get date in YYYY-MM-DD format
      const startDateLocal = start.toLocaleDateString('en-CA'); // en-CA uses YYYY-MM-DD format
      const endDateLocal = stop.toLocaleDateString('en-CA');
      
      // Get time in HH:MM:SS format
      const startTimeLocal = start.toLocaleTimeString('en-GB', { hour12: false }); // en-GB uses 24h format
      const endTimeLocal = stop.toLocaleTimeString('en-GB', { hour12: false });
      
      // Use local time values
      const startDate = startDateLocal;
      const startTime = startTimeLocal;
      const endDate = endDateLocal;
      const endTime = endTimeLocal;
      
      // Format duration as HH:MM:SS
      const durationSec = entry.duration;
      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);
      const seconds = durationSec % 60;
      const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Get email from localStorage or use empty string
      const email = localStorage.getItem('togglEmail') || '';
      
      // Get project name from localStorage or use empty string
      const projectName = localStorage.getItem('togglProjectName') || '';
      
      // Return row with Email and Project columns, but without Workspace column
      return [
        entry.description,
        startDate,
        startTime,
        endDate,
        endTime,
        duration,
        email,
        projectName
      ];
    });
    
    // Combine header and rows
    const csvContent = [header, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
      
    return csvContent;
  }
}

// Helper function to download CSV file
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Create download link
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to document, trigger download, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}