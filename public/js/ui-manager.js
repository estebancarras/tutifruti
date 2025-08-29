/**
 * Gestor de la interfaz de usuario
 */

import { GAME_CONFIG } from '../../utils/constants.js';
import { formatTime, showNotification } from '../../utils/helpers.js';

class UIManager {
  constructor() {
    this.modals = new Map();
  }

  /**
   * Inicializa los elementos de la UI
   */
  init() {
    this.setupAccessibilityFeatures();
    this.setupKeyboardNavigation();
  }

  /**
   * Configura características de accesibilidad
   */
  setupAccessibilityFeatures() {
    // Añadir skip link
    this.addSkipLink();
    
    // Configurar focus management
    this.setupFocusManagement();
    
    // Añadir live regions para anuncios dinámicos
    this.addLiveRegions();
  }

  /**
   * Añade skip link para navegación por teclado
   */
  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Saltar al contenido principal';
    skipLink.setAttribute('aria-label', 'Saltar navegación');
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Configura la gestión del foco
   */
  setupFocusManagement() {
    // Foco visible para navegación por teclado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  /**
   * Añade regiones live para anuncios dinámicos
   */
  addLiveRegions() {
    const announcer = document.createElement('div');
    announcer.id = 'announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    
    document.body.appendChild(announcer);
  }

  /**
   * Anuncia un mensaje para lectores de pantalla
   * @param {string} message - Mensaje a anunciar
   */
  announce(message) {
    const announcer = document.getElementById('announcer');
    if (announcer) {
      announcer.textContent = message;
      
      // Limpiar después de un tiempo
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }

  /**
   * Configura navegación por teclado
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // ESC para cerrar modales
      if (e.key === 'Escape') {
        this.closeTopModal();
      }
      
      // Enter en botones
      if (e.key === 'Enter' && e.target.tagName === 'BUTTON') {
        e.target.click();
      }
    });
  }

  /**
   * Actualiza la visualización de la letra seleccionada
   * @param {string} letter - Letra seleccionada
   */
  displaySelectedLetter(letter) {
    const letterDisplay = document.getElementById('currentLetterDisplay');
    const statusMessage = document.getElementById('selectedLetter');
    
    if (letterDisplay) {
      letterDisplay.textContent = letter;
      letterDisplay.setAttribute('aria-label', `Letra seleccionada: ${letter}`);
    }
    
    if (statusMessage) {
      statusMessage.textContent = `¡Letra seleccionada: ${letter}! Completa las categorías.`;
    }

    this.announce(`Letra seleccionada: ${letter}. Tiempo para completar las categorías.`);
  }

  /**
   * Muestra la ruleta
   */
  showRoulette() {
    const roulette = document.getElementById('roulette');
    if (roulette) {
      roulette.style.display = 'block';
      roulette.innerHTML = this.generateRouletteHTML();
      roulette.setAttribute('aria-label', 'Ruleta de letras');
    }
  }

  /**
   * Genera el HTML de la ruleta
   * @returns {string} HTML de la ruleta
   */
  generateRouletteHTML() {
    return `
      <div class="roulette-container" role="img" aria-label="Ruleta girando">
        <div class="roulette-wheel" id="rouletteWheel">
          <div class="roulette-letters">
            ${this.generateRouletteLetters()}
          </div>
        </div>
        <div class="roulette-pointer" aria-hidden="true">▼</div>
      </div>
    `;
  }

  /**
   * Genera las letras de la ruleta
   * @returns {string} HTML de las letras
   */
  generateRouletteLetters() {
    let lettersHTML = '';
    
    for (let i = 0; i < GAME_CONFIG.ALPHABET.length; i++) {
      const angle = (360 / GAME_CONFIG.ALPHABET.length) * i;
      lettersHTML += `
        <div class="roulette-letter" 
             style="transform: rotate(${angle}deg) translateY(-80px) rotate(-${angle}deg);"
             aria-hidden="true">
          ${GAME_CONFIG.ALPHABET[i]}
        </div>
      `;
    }
    
    return lettersHTML;
  }

  /**
   * Anima el giro de la ruleta (giro preliminar al azar)
   * Mantiene el ángulo acumulado en data-rotation para poder alinear luego con una letra concreta.
   */
  animateRouletteSpinning() {
    const wheel = document.getElementById('rouletteWheel');
    if (wheel) {
      const current = Number(wheel.dataset.rotation || 0);
      const spin = 360 * 3 + Math.floor(Math.random() * 360);
      const target = current + spin;
      wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      wheel.style.transform = `rotate(${target}deg)`;
      wheel.dataset.rotation = String(target);
      this.announce('La ruleta está girando');
    }
  }

  /**
   * Gira la ruleta hasta una letra concreta enviada por el servidor
   * para que el puntero apunte exactamente a esa letra.
   * @param {string} letter - Letra objetivo (A-Z)
   */
  spinToLetter(letter) {
    const wheel = document.getElementById('rouletteWheel');
    if (!wheel || !letter) return;

    const alphabet = GAME_CONFIG.ALPHABET || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = alphabet.indexOf(letter.toUpperCase());
    if (idx < 0) return;

    const step = 360 / alphabet.length;
    const letterAngle = idx * step;

    // Ángulo actual normalizado [0,360)
    const current = Number(wheel.dataset.rotation || 0);
    const currentMod = ((current % 360) + 360) % 360;

    // Queremos que la letra en letterAngle quede bajo el puntero superior (0deg).
    // Para ello, rotamos hacia adelante (dos vueltas completas para efecto visual) hasta alinear:
    const forwardTurns = 2 * 360;
    const needed = (360 - letterAngle - currentMod + 360) % 360;
    const target = current + forwardTurns + needed;

    wheel.style.transition = 'transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
    wheel.style.transform = `rotate(${target}deg)`;
    wheel.dataset.rotation = String(target);
  }

  /**
   * Oculta la ruleta
   */
  hideRoulette() {
    const roulette = document.getElementById('roulette');
    if (roulette) {
      roulette.style.display = 'none';
    }
  }

  /**
   * Muestra los resultados de la ronda
   * @param {Object} data - Datos de la ronda
   */
  showRoundResults(data) {
    const modal = this.createModal('roundResults', 'Resultados de la Ronda');
    const content = this.generateResultsHTML(data);
    
    modal.querySelector('.modal__body').innerHTML = content;
    this.openModal('roundResults');
    
    this.announce(`Resultados de la ronda para la letra ${data.letter}`);
  }

  /**
   * Genera HTML de los resultados
   * @param {Object} data - Datos de la ronda
   * @returns {string} HTML de los resultados
   */
  generateResultsHTML(data) {
    let html = `<h3>Letra: ${data.letter}</h3>`;
    
    // Puntuaciones de todos los jugadores
    if (data.playerScores) {
      html += '<div class="results-section"><h4>Puntuaciones:</h4><ul class="scores-list">';
      data.playerScores.forEach(player => {
        html += `<li><strong>${player.name}:</strong> ${player.score} puntos</li>`;
      });
      html += '</ul></div>';
    }
    
    // Palabras del jugador actual
    if (data.validWords && data.words) {
      html += this.generatePlayerWordsHTML(data);
    }
    
    return html;
  }

  /**
   * Genera HTML de las palabras del jugador
   * @param {Object} data - Datos de la ronda
   * @returns {string} HTML de las palabras
   */
  generatePlayerWordsHTML(data) {
    const username = localStorage.getItem('username');
    const userWords = data.words[username];
    const userValidWords = data.validWords[username];
    
    if (!userWords || !userValidWords) return '';
    
    let html = '<div class="results-section"><h4>Tus palabras:</h4>';
    html += '<table class="results-table"><thead><tr><th>Categoría</th><th>Palabra</th><th>Estado</th></tr></thead><tbody>';
    
    GAME_CONFIG.CATEGORIES.forEach(category => {
      const word = userWords[category] || '';
      const isValid = userValidWords[category] || false;
      const status = word ? (isValid ? '✅ Válida' : '❌ Inválida') : '⚪ Vacía';
      const cssClass = isValid ? 'valid' : (word ? 'invalid' : 'empty');
      
      html += `
        <tr class="word-result word-result--${cssClass}">
          <td><strong>${category}</strong></td>
          <td>${word || '-'}</td>
          <td>${status}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Crea un modal
   * @param {string} id - ID del modal
   * @param {string} title - Título del modal
   * @returns {HTMLElement} Elemento del modal
   */
  createModal(id, title) {
    if (this.modals.has(id)) {
      return this.modals.get(id);
    }

    const modal = document.createElement('div');
    modal.id = `modal-${id}`;
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', `modal-${id}-title`);
    modal.setAttribute('aria-modal', 'true');
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="modal__overlay" tabindex="-1">
        <div class="modal__container" role="document">
          <header class="modal__header">
            <h2 id="modal-${id}-title" class="modal__title">${title}</h2>
            <button class="modal__close" aria-label="Cerrar modal" data-modal-close>
              <span aria-hidden="true">&times;</span>
            </button>
          </header>
          <div class="modal__body"></div>
          <footer class="modal__footer">
            <button class="btn btn--secondary" data-modal-close>Cerrar</button>
          </footer>
        </div>
      </div>
    `;

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-modal-close') || e.target.classList.contains('modal__overlay')) {
        this.closeModal(id);
      }
    });

    document.body.appendChild(modal);
    this.modals.set(id, modal);
    
    return modal;
  }

  /**
   * Abre un modal
   * @param {string} id - ID del modal
   */
  openModal(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    modal.style.display = 'flex';
    
    // Focus management
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  /**
   * Cierra un modal
   * @param {string} id - ID del modal
   */
  closeModal(id) {
    const modal = this.modals.get(id);
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
   * Cierra el modal superior
   */
  closeTopModal() {
    const openModals = Array.from(this.modals.values()).filter(modal => 
      modal.style.display !== 'none'
    );
    
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      const modalId = topModal.id.replace('modal-', '');
      this.closeModal(modalId);
    }
  }

  /**
   * Actualiza el estado visual de las palabras
   * @param {string} category - Categoría
   * @param {string} word - Palabra
   * @param {boolean} isValid - Es válida
   */
  updateWordDisplay(category, word, isValid) {
    const submittedSpan = document.getElementById(`submitted-${category}`);
    const displayDiv = document.getElementById(`display-${category}`);
    
    if (submittedSpan) {
      submittedSpan.textContent = word;
    }
    
    if (displayDiv) {
      displayDiv.classList.remove('valid', 'invalid', 'empty');
      
      if (word.trim()) {
        displayDiv.classList.add(isValid ? 'valid' : 'invalid');
      } else {
        displayDiv.classList.add('empty');
      }
    }
  }

  /**
   * Marca una celda como activa
   * @param {HTMLElement} input - Input activo
   */
  setActiveInput(input) {
    // Remover clase activa de todas las celdas
    document.querySelectorAll('.input-cell').forEach(cell => {
      cell.classList.remove('active');
    });
    
    // Agregar clase activa a la celda actual
    const inputCell = input.closest('.input-cell');
    if (inputCell) {
      inputCell.classList.add('active');
    }
    
    input.classList.add('current-input');
  }

  /**
   * Remueve el estado activo del input
   * @param {HTMLElement} input - Input
   */
  removeActiveInput(input) {
    input.classList.remove('current-input');
  }
}

// Exportar instancia singleton
export const uiManager = new UIManager();
