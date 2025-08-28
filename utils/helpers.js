/**
 * Funciones auxiliares y utilidades
 */

import { STORAGE_KEYS } from './constants.js';

/**
 * Genera un ID único para las salas
 * @returns {string} ID único
 */
export function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Valida que el username no esté vacío
 * @param {string} username - Nombre de usuario
 * @returns {boolean} True si es válido
 */
export function validateUsername(username) {
  return username && username.trim().length > 0;
}

/**
 * Valida que una palabra empiece con la letra correcta
 * @param {string} word - Palabra a validar
 * @param {string} letter - Letra requerida
 * @returns {boolean} True si es válida
 */
export function validateWord(word, letter) {
  if (!word || !letter) return false;
  return word.charAt(0).toUpperCase() === letter.toUpperCase();
}

/**
 * Cuenta las sílabas de una palabra en español
 * @param {string} word - Palabra
 * @returns {number} Número de sílabas
 */
export function countSyllables(word) {
  if (!word) return 0;
  
  const vowels = ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü'];
  let syllables = 0;
  let prevIsVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i].toLowerCase());
    if (isVowel && !prevIsVowel) {
      syllables++;
    }
    prevIsVowel = isVowel;
  }
  
  return syllables || 1;
}

/**
 * Gestión del localStorage
 */
export const storage = {
  get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },

  // Métodos específicos para el juego
  getUsername() {
    return localStorage.getItem(STORAGE_KEYS.USERNAME);
  },

  setUsername(username) {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
  },

  getCurrentRoomId() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_ROOM_ID);
  },

  setCurrentRoomId(roomId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROOM_ID, roomId);
  },

  getRooms() {
    return this.get(STORAGE_KEYS.ROOMS) || [];
  },

  saveRoom(room) {
    const rooms = this.getRooms();
    const existingIndex = rooms.findIndex(r => r.roomId === room.roomId);
    
    if (existingIndex >= 0) {
      rooms[existingIndex] = { ...rooms[existingIndex], ...room };
    } else {
      rooms.push({ ...room, createdAt: new Date().toISOString() });
    }
    
    this.set(STORAGE_KEYS.ROOMS, rooms);
  }
};

/**
 * Formatea el tiempo en formato MM:SS
 * @param {number} seconds - Segundos
 * @returns {string} Tiempo formateado
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Muestra mensajes de notificación
 * @param {string} message - Mensaje
 * @param {string} type - Tipo: success, error, info
 */
export function showNotification(message, type = 'info') {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'polite');
  
  notification.innerHTML = `
    <div class="notification__content">
      <span class="notification__message">${message}</span>
      <button class="notification__close" aria-label="Cerrar notificación">&times;</button>
    </div>
  `;

  // Añadir al DOM
  document.body.appendChild(notification);

  // Auto-remover después de 5 segundos
  const timeoutId = setTimeout(() => {
    notification.remove();
  }, 5000);

  // Permitir cerrar manualmente
  notification.querySelector('.notification__close').addEventListener('click', () => {
    clearTimeout(timeoutId);
    notification.remove();
  });
}

/**
 * Debounce para limitar la frecuencia de ejecución de funciones
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
