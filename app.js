// MVC Pattern Implementation

// Model - Holds the timer data and state
class TimerModel {
  constructor(id, initialTime) {
    this.id = id;
    this.initialTime = initialTime;
    this.remainingTime = initialTime;
    this.isCurrent = false;
  }
  
  updateTime(elapsedMs) {
    if (elapsedMs > 0 && this.remainingTime > 0) {
      // Ensure we don't go below zero
      this.remainingTime = Math.max(0, this.remainingTime - elapsedMs);
    }
    return this.remainingTime;
  }
  
  resetRemainingTime() {
    this.remainingTime = this.initialTime;
  }
  
  setCurrent(isCurrent) {
    this.isCurrent = isCurrent;
  }
  
  getRemainingTime() {
    return this.remainingTime;
  }
}

// View - Handles UI display
class TimerView {
  constructor(element) {
    this.element = element;
    this.timeElement = element.querySelector('.time');
  }
  
  updateDisplay(formattedTime) {
    this.timeElement.textContent = formattedTime;
  }
  
  setCurrentState(isCurrent) {
    if (isCurrent) {
      this.element.classList.add('current');
    } else {
      this.element.classList.remove('current');
    }
  }
  
  // Add click event handler
  onClick(callback) {
    this.element.addEventListener('click', callback);
  }
  
  // Add vibration feedback
  addVibration(isRunningCallback) {
    this.element.addEventListener('click', () => {
      if (isRunningCallback()) {
        navigator.vibrate && navigator.vibrate(30);
      }
    });
  }
}

// Controller - Coordinates model and view
class TimerController {
  /**
   * @param model {TimerModel}
   * @param view {TimerView}
   * @param startCallback
   * @param timeTrackingStrategy {TimeTrackingStrategy}
   */
  constructor(model, view, startCallback, timeTrackingStrategy = null) {
    this.model = model;
    this.view = view;
    this.timeTrackingStrategy = timeTrackingStrategy;

    // Add click handler
    this.view.onClick(() => startCallback(this));
    
    // Update the view to reflect initial model state
    this.updateView();
  }
  
  updateTime(elapsedMs) {
    const remainingTime = this.model.updateTime(elapsedMs);
    this.updateView();
    return remainingTime;
  }
  
  updateView() {
    this.view.updateDisplay(this.formatTime(this.model.getRemainingTime()));
    this.view.setCurrentState(this.model.isCurrent);
  }
  
  setCurrent(isCurrent, wasRunning, isRunning) {
    const wasCurrent = this.model.isCurrent;
    if (this.stoppedRunning(wasCurrent, isCurrent, wasRunning, isRunning)) {
      this.handleStop();
    }
    this.model.setCurrent(isCurrent);
    this.updateView();

    if (this.startedRunning(wasCurrent, isCurrent, wasRunning, isRunning)) {
      this.handleStart();
    }
  }

  /**
   * Determines if the timer has stopped running.
   * This occurs when:
   * 1. The timer was current and running, but is no longer current
   * 2. The timer remains current, but the overall timer has stopped running
   * 
   * @param {boolean} wasCurrent - Whether the timer was previously current
   * @param {boolean} isCurrent - Whether the timer is now current
   * @param {boolean} wasRunning - Whether the timer was previously running
   * @param {boolean} isRunning - Whether the timer is now running
   * @returns {boolean} - Whether the timer has stopped running
   */
  stoppedRunning(wasCurrent, isCurrent, wasRunning, isRunning) {
    // Case 1: Was current and running, now no longer current
    const stoppedBeingCurrent = wasCurrent && !isCurrent && wasRunning;
    
    // Case 2: Still current but timer has stopped
    const stoppedWhileCurrent = wasCurrent && isCurrent && wasRunning && !isRunning;
    
    return stoppedBeingCurrent || stoppedWhileCurrent;
  }

