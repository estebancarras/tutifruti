// @ts-check
/**
 * Pruebas API HTTP con supertest
 * - Verifica GET /activeRooms
 */
const request = require('supertest');
const { io } = require('socket.io-client');
const { server } = require('../server');

let BASE;

beforeAll(async () => {
  if (!server.listening) {
    await new Promise((resolve) => server.listen(0, () => resolve(true)));
  }
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3000;
  BASE = `http://localhost:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(() => resolve(true)));
});

describe('API HTTP: /activeRooms', () => {
  jest.setTimeout(30000);

  function connectClient() {
    return io(BASE, { transports: ['websocket'] });
  }

  test('GET /activeRooms responde 200 y lista la sala creada', async () => {
    const host = connectClient();

    const roomRef = { id: null };

    await new Promise((resolve, reject) => {
      host.on('connect', () => {
        host.emit('createRoom', { playerName: 'ApiHost', roomName: 'Sala API', maxPlayers: 5 });
      });

      host.on('joinedRoom', (data) => {
        try {
          expect(data).toHaveProperty('roomId');
          roomRef.id = data.roomId;
          resolve(true);
        } catch (e) { reject(e); }
      });

      host.on('error', (err) => reject(new Error(`Socket error: ${JSON.stringify(err)}`)));
      setTimeout(() => reject(new Error('Timeout esperando joinedRoom')), 8000);
    });

    const res = await request(server).get('/activeRooms').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r) => r.roomId === roomRef.id);
    expect(found).toBeTruthy();
    expect(found).toHaveProperty('roomName');

    host.disconnect();
  });
});
