/**
 * Gestor del estado del juego
 */

import { GAME_CONFIG, SCORES } from '../../utils/constants.js';
import { validateWord, countSyllables } from '../../utils/helpers.js';

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.players = [];
    this.isHost = false;
    this.gameStarted = false;
    this.currentLetter = '';
    this.currentRound = 0;
    this.timeRemaining = GAME_CONFIG.TIME_LIMIT;
    this.timer = null; // Ya no se usa temporizador local; el servidor es la fuente de verdad
    this.roomId = '';
    this.username = '';
    this.submittedWords = {};
    this.playerScore = {
      repetidas: 0,
      unicas: 0,
      silabas: 0,
      total: 0
    };
  }

  /**
   * Actualiza la lista de jugadores
   * @param {Array} playersList - Lista de jugadores
   */
  updatePlayers(playersList) {
    if (!Array.isArray(playersList)) {
      console.error('Invalid players list:', playersList);
      return;
    }
    
    this.players = playersList;
    this.updateUI();
  }

  /**
   * Establece si el jugador actual es el host
   * @param {boolean} isHost - Es host
   */
  setHost(isHost) {
    this.isHost = isHost;
    this.updateHostControls();
  }

  /**
   * Inicia el juego
   */
  startGame() {
    this.gameStarted = true;
    this.currentRound = 1;
  }

  /**
   * Establece la letra actual
   * @param {string} letter - Letra seleccionada
   */
  setCurrentLetter(letter) {
    this.currentLetter = letter;
    console.log('[GameState] setCurrentLetter ->', letter);
    this.enableInputs();
  }

  /**
   * Valida las palabras ingresadas
   * @param {Object} words - Palabras por categoría
   * @returns {Object} Palabras validadas
   */
  validateWords(words) {
    const validatedWords = {};
    const validationResults = {};

    GAME_CONFIG.CATEGORIES.forEach(category => {
      const word = words[category]?.trim() || '';
      const isValid = word ? validateWord(word, this.currentLetter) : false;
      
      validatedWords[category] = word;
      validationResults[category] = {
        word,
        isValid,
        isEmpty: !word,
        syllables: word ? countSyllables(word) : 0
      };
    });

    return { validatedWords, validationResults };
  }

  /**
   * Actualiza las puntuaciones del jugador
   * @param {Object} scores - Puntuaciones recibidas del servidor
   */
  updatePlayerScore(scores) {
    if (scores[this.username]) {
      this.playerScore = { ...scores[this.username] };
      this.updateScoreDisplay();
    }
  }

  // El temporizador local ha sido eliminado. El cliente renderiza solo con TIMER_UPDATE del servidor.

  /**
   * Limpia el temporizador
   */
  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Maneja cuando se acaba el tiempo
   */
  handleTimeUp() {
    // Ya no auto-enviamos desde el cliente; el servidor cierra la ronda
  }

  /**
   * Actualiza la interfaz de usuario
   */
  updateUI() {
    this.updatePlayersCount();
    this.updateScoreDisplay();
    this.updateTimerDisplay();
  }

  /**
   * Actualiza el contador de jugadores
   */
  updatePlayersCount() {
    const playersCountElement = document.getElementById('playersCount');
    if (playersCountElement) {
      playersCountElement.textContent = `Jugadores: ${this.players.length}/${GAME_CONFIG.MAX_PLAYERS}`;
    }
  }

  /**
   * Actualiza la visualización de puntuaciones
   */
  updateScoreDisplay() {
    const elements = {
      repetidas: document.getElementById('score-repetidas'),
      unicas: document.getElementById('score-unicas'),
      silabas: document.getElementById('score-silabas'),
      total: document.getElementById('score-total')
    };

    if (elements.repetidas) elements.repetidas.textContent = this.playerScore.repetidas || 0;
    if (elements.unicas) elements.unicas.textContent = (this.playerScore.sinRepetir || 0) * SCORES.UNIQUE_WORD;
    if (elements.silabas) elements.silabas.textContent = (this.playerScore.masDeTresSilabas || 0) * SCORES.SYLLABLES_BONUS;
    if (elements.total) elements.total.textContent = this.playerScore.total || 0;
  }

  /**
   * Actualiza la visualización del temporizador
   */
  updateTimerDisplay() {
    const timerElement = document.getElementById('timerDisplay');
    if (timerElement) {
      timerElement.textContent = `Tiempo: ${this.timeRemaining}s`;
      
      // Añadir clase de advertencia si queda poco tiempo
      if (this.timeRemaining <= 10) {
        timerElement.classList.add('warning');
      } else {
        timerElement.classList.remove('warning');
      }
    }
  }

  /**
   * Actualiza los controles del host
   */
  updateHostControls() {
    const startButton = document.getElementById('startGameButton');
    const spinButton = document.getElementById('spinWheelButton');

    if (startButton) {
      startButton.style.display = this.isHost ? 'block' : 'none';
    }
    
    if (spinButton) {
      spinButton.style.display = this.isHost && this.gameStarted ? 'block' : 'none';
    }
  }

  /**
   * Habilita los campos de entrada
   */
  enableInputs() {
    const inputs = document.querySelectorAll('.word-input');
    let enabledCount = 0;
    inputs.forEach(input => {
      // Asegurar que se elimine el atributo disabled completamente
      input.disabled = false;
      input.removeAttribute('disabled');
      input.readOnly = false;

      const category = input.getAttribute('data-category');
      input.placeholder = `Palabra con "${this.currentLetter}"...`;
      if (!input.disabled) enabledCount++;
    });

    const submitButton = document.getElementById('submitWordButton');
    if (submitButton) {
      submitButton.disabled = false;
    }

    console.log('[GameState] enableInputs -> habilitados:', enabledCount);

    // Si no hay foco actual, enfocar el primer input disponible por accesibilidad
    const firstInput = document.querySelector('#input-NOMBRE');
    if (firstInput && !firstInput.disabled && document.activeElement?.tagName !== 'INPUT') {
      try { firstInput.focus(); } catch (_) {}
    }
  }

  /**
   * Deshabilita los campos de entrada
   */
  disableInputs() {
    const inputs = document.querySelectorAll('.word-input');
    inputs.forEach(input => {
      input.disabled = true;
      input.setAttribute('disabled', 'true');
      input.readOnly = true;
    });

    const submitButton = document.getElementById('submitWordButton');
    if (submitButton) {
      submitButton.disabled = true;
    }
  }
}

// Exportar instancia singleton
export const gameState = new GameState();
