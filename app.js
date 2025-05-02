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
   * Format milliseconds into MM:SS display format
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(ms) {
    // Convert to seconds and round down to ensure we don't display more time than available
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Chess timer functionality
class ChessTimer {
  constructor(player1Minutes, player2Minutes) {
    const player1TimeInMs = player1Minutes * 60 * 1000;
    const player2TimeInMs = player2Minutes * 60 * 1000;
    
    // Initialize players
    this.player1 = new ChessPlayer(1, player1TimeInMs);
    this.player2 = new ChessPlayer(2, player2TimeInMs);
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
    // Initialize all players' displays
    this.players.forEach(player => player.updateDisplay());
    
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
    this.setActivePlayer(player);
    if (!this.isRunning()) {
      this.startTimer();
      this.controlsElement.classList.remove('hidden');
      this.pauseButton.textContent = 'Pause';
    }
    this.updateDisplay();
  }
  
  pause() {
    if (this.isRunning()) {
      // Cancel animation frame and clear timeout
      cancelAnimationFrame(this.timer);
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.timer = null;
      this.pauseButton.textContent = 'Resume';
    } else if (this.hasActivePlayer()) {
      // Resume the timer
      this.startTimer();
      this.pauseButton.textContent = 'Pause';
    }
  }
  
  reset() {
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
    
    setTimeout(() => {
      alert(`Player ${player.id} time is up!`);
    }, 100);
  }

  // Method to update player time (used by settings)
  updatePlayerTime(player, timeInMs) {
    player.initialTime = timeInMs;
    player.timeRemaining = timeInMs;
    player.updateDisplay();
  }
}

// Initialize the timer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings if they exist
  const player1Time = localStorage.getItem('player1Time') || 10;
  const player2Time = localStorage.getItem('player2Time') || 10;

  const initialTimeInMinutes = 10;
  // Load player-specific times if available
  const player1Minutes = localStorage.getItem('player1Time') || initialTimeInMinutes;
  const player2Minutes = localStorage.getItem('player2Time') || initialTimeInMinutes;
  // Initialize with saved or default times
  const timer = new ChessTimer(player1Minutes, player2Minutes);
  
  // Set up settings modal functionality
  const settingsButton = document.getElementById('settings');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsButton = document.getElementById('close-settings');
  const saveSettingsButton = document.getElementById('save-settings');
  const player1TimeInput = document.getElementById('player1-time');
  const player2TimeInput = document.getElementById('player2-time');
  
  // Set initial values from localStorage
  player1TimeInput.value = player1Time;
  player2TimeInput.value = player2Time;
  
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
  
  // Save settings
  saveSettingsButton.addEventListener('click', () => {
    const player1NewTime = parseInt(player1TimeInput.value) || 10;
    const player2NewTime = parseInt(player2TimeInput.value) || 10;
    
    // Save to localStorage
    localStorage.setItem('player1Time', player1NewTime);
    localStorage.setItem('player2Time', player2NewTime);
    
    // Update timer with new values
    timer.updatePlayerTime(timer.players[0], player1NewTime * 60 * 1000);
    timer.updatePlayerTime(timer.players[1], player2NewTime * 60 * 1000);

    if (timer.isRunning()) {
      timer.reset();
    }
    
    // Close the modal
    settingsModal.classList.add('hidden');
  });
});