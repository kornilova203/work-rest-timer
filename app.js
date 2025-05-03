// Player class to encapsulate individual player logic
class ChessPlayer {
  constructor(id, initialTimeInMs) {
    this.id = id;
    this.initialTime = initialTimeInMs; // Initial time in milliseconds
    this.timeRemaining = initialTimeInMs; // Current time in milliseconds
    this.element = document.getElementById(`player${id}`);
    this.timeElement = this.element.querySelector('.time');
    this.isActive = false;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Events will be handled by the timer
  }
  
  /**
   * Updates the player's remaining time based on elapsed milliseconds
   * @param {number} elapsedMs - Milliseconds elapsed since last update
   * @returns {number} Remaining time in milliseconds
   */
  updateTime(elapsedMs) {
    if (elapsedMs > 0 && this.timeRemaining > 0) {
      // Ensure we don't go below zero
      this.timeRemaining = Math.max(0, this.timeRemaining - elapsedMs);
      this.updateDisplay();
    }
    
    return this.timeRemaining;
  }
  
  /**
   * Get the remaining time in milliseconds
   * @returns {number} Time remaining in milliseconds
   */
  getTimeRemaining() {
    return this.timeRemaining;
  }
  
  reset() {
    this.timeRemaining = this.initialTime;
    this.setActive(false);
    this.updateDisplay();
  }
  
  setActive(isActive) {
    this.isActive = isActive;
    this.element.classList.remove('active', 'inactive');
    
    if (isActive) {
      this.element.classList.add('active');
    } else if (isActive === false) { // Could be null which means no active state
      this.element.classList.add('inactive');
    }
  }
  
  updateDisplay() {
    this.timeElement.textContent = this.formatTime(this.timeRemaining);
  }
  
  /**
   * Format milliseconds into time display format
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string in HH:MM:SS or MM:SS format
   */
  formatTime(ms) {
    // Convert to seconds and round down to ensure we don't display more time than available
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Only show hours if non-zero
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  
  // Called when this timer becomes active
  handleStart() {
    // Implemented by subclasses
  }
  
  // Called when this timer becomes inactive
  handleStop() {
    // Implemented by subclasses
  }
  
  // Called on timeout
  handleTimeout() {
    // Implemented by subclasses
  }
}

// Work timer that tracks time in Toggl
class Work extends ChessPlayer {
  constructor(id, initialTimeInMs) {
    super(id, initialTimeInMs);
  }
  
  handleStart() {
    // Start Toggl time entry when work timer becomes active
    TogglAPI.startTimeEntry();
  }
  
  handleStop() {
    // Stop Toggl time entry when work timer becomes inactive
    TogglAPI.stopTimeEntry();
  }
  
  handleTimeout() {
    // Stop Toggl time entry when work timer times out
    TogglAPI.stopTimeEntry();
  }
}

// Rest timer
class Rest extends ChessPlayer {
  constructor(id, initialTimeInMs) {
    super(id, initialTimeInMs);
  }
  
  // Rest timer doesn't need special handling for Toggl
}

// Chess timer functionality
class ChessTimer {
  constructor(player1Seconds, player2Seconds) {
    const player1TimeInMs = player1Seconds * 1000;
    const player2TimeInMs = player2Seconds * 1000;
    
    // Initialize players - now using specialized Work and Rest classes
    this.player1 = new Work(1, player1TimeInMs);
    this.player2 = new Rest(2, player2TimeInMs);
    this.players = [this.player1, this.player2];
    
    // Controls
    this.controlsElement = document.getElementById('controls');
    this.pauseButton = document.getElementById('pause');
    this.resetButton = document.getElementById('reset');
    
    // Timer state
    this.timer = null;
    this.timeoutId = null;
    
    this.init();
  }
  
  init() {
    // Initialize all players' displays with proper formatting
    this.players.forEach(player => {
      // Force an update of the time display with the correct format
      player.updateDisplay();
    });
    
    // Set up control buttons
    this.resetButton.addEventListener('click', () => this.reset());
    this.pauseButton.addEventListener('click', () => this.pause());
    
    // Setup player 1 click handler
    this.player1.element.addEventListener('click', () => {
      if (!this.isRunning() || this.player1.isActive) {
        this.start(this.player2); // Start/switch to player 2
      }
    });
    
    // Setup player 2 click handler
    this.player2.element.addEventListener('click', () => {
      if (!this.isRunning() || this.player2.isActive) {
        this.start(this.player1); // Start/switch to player 1
      }
    });
    
    // Add haptic feedback when timer is clicked
    const addVibration = (element) => {
      element.addEventListener('click', () => {
        if (this.isRunning()) {
          navigator.vibrate && navigator.vibrate(30);
        }
      });
    };
    
    this.players.forEach(player => addVibration(player.element));
    
    this.updateDisplay();
  }

