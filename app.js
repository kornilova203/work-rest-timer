// Chess timer functionality
class ChessTimer {
  constructor(initialTimeInMinutes = 10) {
    this.initialTime = initialTimeInMinutes * 60; // Convert to seconds
    this.player1Time = this.initialTime;
    this.player2Time = this.initialTime;
    
    this.player1Element = document.getElementById('player1');
    this.player2Element = document.getElementById('player2');
    this.player1TimeElement = this.player1Element.querySelector('.time');
    this.player2TimeElement = this.player2Element.querySelector('.time');
    
    this.controlsElement = document.getElementById('controls');
    this.pauseButton = document.getElementById('pause');
    this.resetButton = document.getElementById('reset');
    
    this.activePlayer = null;
    this.timer = null;
    this.isRunning = false;
    
    this.init();
  }
  
  init() {
    this.updateDisplay();
    
    this.resetButton.addEventListener('click', () => this.reset());
    this.pauseButton.addEventListener('click', () => this.pause());
    
    // Clicking on player1's timer starts player2's timer
    this.player1Element.addEventListener('click', () => {
      if (!this.isRunning) {
        this.activePlayer = 2; // Set player 2 as active
        this.start();
      } else if (this.activePlayer === 1) {
        this.switchPlayer(); // Switch from player 1 to player 2
      }
    });
    
    // Clicking on player2's timer starts player1's timer
    this.player2Element.addEventListener('click', () => {
      if (!this.isRunning) {
        this.activePlayer = 1; // Set player 1 as active
        this.start();
      } else if (this.activePlayer === 2) {
        this.switchPlayer(); // Switch from player 2 to player 1
      }
    });
    
    // Add sound when timer is clicked (optional)
    const clickSound = () => {
      if (this.isRunning) {
        navigator.vibrate && navigator.vibrate(30);
      }
    };
    
    this.player1Element.addEventListener('click', clickSound);
    this.player2Element.addEventListener('click', clickSound);
    
    // Enable keyboard controls (space to pause/resume, 1 and 2 to activate player timer)
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        this.pause(); // The pause method now handles both pausing and resuming
        e.preventDefault();
      } else if (e.key === '1') {
        if (!this.isRunning) {
          this.activePlayer = 2; // Pressing 1 starts player 2's timer
          this.start();
        } else if (this.activePlayer === 1) {
          this.switchPlayer(); // Switch from player 1 to player 2
        }
      } else if (e.key === '2') {
        if (!this.isRunning) {
          this.activePlayer = 1; // Pressing 2 starts player 1's timer
          this.start();
        } else if (this.activePlayer === 2) {
          this.switchPlayer(); // Switch from player 2 to player 1
        }
      } else if (e.key === 'r' || e.key === 'R') {
        this.reset();
      }
    });
  }
  
  updateDisplay() {
    this.player1TimeElement.textContent = this.formatTime(this.player1Time);
    this.player2TimeElement.textContent = this.formatTime(this.player2Time);
    
    this.player1Element.classList.remove('active', 'inactive');
    this.player2Element.classList.remove('active', 'inactive');
    
    // Show/hide controls based on timer state
    if (this.isRunning) {
      this.controlsElement.classList.remove('hidden');
      
      if (this.activePlayer === 1) {
        this.player1Element.classList.add('active');
        this.player2Element.classList.add('inactive');
      } else if (this.activePlayer === 2) {
        this.player1Element.classList.add('inactive');
        this.player2Element.classList.add('active');
      }
    } else {
      if (this.activePlayer === null) {
        // Timer hasn't started yet or has been reset
        this.controlsElement.classList.add('hidden');
      }
    }
  }
  
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.activePlayer = this.activePlayer || 1; // Default to player 1 if not set
      this.startTimer();
      this.controlsElement.classList.remove('hidden');
      this.pauseButton.textContent = 'Pause';
    }
  }
  
  pause() {
    if (this.isRunning) {
      this.isRunning = false;
      clearInterval(this.timer);
      this.timer = null;
      this.pauseButton.textContent = 'Resume';
    } else if (this.activePlayer !== null) {
      // Resume the timer
      this.isRunning = true;
      this.startTimer();
      this.pauseButton.textContent = 'Pause';
    }
  }
  
  reset() {
    this.pause();
    this.player1Time = this.initialTime;
    this.player2Time = this.initialTime;
    this.activePlayer = null;
    this.controlsElement.classList.add('hidden');
    this.updateDisplay();
  }
  
  switchPlayer() {
    if (this.isRunning) {
      this.activePlayer = this.activePlayer === 1 ? 2 : 1;
      this.updateDisplay();
    }
  }
  
  startTimer() {
    clearInterval(this.timer);
    this.updateDisplay();
    
    this.timer = setInterval(() => {
      if (this.activePlayer === 1) {
        this.player1Time--;
        if (this.player1Time <= 0) {
          this.player1Time = 0;
          this.handleTimeout();
        }
      } else if (this.activePlayer === 2) {
        this.player2Time--;
        if (this.player2Time <= 0) {
          this.player2Time = 0;
          this.handleTimeout();
        }
      }
      
      this.updateDisplay();
    }, 1000);
  }
  
  handleTimeout() {
    // We need to manually set isRunning to false here to prevent the pause button from changing to "Resume"
    this.isRunning = false;
    clearInterval(this.timer);
    this.timer = null;
    
    setTimeout(() => {
      alert(`Player ${this.activePlayer} time is up!`);
    }, 100);
  }
}

// Initialize the timer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChessTimer(10); // Default 10 minutes per player
});