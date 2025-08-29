/**
 * Gestor de Socket.IO
 */

import { SOCKET_EVENTS } from '../../utils/constants.js';
import { showNotification } from '../../utils/helpers.js';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  /**
   * Inicializa la conexión con Socket.IO
   */
  connect() {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io();
    this.setupBaseEventListeners();
    return this.socket;
  }

  /**
   * Configura los event listeners básicos
   */
  setupBaseEventListeners() {
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Conectado al servidor');
      this.isConnected = true;
      // Intento de reconexión transparente: si hay roomId y username almacenados
      try {
        const roomId = localStorage.getItem('currentRoomId');
        const username = localStorage.getItem('username');
        if (roomId && username) {
          this.reconnectPlayer({ roomId, playerName: username });
          this.getRoomState({ roomId });
        }
      } catch (_) {}
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('Desconectado del servidor');
      this.isConnected = false;
      showNotification('Conexión perdida con el servidor', 'error');
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('Error de Socket.IO:', error);
      showNotification(error.message || 'Error de conexión', 'error');
    });
  }

  /**
   * Emite un evento al servidor
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket no conectado');
      return;
    }
    
    this.socket.emit(event, data);
  }

  /**
   * Escucha un evento del servidor
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket no inicializado');
      return;
    }

    this.socket.on(event, callback);
    
    // Guardar referencia para poder hacer cleanup
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Deja de escuchar un evento específico
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback (opcional)
   */
  off(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
      
      // Remover de la lista de listeners
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event);
    }
  }

  /**
   * Desconecta el socket y limpia listeners
   */
  disconnect() {
    if (this.socket) {
      // Limpiar todos los listeners personalizados
      this.eventListeners.forEach((listeners, event) => {
        this.socket.off(event);
      });
      this.eventListeners.clear();

      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Solicita el estado actual de una sala
   * @param {{roomId: string}} data
   */
  getRoomState(data) {
    this.emit('getRoomState', data);
  }

  /**
   * Reasigna el socket.id de un jugador en una sala (reconexión)
   * @param {{roomId: string, playerName: string}} data
   */
  reconnectPlayer(data) {
    this.emit('reconnectPlayer', data);
  }

  /**
   * Métodos específicos del juego
   */
  
  createRoom(roomData) {
    this.emit(SOCKET_EVENTS.CREATE_ROOM, roomData);
  }

  joinRoom(roomData) {
    this.emit(SOCKET_EVENTS.JOIN_ROOM, roomData);
  }

  startGame(roomId = null) {
    // El servidor toma roomId de socket.roomId, no necesita parámetros
    this.emit(SOCKET_EVENTS.START_GAME);
  }

  spinRoulette(roomId = null) {
    // El servidor toma roomId de socket.roomId, no necesita parámetros
    this.emit(SOCKET_EVENTS.SPIN_ROULETTE);
  }

  submitWords(roomId, playerName, words) {
    this.emit(SOCKET_EVENTS.SUBMIT_WORDS, { roomId, playerName, words });
  }

  getRooms() {
    this.emit(SOCKET_EVENTS.GET_ROOMS);
  }

  /**
   * Emite un voto de validación durante la fase de revisión
   * @param {{roomId: string, voterName: string, targetPlayer: string, category: string, decision: 'valid'|'invalid'}} data
   */
  castVote(data) {
    this.emit(SOCKET_EVENTS.CAST_VOTE, data);
  }

  /**
   * Solicita avanzar a la siguiente ronda (solo host)
   * @param {string} roomId
   */
  nextRound(roomId) {
    this.emit(SOCKET_EVENTS.NEXT_ROUND, { roomId });
  }
}

// Exportar instancia singleton
export const socketManager = new SocketManager();