  /**
   * @returns {ChessPlayer|null}
   */
  getActivePlayer() {
    return this.players.find(player => player.isActive) || null;
  }
  
  getOpponentPlayer(player) {
    return player === this.player1 ? this.player2 : this.player1;
  }
  
  hasActivePlayer() {
    return this.players.some(player => player.isActive);
  }
  
  isRunning() {
    return this.timer !== null;
  }
  
  setActivePlayer(player) {
    this.players.forEach(p => p.setActive(p === player));
  }
  
  updateDisplay() {
    // Show/hide pause and reset controls based on timer state
    if (this.isRunning() || this.hasActivePlayer()) {
      this.controlsElement.classList.remove('hidden');
    } else {
      this.controlsElement.classList.add('hidden');
    }
  }
  
  // Combined method that handles both starting the timer with a specific player
  // and switching players during gameplay
  start(player) {
    const prevActivePlayer = this.getActivePlayer();
    if (prevActivePlayer != null && prevActivePlayer !== player && this.isRunning()) {
      prevActivePlayer.handleStop()
    }
    this.setActivePlayer(player);
    if (!this.isRunning()) {
      this.startTimer();
      this.controlsElement.classList.remove('hidden');
      this.pauseButton.textContent = 'Pause';
    }
    if (prevActivePlayer !== player) {
      player.handleStart();
    }
    this.updateDisplay();
  }
  
  pause() {
    const activePlayer = this.getActivePlayer();
    if (this.isRunning()) {
      // Cancel animation frame and clear timeout
      cancelAnimationFrame(this.timer);
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.timer = null;
      this.pauseButton.textContent = 'Resume';
      
      // Notify the active player that it's being paused
      activePlayer.handleStop();
    } else if (activePlayer != null) {
      // Resume the timer
      this.startTimer();
      this.pauseButton.textContent = 'Pause';
      
      // Notify the active player that it's being resumed
      activePlayer.handleStart();
    }
  }
  
  reset() {
    // Notify the active player about the reset
    const activePlayer = this.getActivePlayer();
    if (activePlayer) {
      activePlayer.handleStop();
    }
    
    // Stop the timer directly instead of using pause()
    if (this.timer) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Reset button state
    this.pauseButton.textContent = 'Pause';
    
    // Reset players
    this.players.forEach(player => player.reset());
    this.controlsElement.classList.add('hidden');
    this.updateDisplay();
  }
  
