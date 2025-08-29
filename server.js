
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const mongoose = require('mongoose');

// Cargar variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'tutifruti_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // En producción, establecer a true si se usa HTTPS
});

app.use(sessionMiddleware);

// Crear servidor HTTP y Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // En producción, limitar a dominios específicos
    methods: ['GET', 'POST']
  }
});

// Compartir sesión entre Express y Socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Estructura de datos para el juego
let activeRooms = [];
let gameStates = {};

// Mapa de timers de desconexión con período de gracia por jugador
const disconnectTimers = new Map(); // key: `${roomId}:${playerName}` -> timeout id
const GRACE_PERIOD_MS = 15000;
const REVIEW_TIME_MS = 20000; // Duración de la fase de revisión/votación

// Helpers de conteo de conectados y actualización de sala
function getConnectedPlayers(gameState) {
  return (gameState.players || []).filter(p => p.connected !== false);
}
function updateActiveRoomsCount(roomId) {
  const gameState = gameStates[roomId];
  const roomIndex = activeRooms.findIndex(r => r.roomId === roomId);
  if (gameState && roomIndex !== -1) {
    activeRooms[roomIndex].currentPlayers = getConnectedPlayers(gameState).length;
  }
}

// Rate limiting simple por socket
const rateLimits = new Map(); // key: socket.id -> { eventKey: [timestamps] }

function checkRateLimit(socket, eventKey, limit, intervalMs) {
  const now = Date.now();
  if (!rateLimits.has(socket.id)) {
    rateLimits.set(socket.id, {});
  }
  const socketBucket = rateLimits.get(socket.id);
  if (!socketBucket[eventKey]) {
    socketBucket[eventKey] = [];
  }
  // Purga antigua
  socketBucket[eventKey] = socketBucket[eventKey].filter((ts) => now - ts < intervalMs);
  if (socketBucket[eventKey].length >= limit) {
    return false;
  }
  socketBucket[eventKey].push(now);
  return true;
}

// Logging mínimo estructurado
function logEvent({ socket, event, roomId = null, level = 'info', message = '', error = null, extra = {} }) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    roomId: roomId || socket?.roomId || null,
    socketId: socket?.id,
    message,
    error: error ? String(error) : undefined,
    ...extra
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

// Servir archivos estáticos (orden importante)
app.use('/public', express.static(__dirname + '/public'));
app.use('/utils', express.static(__dirname + '/utils'));
app.use('/views', express.static(__dirname + '/views'));
app.use('/', express.static(__dirname)); // raíz para index.html

// Ruta explícita para vistas HTML para evitar duplicaciones o 404
app.get(['/views/create-room.html', '/views/join-room.html', '/views/game.html'], (req, res) => {
  res.sendFile(__dirname + req.path);
});

/**
 * Fallback pasivo: dejar pasar para que otras rutas definidas más abajo (p. ej. /activeRooms)
 * puedan manejar la solicitud. El 404 explícito debe ubicarse al final del stack.
 */
app.use((req, res, next) => {
  if (req.path.startsWith('/socket.io')) return next();
  next();
});

