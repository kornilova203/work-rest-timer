// External Timer API integration with local storage
const ExternalTimerAPI = {
  currentTimeEntry: null,
  storage: null,
  
  // Initialize the API
  init: function() {
    // Initialize storage
    this.storage = new TimeEntriesStorage();
    
    // Check if we have a running entry from a previous session
    const runningEntry = localStorage.getItem('currentTimeEntry');
    if (runningEntry) {
      try {
        this.currentTimeEntry = JSON.parse(runningEntry);
      } catch (e) {
        console.error('Error loading running time entry:', e);
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
    localStorage.setItem('currentTimeEntry', JSON.stringify(this.currentTimeEntry));
    
    console.log('Started time entry:', this.currentTimeEntry);
    
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
    
    // Add to storage
    this.storage.addEntry(this.currentTimeEntry);
    
    // Remove the current entry
    localStorage.removeItem('currentTimeEntry');
    
    console.log('Stopped time entry:', this.currentTimeEntry);
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
  
  // Export entries as CSV for manual import to time tracking tools
  exportCSV: function() {
    const csv = this.storage.exportCSV();
    if (!csv) {
      this._showNotification('No time entries to export');
    }
    return csv;
  }
};

