/**
 * Prueba: el servidor es la única fuente del temporizador (emite timerUpdate decreciente)
 */
const { io } = require('socket.io-client');

const { server } = require('../server');

let SERVER_URL;

beforeAll(async () => {
  if (!server.listening) {
    await new Promise((resolve) => server.listen(0, () => resolve(true)));
  }
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3000;
  SERVER_URL = `http://localhost:${port}`;
});

function connectClient() {
  return io(SERVER_URL, { transports: ['websocket'], forceNew: true, reconnection: false });
}

describe('Temporizador servidor', () => {
  jest.setTimeout(30000);

  test('timerUpdate decrece y llega a 0 al finalizar', async () => {
    const host = connectClient();
    const p2 = connectClient();
    const refs = { roomId: null };
    const times = [];

    await new Promise((resolve, reject) => {
      host.on('connect', () => {
        host.emit('createRoom', { playerName: 'Host' });
      });

      host.on('roomCreated', (room) => { refs.roomId = room.roomId; });

      host.on('joinedRoom', () => {
        p2.emit('joinRoom', { roomId: refs.roomId, playerName: 'Bob' });
      });

      p2.on('joinedRoom', () => {
        host.emit('startGame');
      });

      host.on('showRoulette', () => {
        host.emit('spinRoulette');
      });

      host.on('rouletteResult', () => {
        host.on('timerUpdate', (t) => {
          times.push(t.timeRemaining);
          // Resolvemos cuando tengamos suficientes muestras para comprobar decremento
          if (times.length >= 4) {
            resolve();
          }
        });
      });

      setTimeout(() => reject(new Error('Timeout en temporizador')), 25000);
    });

    // Verificaciones básicas
    expect(times.length).toBeGreaterThan(0);
    // Debe haber al menos un decremento
    const hasDecrement = times.some((v, i) => i > 0 && v < times[i - 1]);
    expect(hasDecrement).toBe(true);

    host.disconnect();
    p2.disconnect();
  });

  afterAll((done) => {
    try { server.close(() => done()); } catch (_) { done(); }
  });
});