// Definir estructura de un estado de juego - FORMATO TUTTI FRUTTI CLÁSICO
const createGameState = (roomId, maxPlayers = 5) => {
  return {
    roomId,
    players: [],
    maxPlayers,
    maxRounds: 5, // Número de rondas por defecto (configurable al crear sala)
    isPlaying: false,
    currentRound: 0,
    currentLetter: '',
    // Categorías ampliadas (10) – se pueden hacer configurables por sala en el futuro
    categories: ['NOMBRE', 'ANIMAL', 'COSA', 'FRUTA', 'PAIS', 'COLOR', 'COMIDA', 'CIUDAD', 'PROFESION', 'MARCA'],
    gameMode: 'classic', // Modo de juego clásico
    timeLimit: 60,
    timeRemaining: 60,
    timer: null,
    timerEndsAt: null,
    scores: {},
    // Estructura: {playerName: {CATEGORIA: 'palabra', ...}}
    words: {},
    validWords: {},
    // Orquestación de fases
    roundPhase: 'lobby', // lobby | roundStart | writing | review | results | ended
    reviewDuration: Math.floor(REVIEW_TIME_MS / 1000),
    reviewEndsAt: null,
    votes: {}, // { [playerName]: { [category]: { valid: Set|[], invalid: Set|[] } } }
    creator: null,
    private: false,
    password: null,
    // Props legacy para compatibilidad con UI anterior
    rouletteSpinning: false,
    showRoulette: false
  };
};

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  
  // Enviar la lista de salas activas al nuevo cliente
  socket.emit('activeRooms', activeRooms);
  
  // Manejar solicitud de salas activas
  socket.on('getRooms', () => {
    socket.emit('activeRooms', activeRooms);
  });

  // Sanitizador básico de nombres
  function sanitizeName(name) {
    if (!name || typeof name !== 'string') return null;
    // Normaliza a NFC, recorta tamaño y colapsa espacios
    const normalized = name.normalize('NFC');
    const trimmed = normalized.trim().slice(0, 20);
    return trimmed.replace(/\s+/g, ' ');
  }

  function isDuplicatePlayer(gameState, playerName) {
    return gameState.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
  }

  // Obtener estado actual de una sala específica
  socket.on('getRoomState', ({ roomId }) => {
    const gameState = gameStates[roomId];
    
    if (!gameState) {
      logEvent({ socket, event: 'getRoomState', roomId, level: 'warn', message: 'Sala no existe' });
      return socket.emit('error', { message: 'La sala no existe' });
    }
    
    // Enviar estado completo de la sala (solo jugadores conectados)
    socket.emit('roomState', {
      roomId: gameState.roomId,
      players: getConnectedPlayers(gameState),
      isPlaying: gameState.isPlaying,
      currentRound: gameState.currentRound,
      currentLetter: gameState.currentLetter,
      timeRemaining: gameState.timeRemaining,
      categories: gameState.categories,
      serverTime: Date.now(),
      timerEndsAt: gameState.timerEndsAt || null
    });
    
    logEvent({ socket, event: 'getRoomState', roomId, message: 'Estado de sala enviado' });
  });

  // Re-conexión: reasignar socket.id a un jugador existente por (roomId + playerName)
  socket.on('reconnectPlayer', ({ roomId, playerName }) => {
    const gameState = gameStates[roomId];
    const name = sanitizeName(playerName);
    if (!gameState || !name) {
      logEvent({ socket, event: 'reconnectPlayer', roomId, level: 'warn', message: 'Re-conexión inválida' });
      return socket.emit('error', { message: 'Re-conexión inválida' });
    }
    const playerIndex = gameState.players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    if (playerIndex === -1) {
      logEvent({ socket, event: 'reconnectPlayer', roomId, level: 'warn', message: 'Jugador no encontrado' });
      return socket.emit('error', { message: 'Jugador no encontrado en la sala' });
    }
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = name;
    gameState.players[playerIndex].id = socket.id;
    gameState.players[playerIndex].connected = true;
    delete gameState.players[playerIndex].disconnectedAt;

    // Cancelar timer de desconexión si existía
    const key = `${roomId}:${name}`;
    if (disconnectTimers.has(key)) {
      clearTimeout(disconnectTimers.get(key));
      disconnectTimers.delete(key);
    }

    updateActiveRoomsCount(roomId);

    socket.emit('roomState', {
      roomId: gameState.roomId,
      players: getConnectedPlayers(gameState),
      isPlaying: gameState.isPlaying,
      currentRound: gameState.currentRound,
      currentLetter: gameState.currentLetter,
      timeRemaining: gameState.timeRemaining,
      categories: gameState.categories,
      serverTime: Date.now(),
      timerEndsAt: gameState.timerEndsAt || null
    });
    logEvent({ socket, event: 'reconnectPlayer', roomId, message: 'Re-conectado y estado enviado' });
  });

  // Crear una nueva sala
  socket.on('createRoom', ({ playerName, roomName, maxPlayers, isPrivate, password, rounds }) => {
    if (!checkRateLimit(socket, 'createRoom', 2, 60_000)) {
      logEvent({ socket, event: 'createRoom', level: 'warn', message: 'Rate limit' });
      return socket.emit('error', { message: 'Demasiadas solicitudes para crear sala. Intenta de nuevo en un momento.' });
    }
    playerName = sanitizeName(playerName);
    if (!playerName) {
      return socket.emit('error', { message: 'Nombre inválido' });
    }
    const roomId = generateRoomId();
    const newRoom = {
      roomId,
      roomName: roomName || `Sala de ${playerName}`,
      creator: playerName,
      currentPlayers: 1,
      maxPlayers: maxPlayers || 5,
      isPrivate: isPrivate || false,
      createdAt: new Date()
    };
    
    // Crear estado del juego para esta sala
    gameStates[roomId] = createGameState(roomId, maxPlayers);
    gameStates[roomId].creator = playerName;
    gameStates[roomId].private = isPrivate;
    gameStates[roomId].password = password;
    gameStates[roomId].maxRounds = Number(rounds) > 0 ? Number(rounds) : 5;
    // Configurar número de rondas (1..20)
    const parsedRounds = (typeof rounds === 'number' && isFinite(rounds)) ? Math.floor(rounds) : NaN;
    gameStates[roomId].maxRounds = (!isNaN(parsedRounds) ? Math.max(1, Math.min(20, parsedRounds)) : 5);
    
    // Añadir el primer jugador (creador)
    gameStates[roomId].players.push({
      id: socket.id,
      name: playerName,
      isCreator: true,
      score: 0,
      ready: false,
      connected: true
    });
    
    // Inicializar puntuaciones
    gameStates[roomId].scores[playerName] = 0;
    gameStates[roomId].words[playerName] = {};
    
    // Añadir sala a la lista de activas
    activeRooms.push(newRoom);
    
    // Unir al socket a la sala
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = playerName;
    
    // Notificar a todos sobre la nueva sala
    io.emit('roomCreated', newRoom);
    
    // Notificar al creador
    socket.emit('joinedRoom', {
      roomId,
      players: getConnectedPlayers(gameStates[roomId]),
      categories: gameStates[roomId].categories,
      isCreator: true
    });
    
    logEvent({ socket, event: 'createRoom', roomId, message: 'Sala creada', extra: { roomName: newRoom.roomName } });
  });

  // Unirse a una sala existente
  socket.on('joinRoom', ({ roomId, playerName, password }) => {
    if (!checkRateLimit(socket, 'joinRoom', 5, 60_000)) {
      logEvent({ socket, event: 'joinRoom', roomId, level: 'warn', message: 'Rate limit' });
      return socket.emit('error', { message: 'Demasiadas solicitudes para unirse. Intenta más tarde.' });
    }
    playerName = sanitizeName(playerName);
    logEvent({ socket, event: 'joinRoom', roomId, message: `Intento de unirse por ${playerName}` });
    
    const gameState = gameStates[roomId];
    
    // Verificar si la sala existe
    if (!gameState) {
      logEvent({ socket, event: 'joinRoom', roomId, level: 'warn', message: 'Sala no encontrada' });
      return socket.emit('error', { message: 'La sala no existe' });
    }
    
    // Verificar si la sala está llena
    if (gameState.players.length >= gameState.maxPlayers) {
      return socket.emit('error', { message: 'La sala está llena' });
    }
    // Verificar nombre duplicado
    if (isDuplicatePlayer(gameState, playerName)) {
      return socket.emit('error', { message: 'Ya existe un jugador con ese nombre en la sala' });
    }
    
    // Verificar contraseña si es sala privada
    if (gameState.private && gameState.password !== password) {
      return socket.emit('error', { message: 'Contraseña incorrecta' });
    }
    
    // Verificar si el juego ya comenzó
    if (gameState.isPlaying) {
      return socket.emit('error', { message: 'El juego ya ha comenzado' });
    }
    
    // Añadir jugador a la sala
    gameState.players.push({
      id: socket.id,
      name: playerName,
      isCreator: false,
      score: 0,
      ready: false,
      connected: true
    });
    
    // Inicializar puntuaciones
    gameState.scores[playerName] = 0;
    gameState.words[playerName] = {};
    
    // Unir al socket a la sala
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = playerName;
    
    // Actualizar información de la sala en activeRooms
    updateActiveRoomsCount(roomId);
    
    // Notificar a todos los jugadores en la sala sobre el nuevo jugador
    io.to(roomId).emit('playerJoined', {
      player: {
        id: socket.id,
        name: playerName,
        isCreator: false,
        score: 0
      },
      players: getConnectedPlayers(gameState),
      roomId: roomId
    });
    
    // Notificar al jugador que se unió
    socket.emit('joinedRoom', {
      roomId,
      players: getConnectedPlayers(gameState),
      categories: gameState.categories,
      isCreator: false
    });
    
    logEvent({ socket, event: 'joinRoom', roomId, message: `${playerName} unido` });
  });

  // Iniciar el juego - flujo legacy: mostrar ruleta y esperar spinRoulette
  socket.on('startGame', () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    
    if (!gameState) return;
    
    // Verificar si el que inicia es el creador
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isCreator) {
      return socket.emit('error', { message: 'Solo el creador puede iniciar el juego' });
    }
    
    // Iniciar juego mostrando ruleta (sin seleccionar letra aún)
    gameState.isPlaying = true;
    gameState.currentRound = 1;
    gameState.roundPhase = 'roundStart';
    gameState.showRoulette = true;

    io.to(roomId).emit('showRoulette');
    logEvent({ socket, event: 'startGame', roomId, message: 'Juego iniciado - mostrar ruleta' });
  });

  // Girar la ruleta (legacy): compatibilidad, inicia una nueva letra si es host
  socket.on('spinRoulette', () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    if (!gameState || !gameState.isPlaying) return;
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isCreator) {
      return socket.emit('error', { message: 'Solo el creador puede iniciar la ronda' });
    }
    // Si ya estamos escribiendo, ignorar
    if (gameState.roundPhase === 'writing') return;
    
    gameState.roundPhase = 'roundStart';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    gameState.currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    
    io.to(roomId).emit('roundStart', {
      letter: gameState.currentLetter,
      timeLimit: gameState.timeLimit,
      round: gameState.currentRound,
      categories: gameState.categories
    });
    
    // Compatibilidad legacy
    io.to(roomId).emit('rouletteResult', {
      letter: gameState.currentLetter,
      timeLimit: gameState.timeLimit,
      round: gameState.currentRound
    });
    
    gameState.roundPhase = 'writing';
    setTimeout(() => startTimer(roomId), 500);
    logEvent({ socket, event: 'spinRoulette', roomId, message: `Inicio de ronda con letra ${gameState.currentLetter}` });
  });

  // Enviar todas las palabras de la tabla - FORMATO CLÁSICO
  socket.on('submitWords', ({ roomId, playerName, words }) => {
    if (!checkRateLimit(socket, 'submitWords', 3, 20_000)) {
      logEvent({ socket, event: 'submitWords', roomId, level: 'warn', message: 'Rate limit' });
      return socket.emit('error', { message: 'Estás enviando demasiado rápido. Intenta nuevamente.' });
    }
    const gameState = gameStates[roomId];
    
    if (!gameState || !gameState.isPlaying) return;
    // Sanitización básica de tamaño de payload
    const SAFE_MAX = 30;
    function normalizeWord(input) {
      if (typeof input !== 'string') return '';
      let w = input.normalize('NFC').trim().slice(0, SAFE_MAX);
      // Whitelist básico: letras (incluye acentos), espacios y guiones
      w = w.replace(/[^\p{L}\s\-]/gu, '');
      return w;
    }
    Object.keys(words || {}).forEach(cat => {
      if (typeof words[cat] === 'string') {
        words[cat] = normalizeWord(words[cat]);
      }
    });
    
    // Validar y guardar las palabras en formato clásico
    const validatedWords = {};
    const validWords = {};
    
    // Estructura: words = {NOMBRE: 'palabra', ANIMAL: 'palabra', COSA: 'palabra', FRUTA: 'palabra'}
    gameState.categories.forEach((category, index) => {
      const word = words[category] ? words[category].trim() : '';
      
      if (!word) {
        validatedWords[category] = '';
        validWords[category] = false;
      } else {
        // Verificar si la palabra comienza con la letra correcta
        const isValid = word.charAt(0).toUpperCase() === gameState.currentLetter;
        
        validatedWords[category] = word;
        validWords[category] = isValid;
      }
    });
    
    // Guardar las palabras validadas
    gameState.words[playerName] = validatedWords;
    gameState.validWords = gameState.validWords || {};
    gameState.validWords[playerName] = validWords;
    
    // Verificar si todos los jugadores han enviado sus palabras
    const allPlayersSubmitted = gameState.players.every(player => 
      gameState.words[player.name] && Object.keys(gameState.words[player.name]).length > 0
    );
    
    if (allPlayersSubmitted || gameState.timeRemaining <= 0) {
      // Limpiar temporizador
      if (gameState.timer) {
        clearInterval(gameState.timer);
        gameState.timer = null;
      }
      
      // Calcular puntuaciones usando el sistema clásico (flujo legacy directo)
      const scores = calculateClassicScores(gameState);
      
      // Actualizar puntuaciones acumuladas
      Object.keys(scores).forEach(player => {
        const idx = gameState.players.findIndex(p => p.name === player);
        if (idx !== -1) {
          gameState.players[idx].score += scores[player].total;
        }
      });
      
      // Notificar fin de ronda
      io.to(roomId).emit('roundEnded', {
        scores,
        words: gameState.words,
        validWords: gameState.validWords,
        playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })),
        letter: gameState.currentLetter
      });
      
      // ¿Fin de juego o siguiente ronda?
      const isLastRound = (gameState.maxRounds && gameState.currentRound >= gameState.maxRounds);
      if (isLastRound) {
        endGame(roomId);
      } else {
        // Preparar siguiente ronda
        gameState.words = {};
        gameState.validWords = {};
        gameState.currentRound++;
        gameState.timeRemaining = gameState.timeLimit;
        gameState.showRoulette = true;
        // El frontend legacy mostrará la ruleta al próximo startGame/spinRoulette
      }
    }
    
    logEvent({ socket, event: 'submitWords', roomId, message: `${playerName} envió sus palabras` });
  });

  // Marcar jugador como listo para la siguiente ronda
  socket.on('playerReady', () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    
    if (!gameState) return;
    
    // Marcar jugador como listo
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      gameState.players[playerIndex].ready = true;
    }
    
    // Verificar si todos están listos
    const allReady = gameState.players.every(p => p.ready);
    if (allReady) {
      // Calcular puntuaciones de la ronda
      calculateScores(roomId);
      
      // Preparar siguiente ronda
      gameState.currentRound++;
      gameState.players.forEach(p => p.ready = false);
      
      // Seleccionar nueva letra
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      gameState.currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      
      // Notificar a todos los jugadores
      io.to(roomId).emit('newRound', {
        letter: gameState.currentLetter,
        timeLimit: gameState.timeLimit,
        round: gameState.currentRound,
        scores: gameState.scores
      });
      
      // Iniciar temporizador
      startTimer(roomId);
    }
  });

  // Votación durante la fase de revisión
  socket.on('castVote', ({ roomId, voterName, targetPlayer, category, decision }) => {
    const gameState = gameStates[roomId];
    if (!gameState || gameState.roundPhase !== 'review') return;
    const voter = (voterName || socket.playerName || '').trim();
    const target = (targetPlayer || '').trim();
    const cat = (category || '').trim();
    const dec = decision === 'invalid' ? 'invalid' : 'valid';
    
    if (!voter || !target || !cat) return;
    if (voter.toLowerCase() === target.toLowerCase()) return; // No auto-voto
    
    if (!gameState.votes[target]) gameState.votes[target] = {};
    if (!gameState.votes[target][cat]) gameState.votes[target][cat] = { valid: new Set(), invalid: new Set() };
    
    // Quitar de ambos y agregar al elegido
    gameState.votes[target][cat].valid.delete(voter);
    gameState.votes[target][cat].invalid.delete(voter);
    gameState.votes[target][cat][dec].add(voter);
    
    // Broadcast liviano (sin revelar votos detallados si no se desea)
    io.to(roomId).emit('voteUpdate', {
      targetPlayer,
      category,
      validCount: gameState.votes[target][cat].valid.size,
      invalidCount: gameState.votes[target][cat].invalid.size
    });
    
    logEvent({ socket, event: 'castVote', roomId, message: `Voto ${dec} de ${voter} sobre ${target}/${cat}` });
  });
  
  // Avanzar a la siguiente ronda (host) tras revisión
  socket.on('nextRound', ({ roomId, resolutions = {} }) => {
    const gameState = gameStates[roomId];
    if (!gameState || !gameState.isPlaying) return;
    
    // Solo el host puede avanzar
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isCreator) {
      return socket.emit('error', { message: 'Solo el anfitrión puede avanzar a la siguiente ronda' });
    }
    
    // Consolidar validez por votos (mayoría simple; en empate, usar resoluciones del host si existen; si no, válida por defecto)
    const finalValid = {};
    const categories = gameState.categories || [];
    
    Object.keys(gameState.words || {}).forEach(playerName => {
      finalValid[playerName] = finalValid[playerName] || {};
      categories.forEach(cat => {
        const word = (gameState.words[playerName] && gameState.words[playerName][cat]) || '';
        if (!word) { finalValid[playerName][cat] = false; return; }
        
        // Primero: si no empieza por la letra, inválida
        const isLetterValid = word.charAt(0).toUpperCase() === gameState.currentLetter;
        if (!isLetterValid) { finalValid[playerName][cat] = false; return; }
        
        const voteBucket = (gameState.votes[playerName] && gameState.votes[playerName][cat]) || { valid: new Set(), invalid: new Set() };
        // Convertir a números (si vinieran serializados previamente)
        const validCount = (voteBucket.valid instanceof Set) ? voteBucket.valid.size : Array.isArray(voteBucket.valid) ? voteBucket.valid.length : 0;
        const invalidCount = (voteBucket.invalid instanceof Set) ? voteBucket.invalid.size : Array.isArray(voteBucket.invalid) ? voteBucket.invalid.length : 0;
        
        if (validCount > invalidCount) {
          finalValid[playerName][cat] = true;
        } else if (invalidCount > validCount) {
          finalValid[playerName][cat] = false;
        } else {
          // Empate: usar resolución del host si se proporcionó; de lo contrario, válida por defecto
          const key = `${playerName}:${cat}`;
          if (resolutions && Object.prototype.hasOwnProperty.call(resolutions, key)) {
            finalValid[playerName][cat] = !!resolutions[key];
          } else {
            finalValid[playerName][cat] = true;
          }
        }
      });
    });
    
    // Persistir validez final y emitir evento de cierre de revisión
    gameState.validWords = finalValid;
    io.to(roomId).emit('reviewEnded', {
      round: gameState.currentRound,
      letter: gameState.currentLetter,
      validWords: finalValid
    });
    
    // Calcular puntuaciones con validez final
    const scores = calculateClassicScores(gameState);
    Object.keys(scores).forEach(name => {
      const idx = gameState.players.findIndex(p => p.name === name);
      if (idx !== -1) gameState.players[idx].score += scores[name].total;
    });
    
    // Notificar fin de ronda (resultados)
    io.to(roomId).emit('roundEnded', {
      scores,
      words: gameState.words,
      validWords: gameState.validWords,
      playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })),
      letter: gameState.currentLetter
    });
    
    // Preparar siguiente ronda o finalizar
    gameState.words = {};
    gameState.votes = {};
    gameState.roundPhase = 'results';
    gameState.currentRound++;
    gameState.timeRemaining = gameState.timeLimit;
    gameState.timerEndsAt = null;
    
    if (gameState.currentRound > (gameState.maxRounds || 5)) {
      gameState.isPlaying = false;
      gameState.roundPhase = 'ended';
      io.to(roomId).emit('gameEnded', {
        results: gameState.players.map(p => ({ name: p.name, score: p.score }))
      });
      return;
    }
    
    // Iniciar siguiente ronda automáticamente con nueva letra
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    gameState.currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    gameState.roundPhase = 'roundStart';
    
    io.to(roomId).emit('roundStart', {
      letter: gameState.currentLetter,
      timeLimit: gameState.timeLimit,
      round: gameState.currentRound,
      categories: gameState.categories
    });
    
    // Compatibilidad legacy
    io.to(roomId).emit('rouletteResult', {
      letter: gameState.currentLetter,
      timeLimit: gameState.timeLimit,
      round: gameState.currentRound
    });
    
    gameState.roundPhase = 'writing';
    setTimeout(() => startTimer(roomId), 500);
  });
  
  // Manejar desconexión
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    const playerName = socket.playerName;

    if (!roomId || !gameStates[roomId]) {
      logEvent({ socket, event: 'disconnect', level: 'info', message: 'Cliente desconectado (sin sala)' });
      return;
    }

    const gameState = gameStates[roomId];
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id || p.name === playerName);

    if (playerIndex === -1) {
      logEvent({ socket, event: 'disconnect', level: 'info', message: 'Cliente desconectado (jugador no encontrado)' });
      return;
    }

    const player = gameState.players[playerIndex];
    const wasCreator = !!player.isCreator;

    // Marcar como desconectado y preparar período de gracia
    player.connected = false;
    player.id = null;
    player.disconnectedAt = Date.now();

    updateActiveRoomsCount(roomId);

    // Programar desconexión definitiva tras período de gracia
    const key = `${roomId}:${playerName}`;
    if (disconnectTimers.has(key)) {
      clearTimeout(disconnectTimers.get(key));
      disconnectTimers.delete(key);
    }

    const timeoutId = setTimeout(() => {
      const gs = gameStates[roomId];
      if (!gs) return;

      const idx = gs.players.findIndex(p => p.name === playerName);
      if (idx === -1) return;

      const wasCreatorFinal = !!gs.players[idx].isCreator;

      // Si el juego no está en curso, eliminamos definitivamente al jugador
      if (!gs.isPlaying) {
        gs.players.splice(idx, 1);
      }

      // Reasignar creador si aplica
      if (wasCreatorFinal) {
        const next = getConnectedPlayers(gs)[0];
        if (next) {
          next.isCreator = true;
          gs.creator = next.name;
          if (next.id) io.to(gs.players.find(p => p.name === next.name)?.id || next.id).emit('youAreCreator');
        }
      }

      updateActiveRoomsCount(roomId);

      // Notificar a los demás jugadores de forma definitiva
      if (gameStates[roomId]) {
        io.to(roomId).emit('playerLeft', {
          playerName,
          players: getConnectedPlayers(gs)
        });
      }

      // Eliminar sala si está vacía (sin conectados) y no está en juego
      if (!gs.isPlaying && getConnectedPlayers(gs).length === 0) {
        setTimeout(() => {
          const ref = gameStates[roomId];
          if (ref && getConnectedPlayers(ref).length === 0) {
            delete gameStates[roomId];
            const roomIndex = activeRooms.findIndex(room => room.roomId === roomId);
            if (roomIndex !== -1) {
              activeRooms.splice(roomIndex, 1);
            }
            console.log(`Sala ${roomId} eliminada después de 5 minutos sin jugadores`);
          }
        }, 5 * 60 * 1000);
      }

      disconnectTimers.delete(key);
    }, GRACE_PERIOD_MS);

    disconnectTimers.set(key, timeoutId);

    logEvent({ socket, event: 'disconnect', level: 'info', message: 'Cliente desconectado (período de gracia iniciado)' });
  });
});

 // Función para finalizar el juego y emitir resultados
