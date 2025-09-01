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
   * Actualiza la visualización de la letra seleccionada - NUEVO HEADER COMPACTO
   * @param {string} letter - Letra seleccionada
   */
  displaySelectedLetter(letter) {
    // Actualizar en header compacto
    const letterDisplay = document.getElementById('letterDisplay');
    const statusMessage = document.getElementById('selectedLetter');
    
    if (letterDisplay) {
      letterDisplay.textContent = letter;
      letterDisplay.setAttribute('aria-label', `Letra seleccionada: ${letter}`);
    }
    
    if (statusMessage) {
      statusMessage.textContent = `¡Escribiendo con letra ${letter}!`;
    }

    this.announce(`Letra seleccionada: ${letter}. ¡Tiempo para escribir!`);
  }

  /**
   * ELIMINADO: showRoulette - ya no se usa ruleta
   */
  showRoulette() {
    // NOOP - Ya no se usa ruleta en el nuevo flujo
    console.log('[UIManager] showRoulette llamado pero ignorado - nuevo flujo sin ruleta');
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
   * ELIMINADO: hideRoulette - ya no se usa ruleta
   */
  hideRoulette() {
    // NOOP - Ya no se usa ruleta en el nuevo flujo
    console.log('[UIManager] hideRoulette llamado pero ignorado - nuevo flujo sin ruleta');
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

  /**
   * Renderiza la grilla de categorías e inputs dinámicamente
   * @param {string[]} categories
   */
  renderCategoriesGrid(categories = []) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    grid.innerHTML = '';
    categories.forEach((cat) => {
      const safeId = `input-${cat}`;
      const card = document.createElement('div');
      card.className = 'category-card';

      card.innerHTML = `
        <div class="category-card__title">${cat}</div>
        <div class="category-card__body">
          <label for="${safeId}" class="sr-only">Ingresa ${cat.toLowerCase()}</label>
          <input type="text"
                 id="${safeId}"
                 class="word-input"
                 data-category="${cat}"
                 placeholder="Con la letra actual..."
                 autocomplete="off"
                 maxlength="50" />
        </div>
      `;
      grid.appendChild(card);
    });
  }

  /**
   * Abre el modal de revisión/votación con la lista de palabras por categoría y jugador
   * @param {{round:number, letter:string, categories:string[], words:Object, reviewTime:number}} data
   * @param {{isHost:boolean}} options
   */
  openReviewModal(data, options = { isHost: false }) {
    const { categories = [], words = {}, letter = '', reviewTime = 20 } = data || {};
    const isHost = !!options.isHost;

    const modal = this.createModal('review', `Revisión de palabras (Letra: ${letter})`);
    const body = modal.querySelector('.modal__body');

    // Construir contenido agrupado por categoría
    let html = `<div class="review-header">
                  <div class="review-timer" id="reviewTimer" aria-live="polite">${reviewTime}s</div>
                  <p class="review-help">Vota ✅/❌ para validar o impugnar las palabras (no puedes votar tu propia palabra).</p>
                </div>`;

    categories.forEach((cat) => {
      html += `<section class="review-category">
                 <h3 class="review-category__title">${cat} con "${letter}"</h3>
                 <div class="review-category__list">`;

      // Recorrer jugadores y su palabra en esta categoría
      Object.keys(words || {}).forEach((playerName) => {
        const w = (words[playerName] && words[playerName][cat]) || '';
        const disabled = (localStorage.getItem('username') || '').toLowerCase() === playerName.toLowerCase();
        const itemId = `vote-${cat}-${playerName}`.replace(/\s+/g, '-');

        html += `
          <div class="review-item" id="${itemId}">
            <div class="review-item__player">
              <span class="avatar" aria-hidden="true">${playerName.charAt(0).toUpperCase()}</span>
              <span class="player-name">${playerName}</span>
            </div>
            <div class="review-item__word">${w || '<span class="muted">—</span>'}</div>
            <div class="review-item__actions">
              <button type="button" class="btn btn--ghost btn--sm vote-valid" data-cat="${cat}" data-player="${playerName}" ${disabled ? 'disabled' : ''} title="Marcar válida">✅</button>
              <button type="button" class="btn btn--ghost btn--sm vote-invalid" data-cat="${cat}" data-player="${playerName}" ${disabled ? 'disabled' : ''} title="Marcar inválida">❌</button>
              <span class="vote-counts" aria-live="polite">
                <span class="vote-valid-count">0</span>/<span class="vote-invalid-count">0</span>
              </span>
            </div>
          </div>
        `;
      });

      html += `  </div>
               </section>`;
    });

    // Botón “Siguiente Ronda” solo para host
    if (isHost) {
      html += `
        <div class="review-actions">
          <button type="button" id="nextRoundButton" class="btn btn--primary">
            Siguiente Ronda
          </button>
        </div>
      `;
    }

    body.innerHTML = html;
    this.openModal('review');

    // Wire de votos
    body.querySelectorAll('.vote-valid').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        const player = btn.getAttribute('data-player');
        const voterName = localStorage.getItem('username') || '';
        window.socketManager?.castVote({ roomId: localStorage.getItem('currentRoomId'), voterName, targetPlayer: player, category: cat, decision: 'valid' });
      });
    });
    body.querySelectorAll('.vote-invalid').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        const player = btn.getAttribute('data-player');
        const voterName = localStorage.getItem('username') || '';
        window.socketManager?.castVote({ roomId: localStorage.getItem('currentRoomId'), voterName, targetPlayer: player, category: cat, decision: 'invalid' });
      });
    });

    // Wire “Siguiente Ronda”
    const nextBtn = body.querySelector('#nextRoundButton');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const roomId = localStorage.getItem('currentRoomId');
        window.socketManager?.nextRound(roomId);
      });
    }

    // Contador visual (solo UI; el servidor cierra igualmente)
    let remaining = reviewTime;
    const timerEl = body.querySelector('#reviewTimer');
    if (timerEl) {
      const interval = setInterval(() => {
        remaining = Math.max(0, remaining - 1);
        timerEl.textContent = `${remaining}s`;
        if (remaining <= 0) clearInterval(interval);
      }, 1000);
    }
  }

  /**
   * Actualiza contadores de votos de un ítem
   * @param {{targetPlayer:string, category:string, validCount:number, invalidCount:number}} data
   */
  updateVoteCounts(data) {
    const { targetPlayer, category, validCount = 0, invalidCount = 0 } = data || {};
    const id = `vote-${category}-${targetPlayer}`.replace(/\s+/g, '-');
    const root = document.getElementById(id);
    if (!root) return;
    const vc = root.querySelector('.vote-valid-count');
    const ic = root.querySelector('.vote-invalid-count');
    if (vc) vc.textContent = String(validCount);
    if (ic) ic.textContent = String(invalidCount);
  }

  /**
   * Cierra el modal de revisión (si está abierto)
   */
  closeReviewModal() {
    this.closeModal('review');
  }
}

// Exportar instancia singleton
export const uiManager = new UIManager();
