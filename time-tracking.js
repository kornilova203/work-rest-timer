// External Timer API integration with local storage queue
const ExternalTimerAPI = {
  currentTimeEntry: null,
  localEntries: [],
  
  // Initialize and load saved entries
  init: function() {
    // Load any saved entries from localStorage
    const savedEntries = localStorage.getItem('togglLocalEntries');
    if (savedEntries) {
      try {
        this.localEntries = JSON.parse(savedEntries);
      } catch (e) {
        console.error('Error loading saved Toggl entries:', e);
        this.localEntries = [];
      }
    }
    
    // Check if we have a running entry from a previous session
    const runningEntry = localStorage.getItem('togglRunningEntry');
    if (runningEntry) {
      try {
        this.currentTimeEntry = JSON.parse(runningEntry);
      } catch (e) {
        console.error('Error loading running Toggl entry:', e);
      }
    }
  },
  
  // Start a time entry locally
  startTimeEntry: function() {
    const workspaceId = localStorage.getItem('togglWorkspace');
    const projectId = localStorage.getItem('togglProject');
    const description = localStorage.getItem('togglDescription') || 'Work session';
    
    // Create a local time entry
    this.currentTimeEntry = {
      id: Date.now().toString(), // Use timestamp as ID
      description: description,
      workspace_id: workspaceId ? parseInt(workspaceId) : undefined,
      project_id: projectId ? parseInt(projectId) : undefined,
      start: new Date().toISOString(),
      duration: -1, // Running timer has negative duration
      synced: false
    };
    
    // Save the running entry to localStorage
    localStorage.setItem('togglRunningEntry', JSON.stringify(this.currentTimeEntry));
    
    console.log('Started local Toggl time entry:', this.currentTimeEntry);
    
    // Show notification to the user
    this._showNotification('Time tracking started');
  },
  
  // Stop the current time entry
  stopTimeEntry: function() {
    if (!this.currentTimeEntry) return;
    
    // Update the entry with stop time and duration
    this.currentTimeEntry.stop = new Date().toISOString();
    this.currentTimeEntry.duration = Math.floor(
      (new Date(this.currentTimeEntry.stop).getTime() - 
       new Date(this.currentTimeEntry.start).getTime()) / 1000
    );
    
    // Add to local entries queue
    this.localEntries.push(this.currentTimeEntry);
    
    // Save updates to localStorage
    localStorage.setItem('togglLocalEntries', JSON.stringify(this.localEntries));
    localStorage.removeItem('togglRunningEntry');
    
    console.log('Stopped local Toggl time entry:', this.currentTimeEntry);
    this._showNotification(`Time entry saved: ${this.currentTimeEntry.duration}s`);
    
    this.currentTimeEntry = null;
  },
  
  // Show a notification to the user
  _showNotification: function(message) {
    // Create a notification element
    const notification = document.createElement('div');
    notification.className = 'time-tracking-notification';
    notification.textContent = message;
    
    // Append to the body
    document.body.appendChild(notification);
    
    // Remove after a delay
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2500);
  },
  
  // Export entries as CSV for manual import to Toggl
  exportCSV: function() {
    if (this.localEntries.length === 0) {
      this._showNotification('No time entries to export');
      return null;
    }
    
    // Define CSV header
    const header = ['Description', 'Start date', 'Start time', 'End date', 'End time', 'Duration', 'Project', 'Workspace'];
    
    // Map entries to CSV rows
    const rows = this.localEntries.map(entry => {
      const start = new Date(entry.start);
      const stop = new Date(entry.stop);
      
      // Format dates and times
      const startDate = start.toISOString().split('T')[0];
      const startTime = start.toISOString().split('T')[1].substring(0, 8);
      const endDate = stop.toISOString().split('T')[0];
      const endTime = stop.toISOString().split('T')[1].substring(0, 8);
      
      // Format duration as HH:MM:SS
      const durationSec = entry.duration;
      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);
      const seconds = durationSec % 60;
      const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      return [
        entry.description,
        startDate,
        startTime,
        endDate,
        endTime,
        duration,
        entry.project_id || '',
        entry.workspace_id || ''
      ];
    });
    
    // Combine header and rows
    const csvContent = [header, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
      
    return csvContent;
  }
};

// Function to download CSV file
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