function endGame(roomId) {
  const gameState = gameStates[roomId];
  if (!gameState) return;
  gameState.isPlaying = false;
  if (gameState.timer) {
    clearInterval(gameState.timer);
    gameState.timer = null;
  }
  const results = (gameState.players || []).map(p => ({ name: p.name, score: p.score || 0 }));
  io.to(roomId).emit('gameEnded', { results });
}

// Función para iniciar el temporizador
function startTimer(roomId) {
  const gameState = gameStates[roomId];
  if (!gameState) return;
  
  // Limpiar temporizador anterior si existe
  if (gameState.timer) {
    clearInterval(gameState.timer);
  }
  
  gameState.timeRemaining = gameState.timeLimit;
  gameState.timerEndsAt = Date.now() + gameState.timeLimit * 1000;
  
  // Notificar tiempo inicial
  io.to(roomId).emit('timerUpdate', { timeRemaining: gameState.timeRemaining, serverTime: Date.now(), endsAt: gameState.timerEndsAt });
  
  // Iniciar nuevo temporizador (servidor como fuente de verdad)
  gameState.timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((gameState.timerEndsAt - Date.now()) / 1000));
    gameState.timeRemaining = remaining;
    
    // Notificar actualización de tiempo
    io.to(roomId).emit('timerUpdate', { timeRemaining: gameState.timeRemaining, serverTime: Date.now(), endsAt: gameState.timerEndsAt });
    
    // Si se acabó el tiempo
    if (remaining <= 0) {
      clearInterval(gameState.timer);
      gameState.timer = null;
      
      // Fin del tiempo: puntuar directamente (flujo legacy)
      if (gameState.isPlaying) {
        const scores = calculateClassicScores(gameState);
        Object.keys(scores).forEach(player => {
          const idx = gameState.players.findIndex(p => p.name === player);
          if (idx !== -1) {
            gameState.players[idx].score += scores[player].total;
          }
        });
        
        io.to(roomId).emit('roundEnded', {
          scores,
          words: gameState.words,
          validWords: gameState.validWords,
          playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })),
          letter: gameState.currentLetter
        });
        
        // ¿Fin de juego o siguiente ronda?
        const isLastRound = (gameState.maxRounds && gameState.currentRound >= gameState.maxRounds);
        if (isLastRound) {
          endGame(roomId);
          gameState.timerEndsAt = null;
        } else {
          gameState.words = {};
          gameState.validWords = {};
          gameState.currentRound++;
          gameState.timeRemaining = gameState.timeLimit;
          gameState.timerEndsAt = null;
          gameState.showRoulette = true;
        }
      } else {
        gameState.timerEndsAt = null;
      }
    }
  }, 1000);
}

