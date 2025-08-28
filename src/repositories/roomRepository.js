/**
 * Repositorio de Salas
 * Maneja la persistencia de datos para las salas de juego.
 */

class RoomRepository {
  constructor() {
    this.rooms = new Map(); // Almacena las salas por ID
  }

  createRoom(room) {
    this.rooms.set(room.id, room);
  }

  findRoom(roomId) {
    return this.rooms.get(roomId);
  }

  updateRoom(roomId, updatedData) {
    const room = this.findRoom(roomId);
    if (room) {
      Object.assign(room, updatedData);
      return room;
    }
    throw new Error('Room not found');
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }
}

export const roomRepository = new RoomRepository();