  /**
   * Determines if the timer has started running.
   * This occurs when:
   * 1. The timer wasn't current, but is now current and running
   * 2. The timer was already current but not running, and is now running
   * 
   * @param {boolean} wasCurrent - Whether the timer was previously current
   * @param {boolean} isCurrent - Whether the timer is now current
   * @param {boolean} wasRunning - Whether the timer was previously running
   * @param {boolean} isRunning - Whether the timer is now running
   * @returns {boolean} - Whether the timer has started running
   */
  startedRunning(wasCurrent, isCurrent, wasRunning, isRunning) {
    // Case 1: Wasn't current, now is current and running
    const startedBeingCurrent = !wasCurrent && isCurrent && isRunning;
    
    // Case 2: Was already current but not running, now is running
    const startedWhileCurrent = wasCurrent && isCurrent && !wasRunning && isRunning;
    
    return startedBeingCurrent || startedWhileCurrent;
  }

  reset(wasRunning) {
    this.model.resetRemainingTime();
    this.setCurrent(false, wasRunning, false)
  }

  resetRemainingTime() {
    this.model.resetRemainingTime()
  }
  
  isCurrent() {
    return this.model.isCurrent;
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
  
  // Hook methods for specialized behavior
  handleStart() {
    // Override in subclasses
  }
  
  handleStop() {
    // Override in subclasses
  }
  
  handleTimeout() {
    // Override in subclasses
  }
}

// Work timer controller with time tracking
class WorkTimerController extends TimerController {
  constructor(model, view, startCallback, timeTrackingStrategy) {
    super(model, view, startCallback, timeTrackingStrategy);
  }
  
  handleStart() {
    if (this.timeTrackingStrategy) {
      this.timeTrackingStrategy.startTimeEntry();
    }
  }
  
  handleStop() {
    if (this.timeTrackingStrategy) {
      this.timeTrackingStrategy.stopTimeEntry();
    }
  }
  
  handleTimeout() {
    if (this.timeTrackingStrategy) {
      this.timeTrackingStrategy.stopTimeEntry();
    }
  }
}

// Rest timer controller
class RestTimerController extends TimerController {
  constructor(model, view, startCallback) {
    super(model, view, startCallback);
  }
  
  // Rest timer doesn't need special handling for time tracking
}

// Strategy interface for time tracking
class TimeTrackingStrategy {
  startTimeEntry() {}
  stopTimeEntry() {}
  exportCSV() {}
}

// Concrete strategy implementation using ExternalTimerAPI
class ExternalApiTimeTracking extends TimeTrackingStrategy {
  constructor(api) {
    super();
    this.api = api;
  }
  
  startTimeEntry() {
    this.api.startTimeEntry();
  }
  
  stopTimeEntry() {
    this.api.stopTimeEntry();
  }
  
  exportCSV() {
    return this.api.exportCSV();
  }
}


// Work-Rest timer functionality - Using MVC pattern
class WorkRestTimer {
  constructor(player1Seconds, player2Seconds) {
    const player1TimeInMs = player1Seconds * 1000;
    const player2TimeInMs = player2Seconds * 1000;
    
    // Create time tracking strategy
    const timeTrackingStrategy = new ExternalApiTimeTracking(ExternalTimerAPI);
    
    // Create models, views, and controllers
    const workModel = new TimerModel(1, player1TimeInMs);
    const restModel = new TimerModel(2, player2TimeInMs);
    
    const workView = new TimerView(document.getElementById('player1'));
    const restView = new TimerView(document.getElementById('player2'));

    let startCallback = (controller) => this.start(controller);
    this.workController = new WorkTimerController(workModel, workView, startCallback, timeTrackingStrategy);
    this.restController = new RestTimerController(restModel, restView, startCallback);
    
    this.controllers = [this.workController, this.restController];
    
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
    // Set up control buttons
    this.resetButton.addEventListener('click', () => this.reset());
    this.pauseButton.addEventListener('click', () => this.pause());
    
    // Set up click handlers and vibration for controllers
    this.controllers.forEach(controller => {
      // Add haptic feedback
      controller.view.addVibration(() => this.isRunning());
    });
    
    this.updateButtonsVisibility();
  }

