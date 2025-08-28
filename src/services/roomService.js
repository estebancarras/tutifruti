/**
 * Servicio de Salas
 * Contiene la lógica de negocio para la gestión de salas de juego.
 */

import { Room } from '../models/Room.js';

class RoomService {
  constructor() {
    this.rooms = new Map(); // Almacena las salas por ID
  }

  addRoom(room) {
    this.rooms.set(room.id, room);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId) {
    this.rooms.delete(roomId);
  }

  // Método para agregar un jugador a una sala
  addPlayerToRoom(roomId, playerData) {
    const room = this.getRoom(roomId);
    if (room) {
      room.players.push(playerData);
      return room;
    }
    throw new Error('Room not found');
  }
}

export const roomService = new RoomService();
