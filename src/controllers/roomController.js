/**
 * Controlador de Salas
 * Maneja la lógica relacionada con la creación, unión y gestión de salas.
 */

import { Room } from '../models/Room.js';
import { roomService } from '../services/roomService.js';

export const createRoom = (roomData) => {
  // Lógica para crear una nueva sala
  const room = new Room(roomData.id, roomData.name, roomData.creator, roomData.maxPlayers);
  roomService.addRoom(room);
  return room;
};

export const joinRoom = (roomId, playerData) => {
  // Lógica para unirse a una sala existente
  return roomService.addPlayerToRoom(roomId, playerData);
};

export const getRoomState = (roomId) => {
  // Lógica para obtener el estado actual de la sala
  return roomService.getRoom(roomId);
};
