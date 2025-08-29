/**
 * Pruebas: reconexión y scoring clásico en fin de ronda
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

describe('Reconexion y Scoring', () => {
  jest.setTimeout(30000);

  test('Fin de ronda calcula scoring clásico y reconexión rehidrata estado', async () => {
    const host = connectClient();
    const p2 = connectClient();

    const refs = { roomId: null, letter: null };

    await new Promise((resolve, reject) => {
      host.on('connect', () => {
        host.emit('createRoom', { playerName: 'Host' });
      });

      host.on('joinedRoom', () => {
        // Un segundo jugador
        p2.emit('joinRoom', { roomId: refs.roomId, playerName: 'Ana' });
      });

      host.on('roomCreated', (room) => {
        refs.roomId = room.roomId;
      });

      p2.on('joinedRoom', () => {
        // Empezar juego
        host.emit('startGame');
      });

      host.on('showRoulette', () => {
        // Gira la ruleta
        host.emit('spinRoulette');
      });

      host.on('rouletteResult', (data) => {
        refs.letter = data.letter;
        // Esperar breve y enviar palabras válidas del mismo inicio de letra
        setTimeout(() => {
          const wordsHost = { NOMBRE: `${refs.letter}a`, ANIMAL: '', COSA: '', FRUTA: '' };
          const wordsP2 = { NOMBRE: `${refs.letter}a`, ANIMAL: '', COSA: '', FRUTA: '' };
          host.emit('submitWords', { roomId: refs.roomId, playerName: 'Host', words: wordsHost });
          p2.emit('submitWords', { roomId: refs.roomId, playerName: 'Ana', words: wordsP2 });
        }, 2500);
      });

      host.on('roundEnded', (payload) => {
        try {
          expect(payload).toHaveProperty('scores');
          expect(payload).toHaveProperty('playerScores');
          // Debe contener letra
          expect(payload).toHaveProperty('letter');
          // Scoring clásico presente con claves total
          const scoreHost = payload.scores['Host'];
          const scoreAna = payload.scores['Ana'];
          expect(scoreHost).toHaveProperty('total');
          expect(scoreAna).toHaveProperty('total');

          // Simular reconexión de p2
          p2.disconnect();
          setTimeout(() => {
            const p2b = connectClient();
            p2b.on('connect', () => {
              p2b.emit('reconnectPlayer', { roomId: refs.roomId, playerName: 'Ana' });
              p2b.emit('getRoomState', { roomId: refs.roomId });
            });
            p2b.on('roomState', (state) => {
              try {
                expect(state.roomId).toBe(refs.roomId);
                expect(Array.isArray(state.players)).toBe(true);
                resolve();
                p2b.disconnect();
              } catch (e) { reject(e); }
            });
          }, 500);
        } catch (e) {
          reject(e);
        }
      });

      setTimeout(() => reject(new Error('Timeout en reconexión/scoring')), 25000);
    });

    host.disconnect();
    p2.disconnect();
  });

  afterAll((done) => {
    try { server.close(() => done()); } catch (_) { done(); }
  });
});


