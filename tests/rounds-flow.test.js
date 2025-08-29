/**
 * Prueba de flujo de rondas en servidor (Socket.IO)
 * Verifica:
 *  - createRoom con rounds=1
 *  - startGame -> showRoulette -> spinRoulette -> rouletteResult
 *  - submitWords de todos los jugadores
 *  - roundEnded seguido de gameEnded (al ser 1 ronda)
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
  return io(SERVER_URL, { transports: ['websocket'], forceNew: true, reconnection: true });
}

describe('Flujo de rondas - maxRounds=1 termina en gameEnded', () => {
  jest.setTimeout(30000);

  test('Finaliza en gameEnded tras una única ronda', async () => {
    const host = connectClient();
    const p2 = connectClient();

    const refs = { roomId: null, letter: null };

    await new Promise((resolve, reject) => {
      host.on('connect', () => {
        // Crear sala con 1 ronda
        host.emit('createRoom', { playerName: 'Host', rounds: 1 });
      });

      host.on('roomCreated', (room) => {
        refs.roomId = room.roomId;
      });

      host.on('joinedRoom', () => {
        // Segundo jugador se une
        p2.emit('joinRoom', { roomId: refs.roomId, playerName: 'Ana' });
      });

      p2.on('joinedRoom', () => {
        // Iniciar juego
        host.emit('startGame');
      });

      host.on('showRoulette', () => {
        // Girar ruleta
        host.emit('spinRoulette');
      });

      host.on('rouletteResult', (data) => {
        refs.letter = data.letter;
        // Enviar palabras válidas rápidamente
        setTimeout(() => {
          const w = `${refs.letter}a`;
          host.emit('submitWords', { roomId: refs.roomId, playerName: 'Host', words: { NOMBRE: w, ANIMAL: '', COSA: '', FRUTA: '' } });
          p2.emit('submitWords', { roomId: refs.roomId, playerName: 'Ana', words: { NOMBRE: w, ANIMAL: '', COSA: '', FRUTA: '' } });
        }, 800);
      });

      let sawRoundEnded = false;

      host.on('roundEnded', (payload) => {
        try {
          expect(payload).toHaveProperty('scores');
          expect(payload).toHaveProperty('playerScores');
          expect(payload).toHaveProperty('letter');
          sawRoundEnded = true;
        } catch (e) {
          reject(e);
        }
      });

      host.on('gameEnded', (finalPayload) => {
        try {
          expect(sawRoundEnded).toBe(true);
          expect(finalPayload).toHaveProperty('results');
          expect(Array.isArray(finalPayload.results)).toBe(true);
          resolve();
        } catch (e) { reject(e); }
      });

      setTimeout(() => reject(new Error('Timeout esperando gameEnded')), 25000);
    });

    host.disconnect();
    p2.disconnect();
  });

  afterAll((done) => {
    try { server.close(() => done()); } catch (_) { done(); }
  });
});