  /**
   * @returns {TimerController|null}
   */
  getCurrentController() {
    return this.controllers.find(controller => controller.isCurrent()) || null;
  }
  
  hasCurrentController() {
    return this.controllers.some(controller => controller.isCurrent());
  }
  
  isRunning() {
    return this.timer !== null;
  }
  
  setCurrentController(controller, wasRunning, isRunning) {
    this.controllers.forEach(c => c.setCurrent(c === controller, wasRunning, isRunning));
  }

  updateView() {
    this.workController.updateView();
    this.restController.updateView();
    this.updateButtonsVisibility();
  }
  
  updateButtonsVisibility() {
    // Show/hide pause and reset controls based on timer state
    if (this.isRunning() || this.hasCurrentController()) {
      this.controlsElement.classList.remove('hidden');
    } else {
      this.controlsElement.classList.add('hidden');
    }
  }
  
  // Activates the specified controller's timer
  // If another timer was current, it stops that timer first
  start(controller) {
    const wasRunning = this.isRunning();
    
    // Set the new controller as current
    this.setCurrentController(controller, wasRunning, true);
    
    // Start the timer if not already running
    if (!wasRunning) {
      this.startTimer();
      this.controlsElement.classList.remove('hidden');
      this.pauseButton.textContent = 'Pause';
    }
    
    this.updateButtonsVisibility();
  }
  
  pause() {
    const currentController = this.getCurrentController();
    if (this.isRunning()) {
      // Cancel animation frame and clear timeout
      cancelAnimationFrame(this.timer);
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.timer = null;
      this.pauseButton.textContent = 'Resume';
      
      // Handle stop event for current controller
      if (currentController) {
        currentController.handleStop();
      }
    } else if (currentController) {
      // Resume the timer
      this.startTimer();
      this.pauseButton.textContent = 'Pause';
      
      // Handle start event for current controller
      currentController.handleStart();
    }
  }
  
  reset() {
    let wasRunning = this.isRunning();
    // Stop the timer directly
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
    
    // Reset all controllers
    this.controllers.forEach(controller => controller.reset(wasRunning));
    
    this.controlsElement.classList.add('hidden');
    this.updateButtonsVisibility();
  }
  
  startTimer() {
    // Cancel any existing animation frame and clear timeout
    if (this.timer) {
      cancelAnimationFrame(this.timer);
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.updateButtonsVisibility();
    
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
        const currentController = this.getCurrentController();
        if (currentController) {
          // Update based on actual elapsed time
          const remainingTimeMs = currentController.updateTime(elapsedMs);
          
          if (remainingTimeMs <= 0) {
            this.handleTimeout(currentController);
            return; // Stop the timer
          }
          
          // Update the last update time
          lastUpdateTime = now;
          
          // Update display
          this.updateButtonsVisibility();
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
  
  handleTimeout(controller) {
    // Stop the timer - cancel both animation frame and timeout
    if (this.timer) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Let the controller handle its specific timeout behavior
    controller.handleTimeout();
  }
}

// Initialize the timer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize External Timer API
  ExternalTimerAPI.init();
  
  const initialTimeInSeconds = 10 * 60; // 10 minutes in seconds
  
  // Load player-specific times in seconds if available, default to 10 minutes (600 seconds)
  const player1TimeSeconds = parseFloat(localStorage.getItem('player1Time')) || initialTimeInSeconds;
  const player2TimeSeconds = parseFloat(localStorage.getItem('player2Time')) || initialTimeInSeconds;
  
  // Initialize with saved or default times in seconds
  const workRestTimer = new WorkRestTimer(player1TimeSeconds, player2TimeSeconds);
  
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
  const togglProjectNameInput = document.getElementById('toggl-project-name');
  const togglDescriptionInput = document.getElementById('toggl-description');
  const togglExportButton = document.getElementById('toggl-export-btn');
  
  // Entries modal elements
  const entriesButton = document.getElementById('entries');
  const entriesModal = document.getElementById('entries-modal');
  const closeEntriesButton = document.getElementById('close-entries');
  const entriesList = document.getElementById('entries-list');
  const exportEntriesButton = document.getElementById('export-entries');
  const clearEntriesButton = document.getElementById('clear-entries');
  
  // Set initial values from localStorage - convert seconds to HH:MM:SS format
  const setTimeInputValue = (input, seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    input.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  setTimeInputValue(player1TimeInput, player1TimeSeconds);
  setTimeInputValue(player2TimeInput, player2TimeSeconds);
  
  // Toggl email input element
  const togglEmailInput = document.getElementById('toggl-email');

  // Load Toggl settings from localStorage
  togglWorkspaceInput.value = localStorage.getItem('togglWorkspace') || '';
  togglProjectInput.value = localStorage.getItem('togglProject') || '';
  togglProjectNameInput.value = localStorage.getItem('togglProjectName') || '';
  togglEmailInput.value = localStorage.getItem('togglEmail') || '';
  togglDescriptionInput.value = localStorage.getItem('togglDescription') || 'Work session';
  
  // Open settings modal
  settingsButton.addEventListener('click', () => {
    // Open settings without stopping the timer
    settingsModal.classList.remove('hidden');
  });
  
  // Close settings modal
  closeSettingsButton.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });
  
  // Handle export button click
  togglExportButton.addEventListener('click', () => {
    const timeTrackingStrategy = workRestTimer.workController.timeTrackingStrategy;
    const csvContent = timeTrackingStrategy.exportCSV();
    if (csvContent) {
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `time-entries-${date}.csv`);
    }
  });
  
