// Player class to encapsulate individual player logic
class ChessPlayer {
  constructor(id, initialTimeInSeconds) {
    this.id = id;
    this.initialTime = initialTimeInSeconds;
    this.timeRemaining = initialTimeInSeconds;
    this.element = document.getElementById(`player${id}`);
    this.timeElement = this.element.querySelector('.time');
    this.isActive = false;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Events will be handled by the timer
  }
  
  decrementTime() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
    }
    this.updateDisplay();
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
  
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Chess timer functionality
class ChessTimer {
  constructor(initialTimeInMinutes = 10) {
    const initialTimeInSeconds = initialTimeInMinutes * 60;
    
    // Initialize players
    this.player1 = new ChessPlayer(1, initialTimeInSeconds);
    this.player2 = new ChessPlayer(2, initialTimeInSeconds);
    this.players = [this.player1, this.player2];
    
    // Controls
    this.controlsElement = document.getElementById('controls');
    this.pauseButton = document.getElementById('pause');
    this.resetButton = document.getElementById('reset');
    
    // Timer state
    this.timer = null;
    
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
    // Show/hide controls based on timer state
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
      clearInterval(this.timer);
      this.timer = null;
      this.pauseButton.textContent = 'Resume';
    } else if (this.hasActivePlayer()) {
      // Resume the timer
      this.startTimer();
      this.pauseButton.textContent = 'Pause';
    }
  }
  
  reset() {
    this.pause();
    this.players.forEach(player => player.reset());
    this.controlsElement.classList.add('hidden');
    this.updateDisplay();
  }
  
  startTimer() {
    clearInterval(this.timer);
    this.updateDisplay();
    
    this.timer = setInterval(() => {
      const activePlayer = this.getActivePlayer();
      if (activePlayer) {
        const remainingTime = activePlayer.decrementTime();
        if (remainingTime <= 0) {
          this.handleTimeout(activePlayer);
        }
      }
    }, 1000);
  }
  
  handleTimeout(player) {
    // Stop the timer
    clearInterval(this.timer);
    this.timer = null;
    
    setTimeout(() => {
      alert(`Player ${player.id} time is up!`);
    }, 100);
  }
}

// Initialize the timer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChessTimer(10); // Default 10 minutes per player
});