// Función para calcular puntuaciones
function calculateScores(roomId) {
  const gameState = gameStates[roomId];
  if (!gameState) return;
  
  // Para cada categoría, verificar palabras únicas y asignar puntos
  gameState.categories.forEach(category => {
    // Recopilar todas las palabras para esta categoría
    const allWords = {};
    
    // Contar ocurrencias de cada palabra
    Object.keys(gameState.words).forEach(playerName => {
      const playerWords = gameState.words[playerName][category] || [];
      playerWords.forEach(word => {
        const normalizedWord = word.toLowerCase().trim();
        if (!allWords[normalizedWord]) {
          allWords[normalizedWord] = [];
        }
        allWords[normalizedWord].push(playerName);
      });
    });
    
    // Asignar puntos
    Object.keys(allWords).forEach(word => {
      const players = allWords[word];
      
      // Palabra válida (comienza con la letra correcta)
      if (word.charAt(0).toUpperCase() === gameState.currentLetter) {
        // Palabra única: 10 puntos
        if (players.length === 1) {
          gameState.scores[players[0]] += 10;
        }
        // Palabra repetida: 5 puntos
        else {
          players.forEach(playerName => {
            gameState.scores[playerName] += 5;
          });
        }
      }
    });
  });
}

// Función para validar palabra contra regla
function validateWordAgainstRule(word, rule) {
  word = word.toLowerCase();
  
  if (rule.includes('Contiene la A') && !word.includes('a')) {
    return false;
  } else if (rule.includes('Empieza por S') && !word.startsWith('s')) {
    return false;
  } else if (rule.includes('Acaba en N') && !word.endsWith('n')) {
    return false;
  } else if (rule.includes('Contiene la R') && !word.includes('r')) {
    return false;
  } else if (rule.includes('Empieza por L') && !word.startsWith('l')) {
    return false;
  } else if (rule.includes('Acaba por O') && !word.endsWith('o')) {
    return false;
  } else if (rule.includes('Contiene la U') && !word.includes('u')) {
    return false;
  } else if (rule.includes('Empieza por C') && !word.startsWith('c')) {
    return false;
  }
  
  return true;
}

