/**
 * Pruebas: crear sala, unirse y manejo de duplicados
 */
const { io } = require('socket.io-client');

// Arranca el servidor al requerirlo (escucha en 3000)
const { server } = require('../server');

const SERVER_URL = 'http://localhost:3000';

function connectClient() {
  return io(SERVER_URL, { transports: ['websocket'], forceNew: true, reconnection: false });
}

describe('Crear y Unirse a Sala', () => {
  jest.setTimeout(20000);

  test('Crea sala y otro jugador se une; duplicado de nombre es rechazado', async () => {
    const creator = connectClient();
    const joiner = connectClient();
    const duplicate = connectClient();

    const roomIdRef = { id: null };

    await new Promise((resolve, reject) => {
      creator.on('connect', () => {
        creator.emit('createRoom', { playerName: 'Alice', roomName: 'Sala Test', maxPlayers: 5 });
      });

      creator.on('roomCreated', (room) => {
        expect(room).toHaveProperty('roomId');
        roomIdRef.id = room.roomId;
      });

      creator.on('joinedRoom', (data) => {
        try {
          expect(data.players).toBeInstanceOf(Array);
          expect(data.isCreator).toBe(true);
          // Unirse con otro jugador
          joiner.emit('joinRoom', { roomId: roomIdRef.id, playerName: 'Bob' });
        } catch (e) { reject(e); }
      });

      joiner.on('joinedRoom', (data) => {
        try {
          expect(data.roomId).toBe(roomIdRef.id);
          const names = data.players.map(p => p.name);
          expect(names).toEqual(expect.arrayContaining(['Alice', 'Bob']));
          // Intento duplicado de nombre
          duplicate.emit('joinRoom', { roomId: roomIdRef.id, playerName: 'Bob' });
        } catch (e) { reject(e); }
      });

      duplicate.on('error', (err) => {
        try {
          expect(err).toBeTruthy();
          expect(err.message).toMatch(/jugador con ese nombre/i);
          resolve();
        } catch (e) { reject(e); }
      });

      setTimeout(() => reject(new Error('Timeout en crear/unirse/duplicado')), 15000);
    });

    creator.disconnect();
    joiner.disconnect();
    duplicate.disconnect();
  });

  afterAll((done) => {
    try { server.close(() => done()); } catch (_) { done(); }
  });
});


