// External Timer API integration with local storage
const ExternalTimerAPI = {
  storage: null,
  
  // Initialize the API
  init: function() {
    // Initialize storage
    this.storage = new TimeEntriesStorage();
    // Storage already loads currentTimeEntry in its constructor
  },
  
  // Start a time entry locally
  startTimeEntry: function() {
    const workspaceId = localStorage.getItem('togglWorkspace');
    const projectId = localStorage.getItem('togglProject');
    const description = localStorage.getItem('togglDescription') || 'Work session';
    
    // Use the storage to create and manage the time entry
    const entry = this.storage.startTimeEntry(
      description,
      workspaceId ? parseInt(workspaceId) : undefined,
      projectId ? parseInt(projectId) : undefined
    );
    
    console.log('Started time entry:', entry);
    
    // Show notification to the user
    this._showNotification('Time tracking started');
  },
  
  // Stop the current time entry
  stopTimeEntry: function() {
    // Use the storage to stop and save the current entry
    const completedEntry = this.storage.stopTimeEntry();
    
    if (completedEntry) {
      console.log('Stopped time entry:', completedEntry);
      this._showNotification(`Time entry saved: ${completedEntry.duration}s`);
    }
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