// Función para contar sílabas en español
function countSyllables(word) {
  word = word.toLowerCase();
  if (!word) return 0;
  
  const vowels = ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü'];
  let syllables = 0;
  let prevIsVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevIsVowel) {
      syllables++;
    }
    prevIsVowel = isVowel;
  }
  
  return syllables || 1; // Mínimo 1 sílaba
}

// Función para calcular puntuaciones con el sistema clásico
function calculateClassicScores(gameState) {
  const playerScores = {};
  const wordCounts = {};
  
  // Inicializar puntuaciones para cada jugador
  Object.keys(gameState.words).forEach(player => {
    playerScores[player] = { repetidas: 0, sinRepetir: 0, masDeTresSilabas: 0, total: 0 };
  });
  
  // Contar palabras por categoría
  gameState.categories.forEach(category => {
    wordCounts[category] = {};
    
    // Contar palabras de cada jugador para esta categoría
    Object.keys(gameState.words).forEach(player => {
      const word = gameState.words[player][category];
      if (!word) return;
      
      const normalizedWord = word.toLowerCase().trim();
      
      // Solo contar palabras válidas (que empiecen con la letra correcta)
      if (gameState.validWords[player] && gameState.validWords[player][category]) {
        if (!wordCounts[category][normalizedWord]) {
          wordCounts[category][normalizedWord] = [];
        }
        wordCounts[category][normalizedWord].push(player);
      }
    });
  });
  
  // Calcular puntuaciones
  Object.keys(wordCounts).forEach(category => {
    Object.keys(wordCounts[category]).forEach(word => {
      const players = wordCounts[category][word];
      const isRepeated = players.length > 1;
      const hasManyVowels = countSyllables(word) > 3;
      
      players.forEach(player => {
        if (isRepeated) {
          playerScores[player].repetidas += 1;
        } else {
          playerScores[player].sinRepetir += 1;
        }
        
        if (hasManyVowels) {
          playerScores[player].masDeTresSilabas += 1;
        }
      });
    });
  });
  
  // Calcular totales
  Object.keys(playerScores).forEach(player => {
    playerScores[player].total = 
      playerScores[player].repetidas + 
      (playerScores[player].sinRepetir * 2) + 
      (playerScores[player].masDeTresSilabas * 3);
  });
  
  return playerScores;
}

