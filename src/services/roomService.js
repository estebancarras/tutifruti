/**
 * Servicio de Salas
 * Contiene la lógica de negocio para la gestión de salas de juego.
 */

import { roomRepository } from '../repositories/roomRepository.js';

class RoomService {
  addRoom(room) {
    roomRepository.createRoom(room);
  }

  getRoom(roomId) {
    return roomRepository.findRoom(roomId);
  }

  removeRoom(roomId) {
    roomRepository.deleteRoom(roomId);
  }

  // Método para agregar un jugador a una sala
  addPlayerToRoom(roomId, playerData) {
    const room = this.getRoom(roomId);
    if (room) {
      room.players.push(playerData);
      roomRepository.updateRoom(roomId, room);
      return room;
    }
    throw new Error('Room not found');
  }
}

export const roomService = new RoomService();
