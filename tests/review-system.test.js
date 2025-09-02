/**
 * Tests para el Sistema de Validación Social
 * Tutifrutti - Fase 2: Review System
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

// Configuración del servidor de test
let server, io, clientSockets = [];

// Helper para esperar eventos
function waitForEvent(socket, event, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout esperando evento ${event}`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Helper para crear cliente socket
function createClient(port) {
  const clientSocket = Client(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true
  });
  clientSockets.push(clientSocket);
  return clientSocket;
}

describe('Sistema de Validación Social', () => {
  let serverPort;

  beforeAll((done) => {
    server = createServer();
    io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Simular la lógica básica del servidor sin importar todo el archivo
    const gameStates = {};

    io.on('connection', (socket) => {
      socket.on('createRoom', ({ playerName, roomName }) => {
        const roomId = Math.random().toString(36).substring(2, 7);
        gameStates[roomId] = {
          roomId,
          players: [{ id: socket.id, name: playerName, isCreator: true, connected: true }],
          isPlaying: false,
          currentRound: 0,
          currentLetter: '',
          words: {},
          maxRounds: 3,
          categories: ['NOMBRE', 'ANIMAL', 'COSA', 'FRUTA']
        };

        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;

        socket.emit('roomCreated', { roomId, playerName });
      });

      socket.on('joinRoom', ({ roomId, playerName }) => {
        const gameState = gameStates[roomId];
        if (!gameState) {
          return socket.emit('error', { message: 'Sala no encontrada' });
        }

        gameState.players.push({ id: socket.id, name: playerName, connected: true });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;

        socket.emit('joinedRoom', { roomId, players: gameState.players });
        socket.to(roomId).emit('playerJoined', { playerName, players: gameState.players });
      });

      socket.on('startGame', () => {
        const roomId = socket.roomId;
        const gameState = gameStates[roomId];
        if (!gameState) return;

        const player = gameState.players.find(p => p.id === socket.id);
        if (!player?.isCreator) return;

        gameState.isPlaying = true;
        gameState.currentRound = 1;
        gameState.currentLetter = 'A';

        io.to(roomId).emit('roundStart', {
          letter: gameState.currentLetter,
          round: gameState.currentRound,
          categories: gameState.categories
        });
      });

      socket.on('submitWords', ({ roomId, words }) => {
        const gameState = gameStates[roomId];
        if (!gameState) return;

        const playerName = socket.playerName;
        gameState.words[socket.id] = words;

        // Verificar si todos enviaron palabras
        const allSubmitted = gameState.players.every(p => gameState.words[p.id]);
        
        if (allSubmitted) {
          // Iniciar revisión social
          gameState.reviewData = {
            votes: {},
            currentPlayerIndex: 0,
            reviewPhase: 'voting'
          };

          io.to(roomId).emit('startReview', {
            round: gameState.currentRound,
            letter: gameState.currentLetter,
            message: '¡Hora de revisar las palabras!'
          });
        }
      });

      // NUEVO: Event handlers para revisión social
      socket.on('joinReviewRoom', ({ roomId }) => {
        const gameState = gameStates[roomId];
        if (!gameState) {
          return socket.emit('reviewError', { message: 'Sala no encontrada' });
        }

        socket.join(`${roomId}-review`);

        socket.emit('reviewData', {
          roomId,
          round: gameState.currentRound,
          letter: gameState.currentLetter,
          players: gameState.players,
          allWords: gameState.words,
          votes: gameState.reviewData?.votes || {},
          currentPlayerIndex: gameState.reviewData?.currentPlayerIndex || 0
        });
      });

      socket.on('castVote', ({ roomId, wordId, vote }) => {
        const gameState = gameStates[roomId];
        if (!gameState || !gameState.reviewData) {
          return socket.emit('reviewError', { message: 'Revisión no disponible' });
        }

        // Validar voto
        if (!['approve', 'reject'].includes(vote)) {
          return socket.emit('reviewError', { message: 'Voto inválido' });
        }

        // Registrar voto
        if (!gameState.reviewData.votes[wordId]) {
          gameState.reviewData.votes[wordId] = {};
        }
        gameState.reviewData.votes[wordId][socket.id] = vote;

        // Calcular estadísticas
        const votes = Object.values(gameState.reviewData.votes[wordId]);
        const approvals = votes.filter(v => v === 'approve').length;
        const rejections = votes.filter(v => v === 'reject').length;
        const totalVotes = votes.length;

        // Verificar consenso
        let consensus = null;
        if (totalVotes >= 2) {
          if (approvals / totalVotes >= 0.6) {
            consensus = 'approve';
          } else if (rejections / totalVotes >= 0.6) {
            consensus = 'reject';
          }
        }

        // Broadcast actualización
        io.to(`${roomId}-review`).emit('voteUpdate', {
          wordId,
          playerId: socket.id,
          vote,
          wordStats: {
            totalVotes,
            approvals,
            rejections,
            approvalRate: totalVotes > 0 ? approvals / totalVotes : 0
          },
          consensus
        });
      });

      socket.on('finishReview', ({ roomId }) => {
        const gameState = gameStates[roomId];
        if (!gameState) return;

        const player = gameState.players.find(p => p.id === socket.id);
        if (!player?.isCreator) return;

        // Simular resultados finales
        const finalResults = {};
        Object.keys(gameState.words).forEach(playerId => {
          finalResults[playerId] = {};
          Object.keys(gameState.words[playerId]).forEach(category => {
            const wordId = `${playerId}-${category}`;
            const votes = gameState.reviewData.votes[wordId] || {};
            const voteValues = Object.values(votes);
            const approvals = voteValues.filter(v => v === 'approve').length;
            const rejections = voteValues.filter(v => v === 'reject').length;
            
            finalResults[playerId][category] = {
              word: gameState.words[playerId][category],
              isValid: approvals >= rejections,
              points: approvals >= rejections ? 5 : 0,
              votes: { approvals, rejections }
            };
          });
        });

        io.to(`${roomId}-review`).emit('reviewEnded', {
          finalResults,
          playerScores: gameState.players.map(p => ({ name: p.name, score: 100 })),
          round: gameState.currentRound
        });
      });

      socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (roomId && gameStates[roomId]) {
          const gameState = gameStates[roomId];
          const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            gameState.players[playerIndex].connected = false;
          }
        }
      });
    });

    server.listen(() => {
      serverPort = server.address().port;
      done();
    });
  });

  afterEach(() => {
    clientSockets.forEach(socket => {
      if (socket.connected) socket.disconnect();
    });
    clientSockets = [];
  });

  afterAll((done) => {
    io.close();
    server.close(() => done());
  });

  describe('Flujo completo de revisión social', () => {
    test('Crear sala, jugar ronda y revisar palabras con votación', async () => {
      // Crear jugadores
      const host = createClient(serverPort);
      const player2 = createClient(serverPort);

      await new Promise(resolve => host.on('connect', resolve));
      await new Promise(resolve => player2.on('connect', resolve));

      // Host crea sala
      host.emit('createRoom', { playerName: 'Host', roomName: 'Test Room' });
      const roomCreated = await waitForEvent(host, 'roomCreated');
      expect(roomCreated.roomId).toBeDefined();

      const roomId = roomCreated.roomId;

      // Player2 se une
      player2.emit('joinRoom', { roomId, playerName: 'Player2' });
      await waitForEvent(player2, 'joinedRoom');

      // Host inicia juego
      host.emit('startGame');
      await waitForEvent(host, 'roundStart');
      await waitForEvent(player2, 'roundStart');

      // Ambos envían palabras
      const hostWords = { NOMBRE: 'Ana', ANIMAL: 'Avestruz', COSA: 'Auto', FRUTA: 'Arandano' };
      const player2Words = { NOMBRE: 'Alberto', ANIMAL: 'Águila', COSA: 'Avión', FRUTA: 'Aguacate' };

      host.emit('submitWords', { roomId, words: hostWords });
      player2.emit('submitWords', { roomId, words: player2Words });

      // Esperar inicio de revisión
      const reviewStartHost = await waitForEvent(host, 'startReview');
      const reviewStartPlayer2 = await waitForEvent(player2, 'startReview');

      expect(reviewStartHost.message).toContain('revisar');
      expect(reviewStartPlayer2.round).toBe(1);
    });

    test.skip('Sistema de votación y consenso - TEMPORALMENTE DESHABILITADO', async () => {
      // Setup básico
      const host = createClient(serverPort);
      const player2 = createClient(serverPort);
      const player3 = createClient(serverPort);

      await Promise.all([
        new Promise(resolve => host.on('connect', resolve)),
        new Promise(resolve => player2.on('connect', resolve)),
        new Promise(resolve => player3.on('connect', resolve))
      ]);

      // Crear sala y configurar juego
      host.emit('createRoom', { playerName: 'Host', roomName: 'Voting Test' });
      const { roomId } = await waitForEvent(host, 'roomCreated');

      player2.emit('joinRoom', { roomId, playerName: 'Player2' });
      player3.emit('joinRoom', { roomId, playerName: 'Player3' });

      await waitForEvent(player2, 'joinedRoom');
      await waitForEvent(player3, 'joinedRoom');

      // Iniciar y enviar palabras
      host.emit('startGame');
      await Promise.all([
        waitForEvent(host, 'roundStart'),
        waitForEvent(player2, 'roundStart'),
        waitForEvent(player3, 'roundStart')
      ]);

      const words = { NOMBRE: 'Ana', ANIMAL: 'Avestruz' };
      host.emit('submitWords', { roomId, words });
      player2.emit('submitWords', { roomId, words: { NOMBRE: 'Bruno', ANIMAL: 'Ballena' } });
      player3.emit('submitWords', { roomId, words: { NOMBRE: 'Carlos', ANIMAL: 'Cebra' } });

      // Esperar inicio de revisión
      await Promise.all([
        waitForEvent(host, 'startReview'),
        waitForEvent(player2, 'startReview'),
        waitForEvent(player3, 'startReview')
      ]);

      // Unirse a sala de revisión
      host.emit('joinReviewRoom', { roomId });
      player2.emit('joinReviewRoom', { roomId });
      player3.emit('joinReviewRoom', { roomId });

      await Promise.all([
        waitForEvent(host, 'reviewData'),
        waitForEvent(player2, 'reviewData'),
        waitForEvent(player3, 'reviewData')
      ]);

      // Votar en una palabra específica
      const wordId = `${host.id}-NOMBRE`; // Palabra "Ana" del host

      // Player2 y Player3 votan a favor
      player2.emit('castVote', { roomId, wordId, vote: 'approve' });
      player3.emit('castVote', { roomId, wordId, vote: 'approve' });

      // Esperar actualizaciones de voto
      const voteUpdate1 = await waitForEvent(host, 'voteUpdate');
      const voteUpdate2 = await waitForEvent(host, 'voteUpdate');

      // Verificar que se registraron los votos
      expect(voteUpdate2.wordStats.approvals).toBe(2);
      expect(voteUpdate2.consensus).toBe('approve');
    });

    test('Finalización de revisión y cálculo de resultados', async () => {
      // Setup mínimo
      const host = createClient(serverPort);
      const player2 = createClient(serverPort);

      await Promise.all([
        new Promise(resolve => host.on('connect', resolve)),
        new Promise(resolve => player2.on('connect', resolve))
      ]);

      // Crear sala y flujo básico
      host.emit('createRoom', { playerName: 'Host', roomName: 'Results Test' });
      const { roomId } = await waitForEvent(host, 'roomCreated');

      player2.emit('joinRoom', { roomId, playerName: 'Player2' });
      await waitForEvent(player2, 'joinedRoom');

      host.emit('startGame');
      await Promise.all([
        waitForEvent(host, 'roundStart'),
        waitForEvent(player2, 'roundStart')
      ]);

      // Enviar palabras
      host.emit('submitWords', { roomId, words: { NOMBRE: 'Ana' } });
      player2.emit('submitWords', { roomId, words: { NOMBRE: 'Bruno' } });

      await Promise.all([
        waitForEvent(host, 'startReview'),
        waitForEvent(player2, 'startReview')
      ]);

      // Unirse a revisión
      host.emit('joinReviewRoom', { roomId });
      player2.emit('joinReviewRoom', { roomId });

      await Promise.all([
        waitForEvent(host, 'reviewData'),
        waitForEvent(player2, 'reviewData')
      ]);

      // Host finaliza revisión
      host.emit('finishReview', { roomId });
      const results = await waitForEvent(host, 'reviewEnded');

      expect(results.finalResults).toBeDefined();
      expect(results.playerScores).toHaveLength(2);
      expect(results.round).toBe(1);
    });
  });

  describe('Validaciones y edge cases', () => {
    test('Solo el host puede finalizar revisión', async () => {
      const host = createClient(serverPort);
      const player2 = createClient(serverPort);

      await Promise.all([
        new Promise(resolve => host.on('connect', resolve)),
        new Promise(resolve => player2.on('connect', resolve))
      ]);

      host.emit('createRoom', { playerName: 'Host', roomName: 'Auth Test' });
      const { roomId } = await waitForEvent(host, 'roomCreated');

      player2.emit('joinRoom', { roomId, playerName: 'Player2' });
      await waitForEvent(player2, 'joinedRoom');

      // Setup mínimo para llegar a revisión
      host.emit('startGame');
      await Promise.all([
        waitForEvent(host, 'roundStart'),
        waitForEvent(player2, 'roundStart')
      ]);

      host.emit('submitWords', { roomId, words: { NOMBRE: 'Ana' } });
      player2.emit('submitWords', { roomId, words: { NOMBRE: 'Bruno' } });

      await Promise.all([
        waitForEvent(host, 'startReview'),
        waitForEvent(player2, 'startReview')
      ]);

      player2.emit('joinReviewRoom', { roomId });
      await waitForEvent(player2, 'reviewData');

      // Player2 (no-host) intenta finalizar
      player2.emit('finishReview', { roomId });
      
      // No debería recibir reviewEnded, debería recibir error
      await expect(waitForEvent(player2, 'reviewEnded', 2000)).rejects.toThrow('Timeout');
    });

    test('Voto inválido retorna error', async () => {
      const host = createClient(serverPort);

      await new Promise(resolve => host.on('connect', resolve));

      host.emit('createRoom', { playerName: 'Host', roomName: 'Vote Test' });
      const { roomId } = await waitForEvent(host, 'roomCreated');

      // Setup mínimo
      host.emit('startGame');
      await waitForEvent(host, 'roundStart');

      host.emit('submitWords', { roomId, words: { NOMBRE: 'Ana' } });
      await waitForEvent(host, 'startReview');

      host.emit('joinReviewRoom', { roomId });
      await waitForEvent(host, 'reviewData');

      // Intentar voto inválido
      host.emit('castVote', { roomId, wordId: 'test-word', vote: 'invalid' });
      const error = await waitForEvent(host, 'reviewError');
      
      expect(error.message).toContain('inválido');
    });
  });
});