// Nueva función para calcular puntuaciones con el sistema de reglas
function calculateNewScores(gameState) {
  const playerScores = {};
  const wordCounts = {};
  
  // Inicializar puntuaciones para cada jugador
  Object.keys(gameState.words).forEach(player => {
    playerScores[player] = { repetidas: 0, sinRepetir: 0, masDeTresSilabas: 0, total: 0 };
  });
  
  // Contar palabras por regla y categoría
  for (let ruleIndex = 0; ruleIndex < gameState.rules.length; ruleIndex++) {
    for (let catIndex = 0; catIndex < gameState.categories.length; catIndex++) {
      const key = `${ruleIndex}-${catIndex}`;
      wordCounts[key] = {};
      
      // Contar palabras de cada jugador
      Object.keys(gameState.words).forEach(player => {
        if (!gameState.words[player][ruleIndex] || !gameState.words[player][ruleIndex][catIndex]) return;
        
        const word = gameState.words[player][ruleIndex][catIndex].toLowerCase().trim();
        if (!word) return;
        
        // Solo contar palabras válidas
        if (gameState.validWords[player] && gameState.validWords[player][ruleIndex] && 
            gameState.validWords[player][ruleIndex][catIndex]) {
          
          if (!wordCounts[key][word]) {
            wordCounts[key][word] = [];
          }
          
          wordCounts[key][word].push(player);
        }
      });
    }
  }
  
  // Calcular puntuaciones
  Object.keys(wordCounts).forEach(key => {
    Object.keys(wordCounts[key]).forEach(word => {
      const players = wordCounts[key][word];
      const isRepeated = players.length > 1;
      const hasManyVowels = countSyllables(word) > 3;
      
      players.forEach(player => {
        if (isRepeated) {
          playerScores[player].repetidas += 1;
        } else {
          playerScores[player].sinRepetir += 1;
        }
        
        if (hasManyVowels) {
          playerScores[player].masDeTresSilabas += 1;
        }
      });
    });
  });
  
  // Calcular totales
  Object.keys(playerScores).forEach(player => {
    playerScores[player].total = 
      playerScores[player].repetidas + 
      (playerScores[player].sinRepetir * 2) + 
      (playerScores[player].masDeTresSilabas * 3);
  });
  
  return playerScores;
}

// Función para generar ID de sala
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

app.get('/activeRooms', (req, res) => {
    res.json(activeRooms); // Devolver la lista de salas activas
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Detectar entorno de tests de forma robusta (Jest o npm test)
const IS_TEST_ENV = !!process.env.JEST_WORKER_ID || process.env.npm_lifecycle_event === 'test';

// Solo levantar servidor fuera de tests y si no está ya escuchando
if (!IS_TEST_ENV && !server.listening) {
  try {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor escuchando en:`);
      console.log(`- Local: http://localhost:${PORT}`);
      console.log(`- Red: http://192.168.1.XXX:${PORT}`);
      console.log(`Usa 'ipconfig' (Windows) o 'ifconfig' (Mac/Linux) para ver tu IP local`);
    });
  } catch (e) {
    if (e && e.code === 'EADDRINUSE') {
      console.warn(`Puerto ${PORT} en uso; usando instancia existente.`);
    } else {
      throw e;
    }
  }
}

// Export para pruebas
module.exports = { server, io };
