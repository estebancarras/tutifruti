/**
 * ReviewUI - Gestión de interfaz de usuario para la revisión social
 * Maneja renderizado, interacciones, animaciones y feedback visual
 */

import { socketManager } from './socket-manager.js';
import { uiManager } from './ui-manager.js';

export class ReviewUI {
  constructor(reviewState) {
    this.reviewState = reviewState;
    this.currentVote = null;
    this.animations = new Map();
    
    // Cache de elementos DOM
    this.elements = {};
    this.cacheElements();
    
    // Configurar listeners de estado
    this.setupStateListeners();
  }

  /**
   * Cachear elementos DOM para mejor performance
   */
  cacheElements() {
    this.elements = {
      // Header
      currentRound: document.getElementById('currentRound'),
      reviewLetter: document.getElementById('reviewLetter'),
      reviewProgress: document.getElementById('reviewProgress'),
      
      // Panel de jugador actual
      currentPlayerName: document.getElementById('currentPlayerName'),
      consensusIndicator: document.getElementById('consensusIndicator'),
      consensusProgress: document.getElementById('consensusProgress'),
      consensusText: document.getElementById('consensusText'),
      
      // Grid principal
      wordsGrid: document.getElementById('wordsGrid'),
      
      // Progreso y sidebar
      progressBars: document.getElementById('progressBars'),
      socialPressure: document.getElementById('socialPressure'),
      waitingForText: document.getElementById('waitingForText'),
      playersList: document.getElementById('playersList'),
      
      // Controles
      reviewControls: document.getElementById('reviewControls'),
      skipPlayerBtn: document.getElementById('skipPlayerBtn'),
      nextRoundBtn: document.getElementById('nextRoundBtn'),
      finishGameBtn: document.getElementById('finishGameBtn'),
      
      // Modal
      wordModalOverlay: document.getElementById('wordModalOverlay'),
      wordDetailModal: document.getElementById('wordDetailModal'),
      modalWordTitle: document.getElementById('modalWordTitle'),
      modalWordCategory: document.getElementById('modalWordCategory'),
      modalWordValue: document.getElementById('modalWordValue'),
      modalApproveBtn: document.getElementById('modalApproveBtn'),
      modalRejectBtn: document.getElementById('modalRejectBtn'),
      modalCloseBtn: document.getElementById('modalCloseBtn'),
      
      // Toast container
      toastContainer: document.getElementById('toastContainer')
    };
  }

  /**
   * Configurar listeners de eventos de UI
   */
  setupEventListeners() {
    // Clicks en palabras para votar
    this.elements.wordsGrid.addEventListener('click', (e) => {
      const wordCard = e.target.closest('.word-card');
      if (!wordCard) return;
      
      const wordId = wordCard.dataset.wordId;
      const action = e.target.closest('.vote-btn')?.dataset.action;
      
      if (action && ['approve', 'reject'].includes(action)) {
        this.handleVoteClick(wordId, action);
      } else {
        this.openWordDetailModal(wordId);
      }
    });

    // Modal events
    this.elements.modalCloseBtn?.addEventListener('click', () => {
      this.closeWordDetailModal();
    });
    
    this.elements.wordModalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.wordModalOverlay) {
        this.closeWordDetailModal();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Accessibility features
    this.setupAccessibilityFeatures();
  }

  /**
   * Renderizar interfaz completa de revisión
   */
  renderReviewInterface() {
    const state = this.reviewState.getState();
    
    // Actualizar header
    if (this.elements.currentRound) {
      this.elements.currentRound.textContent = state.round;
    }
    if (this.elements.reviewLetter) {
      this.elements.reviewLetter.textContent = state.letter;
    }

    // Renderizar jugadores en sidebar
    this.renderPlayersSidebar(state.players);
    
    // Cambiar a jugador actual
    const currentPlayer = this.reviewState.getCurrentPlayer();
    if (currentPlayer) {
      this.switchToPlayer(currentPlayer.name);
    }

    // Mostrar controles de host
    if (state.isHost) {
      this.showHostControls();
    }

    // Ocultar spinner inicial
    uiManager.hideSpinner();
  }
  