  startTimer() {
    // Cancel any existing animation frame and clear timeout
    if (this.timer) {
      cancelAnimationFrame(this.timer);
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.updateDisplay();
    
    // Record the start time when we begin the timer
    let lastUpdateTime = Date.now();
    // Minimum delay between updates (in ms)
    const UPDATE_DELAY = 50; 
    
    // Use animation frame with throttling for efficient updates
    const updateTimer = () => {
      const now = Date.now();
      const elapsedMs = now - lastUpdateTime;
      
      // Only update if enough time has passed (at least 50ms)
      if (elapsedMs >= UPDATE_DELAY) {
        const activePlayer = this.getActivePlayer();
        if (activePlayer) {
          // Update based on actual elapsed time
          const remainingTimeMs = activePlayer.updateTime(elapsedMs);
          
          if (remainingTimeMs <= 0) {
            this.handleTimeout(activePlayer);
            return; // Stop the timer
          }
          
          // Update the last update time
          lastUpdateTime = now;
          
          // Update display after time change
          this.updateDisplay();
        }
      }
      
      // Schedule the next update using setTimeout + requestAnimationFrame
      // This creates a controlled frame rate without excessive updates
      this.timeoutId = setTimeout(() => {
        this.timer = requestAnimationFrame(updateTimer);
      }, Math.max(0, UPDATE_DELAY - elapsedMs));
    };
    
    // Start the timer loop
    this.timer = requestAnimationFrame(updateTimer);
  }
  
  handleTimeout(player) {
    // Stop the timer - cancel both animation frame and timeout
    if (this.timer) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Let the player handle its specific timeout behavior
    player.handleTimeout();
  }

  // Method to update player time (used by settings)
  updatePlayerTime(player, timeInSeconds) {
    const timeInMs = timeInSeconds * 1000;
    player.initialTime = timeInMs;
    player.timeRemaining = timeInMs;
    player.updateDisplay();
  }
}

// Initialize the timer when the DOM is fully loaded
// Toggl API integration with local storage queue
const TogglAPI = {
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
    notification.className = 'toggl-notification';
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

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Toggl API
  TogglAPI.init();
  
  const initialTimeInSeconds = 10 * 60; // 10 minutes in seconds
  
  // Load player-specific times in seconds if available, default to 10 minutes (600 seconds)
  const player1TimeSeconds = parseFloat(localStorage.getItem('player1Time')) || initialTimeInSeconds;
  const player2TimeSeconds = parseFloat(localStorage.getItem('player2Time')) || initialTimeInSeconds;
  
  // Initialize with saved or default times in seconds
  const timer = new ChessTimer(player1TimeSeconds, player2TimeSeconds);
  
  // Set up settings modal functionality
  const settingsButton = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsButton = document.getElementById('close-settings');
  const saveSettingsButton = document.getElementById('save-settings');
  const player1TimeInput = document.getElementById('player1-time');
  const player2TimeInput = document.getElementById('player2-time');
  
  // Toggl integration elements
  const togglWorkspaceInput = document.getElementById('toggl-workspace');
  const togglProjectInput = document.getElementById('toggl-project');
  const togglDescriptionInput = document.getElementById('toggl-description');
  const togglExportButton = document.getElementById('toggl-export-btn');
  
  // Set initial values from localStorage - convert seconds to HH:MM:SS format
  const setTimeInputValue = (input, seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    input.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  setTimeInputValue(player1TimeInput, player1TimeSeconds);
  setTimeInputValue(player2TimeInput, player2TimeSeconds);
  
  // Load Toggl settings from localStorage
  togglWorkspaceInput.value = localStorage.getItem('togglWorkspace') || '';
  togglProjectInput.value = localStorage.getItem('togglProject') || '';
  togglDescriptionInput.value = localStorage.getItem('togglDescription') || 'Work session';
  
  // Open settings modal
  settingsButton.addEventListener('click', () => {
    // Pause the timer if it's running
    if (timer.isRunning()) {
      timer.pause();
    }
    settingsModal.classList.remove('hidden');
  });
  
  // Close settings modal
  closeSettingsButton.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  
  // Handle export button click
  togglExportButton.addEventListener('click', () => {
    const csvContent = TogglAPI.exportCSV();
    if (csvContent) {
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `toggl-time-entries-${date}.csv`);
    }
  });
  
  // Save settings
  saveSettingsButton.addEventListener('click', () => {
    // Parse time values directly to seconds from HH:MM:SS format
    const parseTimeToSeconds = (timeString) => {
      let parts = timeString.split(':').map(val => parseInt(val) || 0);
      
      // Handle both HH:MM:SS and HH:MM formats
      if (parts.length === 2) {
        // Treat as HH:MM format
        const [hours, minutes] = parts;
        return (hours * 60 * 60) + (minutes * 60);
      } else {
        // HH:MM:SS format
        const [hours, minutes, seconds] = parts;
        return (hours * 60 * 60) + (minutes * 60) + seconds;
      }
    };
    
    // Get time in seconds directly
    const player1NewTimeSeconds = parseTimeToSeconds(player1TimeInput.value);
    const player2NewTimeSeconds = parseTimeToSeconds(player2TimeInput.value);
    
    // Save to localStorage in seconds
    localStorage.setItem('player1Time', player1NewTimeSeconds);
    localStorage.setItem('player2Time', player2NewTimeSeconds);
    
    // Save Toggl settings to localStorage
    localStorage.setItem('togglWorkspace', togglWorkspaceInput.value);
    localStorage.setItem('togglProject', togglProjectInput.value);
    localStorage.setItem('togglDescription', togglDescriptionInput.value);
    
    // Update timer with new values in seconds
    timer.updatePlayerTime(timer.players[0], player1NewTimeSeconds);
    timer.updatePlayerTime(timer.players[1], player2NewTimeSeconds);

    if (timer.isRunning()) {
      timer.reset();
    }
    
    // Close the modal
    settingsModal.classList.add('hidden');
  });
});