  // Save settings
  saveSettingsButton.addEventListener('click', () => {
    // Parse time values directly to seconds from HH:MM:SS format
    const parseTimeToSeconds = (timeString) => {
      let parts = timeString.split(':').map(v => parseInt(v) || 0);
      
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
    localStorage.setItem('togglProjectName', togglProjectNameInput.value);
    localStorage.setItem('togglEmail', togglEmailInput.value);
    localStorage.setItem('togglDescription', togglDescriptionInput.value);
    
    // Update the initial times for the timer models without resetting current timers
    workRestTimer.workController.model.initialTime = player1NewTimeSeconds * 1000;
    workRestTimer.restController.model.initialTime = player2NewTimeSeconds * 1000;

    if (!workRestTimer.isRunning()) {
      // Reset both timers to their initial values when paused
      workRestTimer.workController.resetRemainingTime();
      workRestTimer.restController.resetRemainingTime();
    }
    
    // Close the modal
    settingsModal.classList.add('hidden');

    workRestTimer.workController.updateView();
    workRestTimer.restController.updateView();
    workRestTimer.updateButtonsVisibility();
  });
  
  // Function to render time entries list with running entry support
  function renderTimeEntries() {
    // We still need to use ExternalTimerAPI.storage directly here since 
    // we didn't fully implement the strategy pattern for all operations
    const entries = ExternalTimerAPI.storage.getEntries();
    const currentEntry = ExternalTimerAPI.storage.getCurrentTimeEntry();
    
    entriesList.innerHTML = '';
    
    if (entries.length === 0 && !currentEntry) {
      entriesList.innerHTML = '<div class="no-entries">No time entries yet</div>';
      return;
    }
    
    // Check if there's a running time entry and add it at the top with the rest of entries
    if (currentEntry) {
      const runningEntryItem = document.createElement('div');
      runningEntryItem.className = 'entry-item running-entry';
      runningEntryItem.id = 'running-entry';
      
      const runningBadge = document.createElement('div');
      runningBadge.className = 'running-badge';
      runningBadge.textContent = 'Recording';
      
      const description = document.createElement('div');
      description.className = 'entry-description';
      description.textContent = currentEntry.description || 'Work session';
      
      const timeRange = document.createElement('div');
      timeRange.className = 'entry-time';
      timeRange.textContent = `${ExternalTimerAPI.storage.formatDate(currentEntry.start)} - now`;
      
      const duration = document.createElement('div');
      duration.className = 'entry-duration';
      duration.id = 'running-duration';
      // Initial duration calculation
      const elapsedSeconds = Math.floor((Date.now() - new Date(currentEntry.start).getTime()) / 1000);
      duration.textContent = `Duration: ${ExternalTimerAPI.storage.formatDuration(elapsedSeconds)}`;
      
      runningEntryItem.appendChild(runningBadge);
      runningEntryItem.appendChild(description);
      runningEntryItem.appendChild(timeRange);
      runningEntryItem.appendChild(duration);
      
      entriesList.appendChild(runningEntryItem);
      
      // Set up timer to update the duration
      setupRunningEntryTimer();
    }
    
    // If there are no completed entries, but there is a running entry, we've already shown it
    if (entries.length === 0) {
      return;
    }
    
    // Sort entries by start time, newest first
    entries.sort((a, b) => new Date(b.start) - new Date(a.start));
    
    // Add the completed entries
    entries.forEach(entry => {
      const entryItem = document.createElement('div');
      entryItem.className = 'entry-item';
      
      const description = document.createElement('div');
      description.className = 'entry-description';
      description.textContent = entry.description || 'Work session';
      
      const timeRange = document.createElement('div');
      timeRange.className = 'entry-time';
      timeRange.textContent = `${ExternalTimerAPI.storage.formatDate(entry.start)} - ${ExternalTimerAPI.storage.formatDate(entry.stop)}`;
      
      const duration = document.createElement('div');
      duration.className = 'entry-duration';
      duration.textContent = `Duration: ${ExternalTimerAPI.storage.formatDuration(entry.duration)}`;
      
      entryItem.appendChild(description);
      entryItem.appendChild(timeRange);
      entryItem.appendChild(duration);
      
      entriesList.appendChild(entryItem);
    });
  }
  
  // Timer variable to update running entry duration
  let runningEntryTimer = null;
  
  // Set up timer to update running entry duration
  function setupRunningEntryTimer() {
    // Clear any existing timer
    if (runningEntryTimer) {
      clearInterval(runningEntryTimer);
    }
    
    // Set up a new timer that updates every second
    runningEntryTimer = setInterval(() => {
      const currentEntry = ExternalTimerAPI.storage.getCurrentTimeEntry();
      if (!currentEntry) {
        // Stop the timer if no entry is running
        clearInterval(runningEntryTimer);
        runningEntryTimer = null;
        return;
      }
      
      // Update the duration display
      const durationElement = document.getElementById('running-duration');
      if (durationElement) {
        const elapsedSeconds = Math.floor((Date.now() - new Date(currentEntry.start).getTime()) / 1000);
        durationElement.textContent = `Duration: ${ExternalTimerAPI.storage.formatDuration(elapsedSeconds)}`;
      } else {
        // If the element doesn't exist, stop the timer
        clearInterval(runningEntryTimer);
        runningEntryTimer = null;
      }
    }, 1000); // Update every second
  }
  
  // Open entries modal
  entriesButton.addEventListener('click', () => {
    // Open entries without stopping the timer
    renderTimeEntries();
    entriesModal.classList.remove('hidden');
  });
  
  // Close entries modal
  closeEntriesButton.addEventListener('click', () => {
    // Clear the timer when closing the modal
    if (runningEntryTimer) {
      clearInterval(runningEntryTimer);
      runningEntryTimer = null;
    }
    entriesModal.classList.add('hidden');
  });
  
  // Export entries as CSV
  exportEntriesButton.addEventListener('click', () => {
    const timeTrackingStrategy = workRestTimer.workController.timeTrackingStrategy;
    const csvContent = timeTrackingStrategy.exportCSV();
    if (csvContent) {
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `time-entries-${date}.csv`);
    }
  });
  
  // Clear all entries
  clearEntriesButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all time entries? This cannot be undone.')) {
      // Note: This operation isn't part of our strategy pattern yet
      ExternalTimerAPI.storage.clearEntries();
      renderTimeEntries();
    }
  });
});