  /**
   * Inicializa la interfaz con datos básicos de revisión
   */
  initializeFromStartReview(data) {
    console.log('🔄 Inicializando desde startReview:', data);
    
    // Actualizar header básico
    if (this.elements.currentRound) {
      this.elements.currentRound.textContent = `Ronda ${data.round}`;
    }
    
    if (this.elements.reviewLetter) {
      this.elements.reviewLetter.textContent = data.letter;
    }
    
    // Mostrar mensaje de estado
    if (this.elements.waitingForText) {
      this.elements.waitingForText.textContent = 'Cargando datos de revisión...';
      this.elements.waitingForText.style.display = 'block';
    }
    
    // Ocultar spinner inicial
    uiManager.hideSpinner();
  }

  /**
   * Manejar click de voto
   */
  handleVoteClick(wordId, action) {
    const currentUsername = localStorage.getItem('username');
    
    if (!this.reviewState.canPlayerVote(currentUsername, wordId)) {
      uiManager.showNotification('Ya votaste por esta palabra', 'warning');
      return;
    }

    socketManager.castVote({ wordId, vote: action });
    this.showVoteFeedback(wordId, action);
  }

  /**
   * Mostrar feedback visual de voto
   */
  showVoteFeedback(wordId, action) {
    const wordCard = this.elements.wordsGrid.querySelector(`[data-word-id="${wordId}"]`);
    if (!wordCard) return;

    wordCard.classList.add(`voting-${action}`);
    const buttons = wordCard.querySelectorAll('.vote-btn');
    buttons.forEach(btn => btn.disabled = true);

    setTimeout(() => {
      wordCard.classList.remove(`voting-${action}`);
      wordCard.classList.add('voted');
    }, 600);
  }

  /**
   * Configurar listeners de cambios de estado
   */
  setupStateListeners() {
    this.reviewState.on('initialized', () => {
      this.renderReviewInterface();
    });

    this.reviewState.on('voteUpdated', (data) => {
      this.updateWordCard(data.wordId, data.votes);
    });

    this.reviewState.on('playerChanged', (data) => {
      this.switchToPlayer(data.currentPlayer);
    });
  }

  // Métodos adicionales se implementarán según necesidad
  switchToPlayer(playerName) {
    if (this.elements.currentPlayerName) {
      this.elements.currentPlayerName.textContent = playerName;
    }
    // Implementar resto de lógica
  }

  updateWordCard(wordId, votes) {
    // Implementar actualización de tarjeta
  }

  renderPlayersSidebar(players) {
    // Implementar sidebar
  }

  showHostControls() {
    if (this.elements.reviewControls) {
      this.elements.reviewControls.style.display = 'flex';
    }
  }

  openWordDetailModal(wordId) {
    // Implementar modal
  }

  closeWordDetailModal() {
    this.elements.wordModalOverlay.style.display = 'none';
  }

  handleKeydown(e) {
    if (e.key === 'Escape' && this.elements.wordModalOverlay.style.display === 'flex') {
      this.closeWordDetailModal();
    }
  }

  setupAccessibilityFeatures() {
    // Implementar accesibilidad básica
  }
  
  /**
   * Actualiza el panel de jugadores
   */
  updatePlayerPanel(players) {
    console.log('👥 Actualizando panel de jugadores:', players);
    
    if (this.elements.playersList) {
      this.elements.playersList.innerHTML = players.map(player => `
        <div class="player-item ${player.connected ? 'connected' : 'disconnected'}">
          <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
          <div class="player-name">${player.name}</div>
          ${player.isCreator ? '<div class="player-badge">Anfitrión</div>' : ''}
          <div class="player-status">${player.connected ? '🟢' : '🔴'}</div>
        </div>
      `).join('');
    }
    
    // Actualizar contador de jugadores
    if (this.elements.reviewProgress) {
      const connectedCount = players.filter(p => p.connected).length;
      this.elements.reviewProgress.textContent = `${connectedCount}/${players.length} jugadores`;
    }
  }
}