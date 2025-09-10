
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
// MongoDB removido para compatibilidad con Render
const mongoose = require('mongoose');

// Cargar variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones optimizadas para Render (sin MongoDB)
let sessionConfig = {
  secret: process.env.SESSION_SECRET || 'tutifruti_secret_key',
  resave: true, // Cambiar a true para mejor compatibilidad
  saveUninitialized: true, // Cambiar a true para evitar problemas
  cookie: { 
    secure: false, // false en Render para compatibilidad
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000, // 2 horas (más corto para memoria)
    sameSite: 'lax'
  },
  name: 'tutifruti.sid',
  rolling: true
};

// SOLUCIÓN PARA RENDER: No usar MongoDB, solo configuración mejorada
console.log('🚀 Configurando servidor para entorno de producción (sin MongoDB)');
console.log('📊 Usando configuración robusta de sesiones en memoria');

const sessionMiddleware = session(sessionConfig);

app.use(sessionMiddleware);

// Sistema de limpieza automática de sesiones (cada 5 minutos)
setInterval(() => {
  try {
    // Limpiar sesiones expiradas
    if (sessionMiddleware.store && sessionMiddleware.store.all) {
      sessionMiddleware.store.all((err, sessions) => {
        if (!err && sessions) {
          const now = Date.now();
          Object.keys(sessions).forEach(sessionId => {
            const session = sessions[sessionId];
            if (session && session.cookie && session.cookie.expires) {
              if (new Date(session.cookie.expires) < now) {
                sessionMiddleware.store.destroy(sessionId);
              }
            }
          });

        }
      });
    }
  } catch (error) {
    // Ignorar errores de limpieza
  }
}, 5 * 60 * 1000); // 5 minutos

// Crear servidor HTTP y Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // En producción, limitar a dominios específicos
    methods: ['GET', 'POST']
  },
  // Configuración optimizada para Render
  pingTimeout: 30000, // 30 segundos (más corto)
  pingInterval: 15000, // 15 segundos (más frecuente)
  transports: ['websocket', 'polling'], // Permitir ambos transportes
  allowEIO3: true,
  maxHttpBufferSize: 512000 // 512KB buffer (más pequeño)
});

// Compartir sesión entre Express y Socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Middleware para manejar reconexiones robustas
io.use((socket, next) => {
  // Agregar timestamp de conexión
  socket.connectedAt = Date.now();
  
  // Log de conexión
  console.log(`🔌 [SOCKET] Nuevo cliente conectado: ${socket.id}`);
  console.log(`🔌 [SOCKET] Headers:`, socket.request.headers);
  console.log(`🔌 [SOCKET] Transport:`, socket.conn.transport.name);
  
  next();
});

// Estructura de datos para el juego
let activeRooms = [];
let gameStates = {};

// Mapa de timers de desconexión con período de gracia por jugador
const disconnectTimers = new Map(); // key: `${roomId}:${playerName}` -> timeout id
const GRACE_PERIOD_MS = 15000;
const REVIEW_TIME_MS = 20000; // Duración de la fase de revisión/votación

// Sistema de heartbeat optimizado para Render
const heartbeatIntervals = new Map(); // key: socket.id -> interval id
const HEARTBEAT_INTERVAL = 45000; // 45 segundos (menos agresivo)

// Helpers de conteo de conectados y actualización de sala
function getConnectedPlayers(gameState) {
  return (gameState.players || []).filter(p => p.connected === true);
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

// Logging mejorado para diagnóstico
function logEvent({ socket, event, roomId = null, level = 'info', message = '', error = null, extra = {} }) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    roomId: roomId || socket?.roomId || null,
    socketId: socket?.id,
    message,
    error: error ? String(error) : undefined,
    memoryUsage: process.memoryUsage(),
    ...extra
  };
  
  // Log detallado para errores
  if (level === 'error') {
    console.error(`❌ [${event}] ${message}`, error || '');
  } else if (level === 'warn') {
    console.warn(`⚠️ [${event}] ${message}`);
  } else {
    console.log(`ℹ️ [${event}] ${message}`);
  }
  
  // Log estructurado para análisis
  console.log(JSON.stringify(payload));
}

// Servir archivos estáticos (orden importante)
app.use('/public', express.static(__dirname + '/public'));
app.use('/utils', express.static(__dirname + '/utils'));
app.use('/views', express.static(__dirname + '/views'));
app.use('/', express.static(__dirname)); // raíz para index.html

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    socketConnections: io.engine.clientsCount
  });
});

// Socket.IO status endpoint
app.get('/socket-status', (req, res) => {
  res.json({
    socketIO: {
      connected: true,
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 15000
    },
    server: {
      timestamp: new Date().toISOString(),
      activeRooms: activeRooms.length,
      gameStates: Object.keys(gameStates).length
    }
  });
});

// Ruta explícita para vistas HTML para evitar duplicaciones o 404
app.get(['/views/create-room.html', '/views/join-room.html', '/views/game.html', '/views/review.html', '/views/results.html'], (req, res) => {
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
    // Categorías expandidas para grid 4x3 (12 total) – configurables por sala en el futuro
    categories: ['NOMBRE', 'ANIMAL', 'COSA', 'FRUTA', 'PAIS', 'COLOR', 'COMIDA', 'CIUDAD', 'PROFESION', 'MARCA', 'DEPORTE', 'PELICULA'],
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
    reviewData: null, // se inicializa al entrar en revisión
    creator: null,
    private: false,
    password: null,
    // Props legacy eliminadas - no más ruleta
  };
};

// Manejador de errores global para Socket.IO
io.engine.on('connection_error', (err) => {
  console.error('❌ [SOCKET.IO] Error de conexión:', err);
});

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('🔌 [CONNECTION] Nuevo cliente conectado:', socket.id);
  console.log('🔌 [CONNECTION] Transport usado:', socket.conn.transport.name);
  console.log('🔌 [CONNECTION] Headers de conexión:', Object.keys(socket.request.headers));
  
  // Configurar heartbeat para este socket
  const heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', { timestamp: Date.now() });
    } else {
      clearInterval(heartbeatInterval);
      heartbeatIntervals.delete(socket.id);
    }
  }, HEARTBEAT_INTERVAL);
  
  heartbeatIntervals.set(socket.id, heartbeatInterval);
  
  // Enviar la lista de salas activas al nuevo cliente
  socket.emit('activeRooms', activeRooms);
  
  // Manejar heartbeat del cliente
  socket.on('heartbeat_ack', (data) => {
    // Cliente respondió al heartbeat, conexión está activa
    socket.lastHeartbeat = Date.now();
  });
  
  // Manejar errores del socket
  socket.on('error', (error) => {
    console.error('❌ [SOCKET] Error en socket:', socket.id, error);
  });
  
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
    
    // Si estamos en fase de revisión, enviar datos de revisión
    if (gameState.roundPhase === 'review' && gameState.reviewData) {
      console.log('📊 [getRoomState] Enviando datos de revisión:', {
        roomId,
        playersCount: gameState.players.length,
        reviewData: !!gameState.reviewData,
        words: Object.keys(gameState.words || {}),
        categories: gameState.categories?.length || 0
      });
      
      socket.emit('reviewData', {
        roomId: gameState.roomId,
        round: gameState.currentRound,
        letter: gameState.currentLetter,
        players: gameState.players.map(player => ({
          name: player.name,
          id: player.id,
          words: gameState.categories.map(category => ({
            category,
            word: gameState.words[player.name]?.[category] || '',
            isValid: gameState.validWords[player.name]?.[category] !== false
          }))
        })),
        currentPlayerIndex: gameState.reviewData.currentPlayerIndex || 0,
        voteProgress: gameState.reviewData.voteProgress || {},
        phase: 'voting'
      });
    } else {
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
    }
    
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

    // Si estamos en fase de revisión, enviar datos de revisión
    if (gameState.roundPhase === 'review' && gameState.reviewData) {
      socket.emit('startReview', {
        round: gameState.currentRound,
        letter: gameState.currentLetter,
        message: 'Reconectado durante revisión. Continuando...',
        reviewUrl: `/views/review.html?roomId=${roomId}`
      });
    } else {
      // Enviar estado actual de la sala
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
    }
    logEvent({ socket, event: 'reconnectPlayer', roomId, message: 'Re-conectado y estado enviado' });
  });

  // Crear una nueva sala
  socket.on('createRoom', ({ playerName, roomName, maxPlayers, isPrivate, password, rounds, categoriesCount, timeLimit, reviewTime }) => {
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
    // Configurar cantidad de categorías (4..12)
    const DEFAULT_CATS = ['NOMBRE', 'ANIMAL', 'COSA', 'FRUTA', 'PAIS', 'COLOR', 'COMIDA', 'CIUDAD', 'PROFESION', 'MARCA', 'DEPORTE', 'PELICULA'];
    const parsedCatCount = (typeof categoriesCount === 'number' && isFinite(categoriesCount)) ? Math.floor(categoriesCount) : NaN;
    const catCount = (!isNaN(parsedCatCount) ? Math.max(4, Math.min(12, parsedCatCount)) : DEFAULT_CATS.length);
    gameStates[roomId].categories = DEFAULT_CATS.slice(0, catCount);
    // Configurar tiempos
    const parsedTimeLimit = (typeof timeLimit === 'number' && isFinite(timeLimit)) ? Math.floor(timeLimit) : NaN;
    gameStates[roomId].timeLimit = (!isNaN(parsedTimeLimit) ? Math.max(20, Math.min(180, parsedTimeLimit)) : 60);
    gameStates[roomId].timeRemaining = gameStates[roomId].timeLimit;
    const parsedReview = (typeof reviewTime === 'number' && isFinite(reviewTime)) ? Math.floor(reviewTime) : NaN;
    gameStates[roomId].reviewDuration = (!isNaN(parsedReview) ? Math.max(15, Math.min(180, parsedReview)) : Math.floor(REVIEW_TIME_MS / 1000));
    
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

  // Iniciar el juego - NUEVO FLUJO: auto-letter inmediata sin ruleta
  socket.on('startGame', () => {
    const roomId = socket.roomId;
    const gameState = gameStates[roomId];
    
    if (!gameState) return;
    
    // Verificar si el que inicia es el creador
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isCreator) {
      return socket.emit('error', { message: 'Solo el creador puede iniciar el juego' });
    }
    
    // NUEVA LÓGICA: Auto-letter generación inmediata
    gameState.isPlaying = true;
    gameState.currentRound = 1;
    gameState.roundPhase = 'writing';
    gameState.gameStartedAt = Date.now(); // Para estadísticas
    
    // FASE 4: Generar letra con sistema de racha
    const letterData = generateLetterWithHistory(gameState);
      
    // Emitir a todos en la sala, asegurando que el host también lo reciba
    const roundPayload = {
      letter: letterData.letter,
      timeLimit: gameState.timeLimit,
      streakBonuses: letterData.streakBonuses,
      letterHistory: letterData.letterHistory,
      isRare: letterData.isRare,
      isMedium: letterData.isMedium,
      round: gameState.currentRound,
      categories: gameState.categories
    };

    // Envío robusto: uno para el resto, y uno explícito para el host
    socket.broadcast.to(roomId).emit('roundStart', roundPayload);
    socket.emit('roundStart', roundPayload);
    
    // Iniciar temporizador inmediatamente
    setTimeout(() => startTimer(roomId), 500);
    
    logEvent({ socket, event: 'startGame', roomId, message: `Juego iniciado con letra ${gameState.currentLetter}` });
  });

  // ELIMINADO: spinRoulette ya no es necesario - auto-letter en startGame

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
      
      // NUEVA LÓGICA: Iniciar fase de revisión social
      gameState.roundPhase = 'review';
      gameState.timerEndsAt = null;
      
      // Configurar datos de revisión
      const reviewSeconds = gameState.reviewDuration || 60;
      gameState.reviewData = {
        votes: {},
        currentPlayerIndex: 0,
        reviewPhase: 'voting',
        consensusReached: {},
        timeRemaining: reviewSeconds,
        reviewStartedAt: Date.now(),
        confirmedBy: new Set(),
        intervalId: null
      };
      // Iniciar temporizador de revisión (auto-confirm a los X segundos)
      if (gameState.reviewData.intervalId) {
        clearInterval(gameState.reviewData.intervalId);
      }
      gameState.reviewEndsAt = Date.now() + reviewSeconds * 1000;
      gameState.reviewData.intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.floor((gameState.reviewEndsAt - Date.now()) / 1000));
        gameState.reviewData.timeRemaining = remaining;
        if (remaining <= 0) {
          clearInterval(gameState.reviewData.intervalId);
          gameState.reviewData.intervalId = null;
          // Auto-confirmación al expirar el temporizador
          finishReviewAutomatically(roomId);
        }
      }, 1000);
      
      // Encontrar el primer jugador con palabras para comenzar
      let startPlayerIndex = 0;
      for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        if (gameState.words[player.name] && Object.keys(gameState.words[player.name]).length > 0) {
          startPlayerIndex = i;
          break;
        }
      }
      gameState.reviewData.currentPlayerIndex = startPlayerIndex;
      
      // Notificar a todos los clientes que comienza la revisión
      io.to(roomId).emit('startReview', {
        round: gameState.currentRound,
        letter: gameState.currentLetter,
        message: '¡Hora de revisar las palabras! Redirigiéndote...',
        reviewUrl: `/views/review.html?roomId=${roomId}`
      });
      
      // Debug: verificar estado de la sala
      console.log(`🔍 [DEBUG] Sala ${roomId} en revisión:`, {
        players: gameState.players.length,
        connected: getConnectedPlayers(gameState).length,
        isPlaying: gameState.isPlaying,
        roundPhase: gameState.roundPhase
      });
      
      logEvent({ event: 'startReview', roomId, message: `Iniciada revisión para ronda ${gameState.currentRound}` });
      
      // La lógica de fin de juego/siguiente ronda ahora se maneja después de la revisión social
      // Todo el flujo continúa desde finishReview() después de la votación
    }
    
    logEvent({ socket, event: 'submitWords', roomId, message: `${playerName} envió sus palabras` });
  });

  // Forzar fin de ronda cuando alguien presiona ¡BASTA!
  socket.on('forceEndRound', ({ roomId, playerName }) => {
    const gameState = gameStates[roomId];
    if (!gameState || !gameState.isPlaying) return;

    console.log(`🔥 ${playerName} presionó ¡BASTA! - forzando fin de ronda`);
    
    // Limpiar temporizador inmediatamente
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }
    
    // Configurar para iniciar revisión inmediatamente
    gameState.roundPhase = 'review';
    gameState.timerEndsAt = null;
    
    // Notificar a todos los clientes que comienza la revisión
    io.to(roomId).emit('startReview', {
      round: gameState.currentRound,
      letter: gameState.currentLetter,
      message: `¡${playerName} ha terminado! Iniciando revisión...`,
      reviewUrl: `/views/review.html?roomId=${roomId}`
    });
    
    logEvent({ socket, event: 'forceEndRound', roomId, message: `${playerName} forzó fin de ronda` });
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
      
      // FASE 4: Generar letra con sistema de racha
      const letterData = generateLetterWithHistory(gameState);
      
      // Notificar a todos los jugadores
      io.to(roomId).emit('newRound', {
        letter: letterData.letter,
        timeLimit: gameState.timeLimit,
        streakBonuses: letterData.streakBonuses,
        letterHistory: letterData.letterHistory,
        isRare: letterData.isRare,
        isMedium: letterData.isMedium,
        round: gameState.currentRound,
        scores: gameState.scores
      });
      
      // Iniciar temporizador
      startTimer(roomId);
    }
  });

  // Votación durante la fase de revisión - ELIMINADO (implementación duplicada)
  
  // Avanzar a la siguiente ronda (host) tras revisión
  socket.on('nextRound', ({ roomId, resolutions = {} }) => {
    const gameState = gameStates[roomId];
    if (!gameState || !gameState.isPlaying) return;
    
    // Solo el host puede avanzar
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !player.isCreator) {
      return socket.emit('error', { message: 'Solo el anfitrión puede avanzar a la siguiente ronda' });
    }
    
    // Consolidación puede reutilizar la misma función de finalizeReview
    const finalValid = consolidateVotes(gameState, resolutions);
    
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
    
    // FASE 4: Iniciar siguiente ronda automáticamente con nueva letra
    const letterData = generateLetterWithHistory(gameState);
    gameState.roundPhase = 'roundStart';
    
    io.to(roomId).emit('roundStart', {
      letter: letterData.letter,
      timeLimit: gameState.timeLimit,
      streakBonuses: letterData.streakBonuses,
      letterHistory: letterData.letterHistory,
      isRare: letterData.isRare,
      isMedium: letterData.isMedium,
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

  // =============================================
  // SISTEMA DE REVISIÓN SOCIAL Y VOTACIÓN
  // =============================================

  // Unirse a sala de revisión
  socket.on('joinReviewRoom', ({ roomId }) => {
    try {
      const gameState = gameStates[roomId];
      if (!gameState) {
        return socket.emit('reviewError', { message: 'Sala no encontrada' });
      }

      const player = gameState.players.find(p => p.id === socket.id);
      if (!player) {
        return socket.emit('reviewError', { message: 'Jugador no encontrado en la sala' });
      }

      // Unirse a sala de revisión
      // Ya están en la sala principal roomId, no necesitan sala separada

      // Preparar datos de revisión si no existen
      if (!gameState.reviewData) {
        gameState.reviewData = {
          votes: {}, // { wordId: { playerId: 'approve'|'reject' } }
          currentPlayerIndex: 0,
          reviewPhase: 'voting', // voting | results
          consensusReached: {},
          timeRemaining: 60,
          reviewStartedAt: Date.now()
        };
      }

      // Enviar datos de revisión al cliente
      socket.emit('reviewData', {
        roomId,
        round: gameState.currentRound,
        letter: gameState.currentLetter,
        players: gameState.players,
        allWords: gameState.words,
        votes: gameState.reviewData.votes,
        currentPlayerIndex: gameState.reviewData.currentPlayerIndex,
        timeRemaining: gameState.reviewData.timeRemaining,
        phase: gameState.reviewData.reviewPhase,
        stats: calculateReviewStats(gameState)
      });

      logEvent({ socket, event: 'joinReviewRoom', roomId, message: `${player.name} se unió a revisión` });
    } catch (error) {
      console.error('[ReviewRoom] Error:', error);
      socket.emit('reviewError', { message: 'Error interno del servidor' });
    }
  });

  // El antiguo manejador de 'castVote' fue eliminado para evitar conflictos con el nuevo flujo de votación.

  // Saltar jugador actual (solo host)
  socket.on('skipCurrentPlayer', ({ roomId }) => {
    try {
      const gameState = gameStates[roomId];
      if (!gameState || !gameState.reviewData) return;

      const player = gameState.players.find(p => p.id === socket.id);
      if (!player?.isCreator) {
        return socket.emit('reviewError', { message: 'Solo el host puede saltar jugadores' });
      }

      advanceToNextPlayer(roomId);
    } catch (error) {
      console.error('[SkipCurrentPlayer] Error:', error);
    }
  });

  // Confirmación por jugador: cerrar revisión cuando todos confirmen o esperar timeout
  socket.on('confirmReview', () => {
    try {
      const roomId = socket.roomId;
      const gameState = gameStates[roomId];
      if (!gameState || gameState.roundPhase !== 'review' || !gameState.reviewData) return;
      if (!gameState.reviewData.confirmedBy) gameState.reviewData.confirmedBy = new Set();
      gameState.reviewData.confirmedBy.add(socket.playerName);
      const connected = getConnectedPlayers(gameState).map(p => p.name);
      const allConfirmed = connected.every(n => gameState.reviewData.confirmedBy.has(n));
      if (allConfirmed) {
        if (gameState.reviewData.intervalId) {
          clearInterval(gameState.reviewData.intervalId);
          gameState.reviewData.intervalId = null;
        }
        finishReviewAutomatically(roomId);
      }
    } catch (error) {
      console.error('[confirmReview] Error:', error);
    }
  });

  // Nuevo sistema de votación tipo "interruptores"
  socket.on('requestVotingData', ({ roomId, playerName }) => {
    try {
      console.log(`📊 [SERVER] Solicitando datos de votación para sala: ${roomId} por ${playerName}`);
      
      const gameState = gameStates[roomId];
      if (!gameState) {
        return socket.emit('votingError', { message: 'Sala no encontrada' });
      }

      const playerIndex = gameState.players.findIndex(p => p.name === playerName);
      if (playerIndex === -1) {
        return socket.emit('votingError', { message: 'Jugador no encontrado' });
      }

      // Actualizar el socket.id del jugador para esta nueva conexión
      gameState.players[playerIndex].id = socket.id;
      socket.playerName = playerName; // Asociar nombre al socket actual
      socket.roomId = roomId; // Asociar sala al socket actual
      socket.join(roomId); // Unir el socket a la sala de la partida

      // Preparar datos de votación
      const votingData = {
        roomId,
        round: gameState.currentRound,
        letter: gameState.currentLetter,
        categories: gameState.categories,
        words: {},
        timeRemaining: 60, // O tomarlo de gameState.reviewData.timeRemaining si existe
        totalPlayers: gameState.players.length
      };

      // Recopilar palabras de todos los jugadores
      gameState.players.forEach(p => {
        votingData.words[p.name] = {};
        gameState.categories.forEach(category => {
          const playerWords = gameState.words[p.name] || {};
          const word = playerWords[category] || '';
          votingData.words[p.name][category] = word;
        });
      });

      console.log(`📊 [SERVER] Datos de votación preparados:`, {
        jugadores: Object.keys(votingData.words),
        categorias: votingData.categories,
        palabrasPorJugador: Object.keys(votingData.words).map(name => ({
          jugador: name,
          palabras: Object.values(votingData.words[name]).filter(w => w).length
        }))
      });

      socket.emit('votingData', votingData);
      
      logEvent({ socket, event: 'requestVotingData', roomId, message: `${player.name} solicitó datos de votación` });
    } catch (error) {
      console.error('[RequestVotingData] Error:', error);
    }
  });

  socket.on('castVote', ({ roomId, targetPlayer, category, isValid, voter }) => {
    try {
      console.log(`🗳️ [SERVER] Voto tipo interruptor:`, { roomId, targetPlayer, category, isValid, voter });
      
      const gameState = gameStates[roomId];
      if (!gameState || gameState.roundPhase !== 'review') {
        return socket.emit('votingError', { message: 'Votación no disponible' });
      }

      const player = gameState.players.find(p => p.name === socket.playerName);
      if (!player || player.name !== voter) {
        return socket.emit('votingError', { message: 'Jugador no autorizado' });
      }

      // Prevenir auto-voto
      if (targetPlayer === player.name) {
        return socket.emit('votingError', { message: 'No puedes votar por tu propia palabra' });
      }

      // Inicializar estructura de votación por interruptores
      if (!gameState.switchVotes) gameState.switchVotes = {};
      const wordKey = `${targetPlayer}-${category}`;
      if (!gameState.switchVotes[wordKey]) {
        gameState.switchVotes[wordKey] = {};
      }

      // Registrar voto (cada jugador tiene un "interruptor" por palabra)
      gameState.switchVotes[wordKey][voter] = isValid;

      // Broadcast actualización
      io.to(roomId).emit('voteUpdate', {
        wordKey,
        targetPlayer,
        category,
        voter,
        isValid
      });

      logEvent({ socket, event: 'castVote', roomId, message: `${voter} marcó como ${isValid ? 'válida' : 'inválida'} la palabra de ${targetPlayer}/${category}` });
    } catch (error) {
      console.error('[CastVote] Error:', error);
    }
  });

  socket.on('validateVoting', ({ roomId, playerName, votes }) => {
    try {
      console.log(`✅ [SERVER] Validación de votación:`, { roomId, playerName });
      
      const gameState = gameStates[roomId];
      if (!gameState) {
        return socket.emit('votingError', { message: 'Sala no encontrada' });
      }

      const player = gameState.players.find(p => p.id === socket.id);
      if (!player || player.name !== playerName) {
        return socket.emit('votingError', { message: 'Jugador no autorizado' });
      }

      // Inicializar estructura de validaciones
      if (!gameState.votingValidations) gameState.votingValidations = {};
      gameState.votingValidations[playerName] = {
        validated: true,
        votes: votes,
        timestamp: Date.now()
      };

      const validatedCount = Object.keys(gameState.votingValidations).length;
      const totalPlayers = gameState.players.length;

      // Broadcast progreso
      io.to(roomId).emit('votingProgress', {
        playersReady: validatedCount,
        totalPlayers: totalPlayers
      });

      // Si todos han validado, completar votación
      if (validatedCount >= totalPlayers) {
        completeVoting(roomId);
      }

      logEvent({ socket, event: 'validateVoting', roomId, message: `${playerName} validó su votación (${validatedCount}/${totalPlayers})` });
    } catch (error) {
      console.error('[ValidateVoting] Error:', error);
    }
  });

  // Función para completar la votación cuando todos han validado
  function completeVoting(roomId) {
    try {
      console.log(`🏁 [SERVER] Completando votación para sala: ${roomId}`);
      
      const gameState = gameStates[roomId];
      if (!gameState || !gameState.votingValidations) return;

      // 1. Consolidar todos los votos en una estructura fácil de contar
      const wordVoteCounts = {}; // { "player-category": { valid: 1, invalid: 3 } }

      Object.values(gameState.votingValidations).forEach(validation => {
        const playerVotes = validation.votes || {};
        Object.entries(playerVotes).forEach(([wordKey, isValid]) => {
          if (!wordVoteCounts[wordKey]) {
            wordVoteCounts[wordKey] = { valid: 0, invalid: 0 };
          }
          if (isValid) {
            wordVoteCounts[wordKey].valid++;
          } else {
            wordVoteCounts[wordKey].invalid++;
          }
        });
      });

      console.log('📊 [VOTING] Conteo de votos consolidado:', wordVoteCounts);

      // 2. Calcular los resultados finales basados en los votos contados
      const finalResults = {};
      const totalPlayers = gameState.players.length;
      
      gameState.players.forEach(player => {
        finalResults[player.name] = {};
        
        gameState.categories.forEach(category => {
          const word = gameState.words[player.name]?.[category] || '';
          const wordKey = `${player.name}-${category}`;
          
          if (word) {
            const votes = wordVoteCounts[wordKey] || { valid: 0, invalid: 0 };
            const totalVoters = totalPlayers - 1; // No se cuenta el voto propio

            // Una palabra es válida si MENOS de la mitad de los otros jugadores la marcan como inválida.
            // Ejemplo: 5 jugadores -> 4 votantes. Es inválida con 2 o más votos "invalid".
            const isValid = votes.invalid < (totalVoters / 2);
            
            finalResults[player.name][category] = {
              word: word,
              isValid: isValid,
              invalidVotes: votes.invalid,
              validVotes: votes.valid,
              totalVoters: totalVoters
            };
          } else {
            finalResults[player.name][category] = {
              word: '',
              isValid: false,
              invalidVotes: 0,
              validVotes: 0,
              totalVoters: totalVoters
            };
          }
        });
      });

      // 3. Calcular puntajes
      const scores = calculateScoresFromResults(finalResults, gameState);
      
      // Actualizar estado del juego
      gameState.roundPhase = 'completed';
      gameState.lastRoundResults = finalResults;
      
      // Acumular puntajes
      Object.keys(scores).forEach(playerName => {
        if (gameState.scores[playerName] !== undefined) {
          gameState.scores[playerName] += scores[playerName].total;
        } else {
          gameState.scores[playerName] = scores[playerName].total;
        }
      });

      // 4. Notificar a todos los clientes que la votación está completa
      io.to(roomId).emit('votingComplete', {
        results: finalResults,
        scores: gameState.scores, // Enviar puntajes acumulados
        roundScores: scores, // Enviar puntajes de esta ronda
        nextRound: gameState.currentRound + 1
      });

      // 5. Limpiar datos de votación para la siguiente ronda
      gameState.votingValidations = {};
      gameState.switchVotes = {}; // Limpiar también por si acaso

      logEvent({ roomId, event: 'votingComplete', message: `Votación completada para ronda ${gameState.currentRound}` });
      
    } catch (error) {
      console.error('[CompleteVoting] Error:', error);
    }
  }

  function calculateScoresFromResults(results, gameState) {
    const roundScores = {};
    const wordUniqueness = {}; // { category: { word: [player1, player2] } }

    // Inicializar puntajes y contar unicidad de palabras
    gameState.players.forEach(player => {
      roundScores[player.name] = { total: 0 };
    });

    gameState.categories.forEach(category => {
      wordUniqueness[category] = {};
      gameState.players.forEach(player => {
        const result = results[player.name]?.[category];
        if (result && result.isValid && result.word) {
          const normalizedWord = result.word.toLowerCase().trim();
          if (!wordUniqueness[category][normalizedWord]) {
            wordUniqueness[category][normalizedWord] = [];
          }
          wordUniqueness[category][normalizedWord].push(player.name);
        }
      });
    });

    // Asignar puntos
    gameState.players.forEach(player => {
      let totalPoints = 0;
      gameState.categories.forEach(category => {
        const result = results[player.name]?.[category];
        if (result && result.isValid && result.word) {
          const normalizedWord = result.word.toLowerCase().trim();
          const uniquePlayers = wordUniqueness[category][normalizedWord];
          
          if (uniquePlayers.length === 1) {
            totalPoints += 10; // Palabra única
          } else {
            totalPoints += 5; // Palabra repetida
          }
        }
      });
      roundScores[player.name].total = totalPoints;
    });
    
    return roundScores;
  }

  // Finalizar revisión - COMPATIBLE CON FRONTEND
  socket.on('finishReview', ({ roomId, votingResults }) => {
    try {
      console.log(`✅ [SERVER] Finalizando revisión:`, { roomId, votingResults });
      
      const gameState = gameStates[roomId];
      if (!gameState) return;

      const player = gameState.players.find(p => p.id === socket.id);
      if (!player) return;

      // Procesar resultados de votación si se proporcionan
      if (votingResults) {
        console.log(`📊 [SERVER] Procesando ${Object.keys(votingResults).length} resultados de votación`);
        
        // Aplicar resultados de votación a validWords
        Object.entries(votingResults).forEach(([wordKey, result]) => {
          const [playerName, category] = wordKey.split('-');
          if (!gameState.validWords[playerName]) {
            gameState.validWords[playerName] = {};
          }
          gameState.validWords[playerName][category] = result.isValid;
        });
      }

      // Procesar resultados finales
      const finalResults = processFinalReviewResults(gameState);
      
      // Actualizar puntuaciones
      updatePlayerScoresFromReview(gameState, finalResults);

      // Notificar fin de revisión
      io.to(roomId).emit('reviewEnded', {
        finalResults,
        playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })),
        round: gameState.currentRound
      });

      // Determinar si es la última ronda
      const isLastRound = (gameState.maxRounds && gameState.currentRound >= gameState.maxRounds);
      
      if (isLastRound) {
        // Finalizar juego
        gameState.isPlaying = false;
        gameState.roundPhase = 'ended';
        
        // FASE 4: Actualizar estadísticas al finalizar juego
        gameState.players.forEach(player => {
          if (player.connected) {
            const wordsSubmitted = gameState.categories ? 
              gameState.categories.filter(cat => gameState.words[player.name]?.[cat]?.trim()).length : 0;
            
            updatePlayerStats(player.name, {
              wordsSubmitted: wordsSubmitted,
              categories: gameState.categories,
              streakBonus: gameState.currentStreakBonuses?.[player.name]?.multiplier > 1.0,
              socialPressure: true, // Asumimos que experimentó presión social
              playTime: Math.round((Date.now() - (gameState.gameStartedAt || Date.now())) / 1000)
            });
          }
        });

        io.to(roomId).emit('gameEnded', {
          finalResults,
          playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })).sort((a, b) => b.score - a.score),
          totalRounds: gameState.currentRound,
          statsUpdated: true
        });
        
        logEvent({ socket, event: 'gameEnded', roomId, message: `Juego finalizado después de ${gameState.currentRound} rondas. Estadísticas actualizadas.` });
      } else {
        // Preparar siguiente ronda
        gameState.words = {};
        gameState.validWords = {};
        gameState.currentRound++;
        gameState.timeRemaining = gameState.timeLimit;
        gameState.roundPhase = 'roundStart';
        
        // FASE 4: Auto-generar nueva letra con sistema de racha
        const letterData = generateLetterWithHistory(gameState);
        
        // Notificar nueva ronda después de un breve delay
        setTimeout(() => {
          io.to(roomId).emit('roundStart', {
            letter: letterData.letter,
            timeLimit: gameState.timeLimit,
            streakBonuses: letterData.streakBonuses,
            letterHistory: letterData.letterHistory,
            isRare: letterData.isRare,
            isMedium: letterData.isMedium,
            round: gameState.currentRound,
            categories: gameState.categories
          });
          
          gameState.roundPhase = 'writing';
          setTimeout(() => startTimer(roomId), 500);
        }, 3000); // 3 segundos para que vean los resultados
        
        logEvent({ socket, event: 'nextRoundStarted', roomId, message: `Iniciando ronda ${gameState.currentRound} con letra ${gameState.currentLetter}` });
      }

      // Limpiar datos de revisión
      delete gameState.reviewData;

      logEvent({ socket, event: 'finishReview', roomId, message: `Revisión finalizada por ${player.name}` });
    } catch (error) {
      console.error('[FinishReview] Error:', error);
    }
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    // Limpiar heartbeat
    if (heartbeatIntervals.has(socket.id)) {
      clearInterval(heartbeatIntervals.get(socket.id));
      heartbeatIntervals.delete(socket.id);
    }
    
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
      // IMPORTANTE: NO eliminar salas durante la fase de revisión
      if (!gs.isPlaying && gs.roundPhase !== 'review' && getConnectedPlayers(gs).length === 0) {
        setTimeout(() => {
          const ref = gameStates[roomId];
          if (ref && getConnectedPlayers(ref).length === 0 && ref.roundPhase !== 'review') {
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
  
  // FASE 4: SOCIAL PRESSURE TIMER - Timer inteligente que acelera con presión social
  gameState.timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((gameState.timerEndsAt - Date.now()) / 1000));
    gameState.timeRemaining = remaining;
    
    // Calcular presión social
    const activePlayers = getActivePlayers(gameState);
    const totalPlayers = getConnectedPlayers(gameState).length;
    const completionRate = getCompletionRate(gameState);
    
    // Aplicar multiplicador de presión
    let pressureMultiplier = 1.0;
    let pressureReason = 'normal';
    
    if (activePlayers <= 2 && totalPlayers > 2) {
      pressureMultiplier = 1.5;
      pressureReason = 'few_active';
    } else if (activePlayers === 1 && totalPlayers > 1) {
      pressureMultiplier = 2.0;
      pressureReason = 'last_player';
    }
    
    if (completionRate > 0.7 && pressureMultiplier === 1.0) {
      pressureMultiplier = 1.3;
      pressureReason = 'most_completed';
    }
    
    // Ajustar tiempo si hay presión (acelerar el countdown)
    if (pressureMultiplier > 1.0 && gameState.timeRemaining > 10) {
      gameState.timerEndsAt -= (pressureMultiplier - 1.0) * 1000;
    }
    
    // Notificar actualización de tiempo con información de presión
    io.to(roomId).emit('timerUpdate', { 
      timeRemaining: gameState.timeRemaining, 
      serverTime: Date.now(), 
      endsAt: gameState.timerEndsAt,
      pressureMultiplier: pressureMultiplier,
      pressureReason: pressureReason,
      activePlayers: activePlayers,
      totalPlayers: totalPlayers,
      isUnderPressure: pressureMultiplier > 1.1
    });
    
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
          
          // FASE 4: NUEVO FLUJO: Auto-letter para siguiente ronda con sistema de racha
          const letterData = generateLetterWithHistory(gameState);
          gameState.roundPhase = 'writing';
          
          // Emit directo sin ruleta
          io.to(roomId).emit('roundStart', {
            letter: letterData.letter,
            timeLimit: gameState.timeLimit,
            streakBonuses: letterData.streakBonuses,
            letterHistory: letterData.letterHistory,
            isRare: letterData.isRare,
            isMedium: letterData.isMedium,
            round: gameState.currentRound,
            categories: gameState.categories
          });
          
          // Iniciar temporizador
          setTimeout(() => startTimer(roomId), 1000);
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

// =============================================
// FUNCIONES AUXILIARES PARA REVISIÓN SOCIAL
// =============================================

/**
 * Calcula estadísticas de votos para una palabra específica
 */
function calculateWordVoteStats(wordVotes) {
  const votes = Object.values(wordVotes || {});
  const approvals = votes.filter(v => v === 'approve').length;
  const rejections = votes.filter(v => v === 'reject').length;
  
  return {
    totalVotes: votes.length,
    approvals,
    rejections,
    approvalRate: votes.length > 0 ? approvals / votes.length : 0,
    rejectionRate: votes.length > 0 ? rejections / votes.length : 0
  };
}

/**
 * Calcula estadísticas generales de toda la revisión
 */
function calculateReviewStats(gameState) {
  if (!gameState.reviewData) {
    return { totalWords: 0, approvedWords: 0, rejectedWords: 0, pendingWords: 0 };
  }

  let totalWords = 0;
  let approvedWords = 0;
  let rejectedWords = 0;

  Object.keys(gameState.words || {}).forEach(playerId => {
    const playerWords = gameState.words[playerId] || {};
    Object.keys(playerWords).forEach(category => {
      totalWords++;
      const wordId = `${playerId}-${category}`;
      const consensus = gameState.reviewData.consensusReached[wordId];
      
      if (consensus === 'approve') {
        approvedWords++;
      } else if (consensus === 'reject') {
        rejectedWords++;
      }
    });
  });

  return {
    totalWords,
    approvedWords,
    rejectedWords,
    pendingWords: totalWords - approvedWords - rejectedWords
  };
}

/**
 * Verifica si todos los jugadores han votado las palabras del jugador actual
 */
function hasAllPlayersVotedForPlayer(gameState, currentPlayerId) {
  if (!gameState.reviewData || !gameState.words[currentPlayerId]) {
    return false;
  }

  const playerWords = gameState.words[currentPlayerId];
  const otherPlayers = gameState.players.filter(p => p.id !== currentPlayerId && p.connected);
  
  // Verificar cada palabra del jugador
  for (const category of Object.keys(playerWords)) {
    const wordId = `${currentPlayerId}-${category}`;
    const wordVotes = gameState.reviewData.votes[wordId] || {};
    
    // Verificar si todos los otros jugadores han votado esta palabra
    for (const player of otherPlayers) {
      if (!wordVotes[player.id]) {
        return false; // Este jugador no ha votado esta palabra
      }
    }
  }
  
  return true; // Todos han votado todas las palabras
}

/**
 * Avanza al siguiente jugador en la revisión
 */
function advanceToNextPlayer(roomId) {
  const gameState = gameStates[roomId];
  if (!gameState || !gameState.reviewData) return;

  // Buscar el siguiente jugador con palabras
  let nextIndex = gameState.reviewData.currentPlayerIndex + 1;
  let attempts = 0;
  
  while (attempts < gameState.players.length) {
    if (nextIndex >= gameState.players.length) {
      // Todos los jugadores han sido revisados, finalizar
      finishReviewAutomatically(roomId);
      return;
    }
    
    const nextPlayer = gameState.players[nextIndex];
    if (nextPlayer && gameState.words[nextPlayer.name] && Object.keys(gameState.words[nextPlayer.name]).length > 0) {
      // Jugador encontrado con palabras
      gameState.reviewData.currentPlayerIndex = nextIndex;
      
      // Broadcast cambio de jugador
      io.to(roomId).emit('playerChange', {
        playerIndex: nextIndex,
        playerId: nextPlayer.id,
        playerName: nextPlayer.name,
        words: gameState.words[nextPlayer.name]
      });
      
      return;
    }
    
    nextIndex++;
    attempts++;
  }
  
  // No se encontraron más jugadores con palabras
  finishReviewAutomatically(roomId);
}

/**
 * Finaliza automáticamente la revisión cuando no hay más jugadores
 */
function finishReviewAutomatically(roomId) {
  const gameState = gameStates[roomId];
  if (!gameState || !gameState.reviewData) return;

  const finalResults = processFinalReviewResults(gameState);
  updatePlayerScoresFromReview(gameState, finalResults);

  io.to(roomId).emit('reviewEnded', {
    finalResults,
    playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })),
    round: gameState.currentRound,
    automatic: true
  });

  // Determinar si es la última ronda
  const isLastRound = (gameState.maxRounds && gameState.currentRound >= gameState.maxRounds);
  
  if (isLastRound) {
    // Finalizar juego
    gameState.isPlaying = false;
    gameState.roundPhase = 'ended';
    
    io.to(roomId).emit('gameEnded', {
      finalResults,
      playerScores: gameState.players.map(p => ({ name: p.name, score: p.score })).sort((a, b) => b.score - a.score),
      totalRounds: gameState.currentRound
    });
    
    logEvent({ event: 'gameEnded', roomId, message: `Juego finalizado automáticamente después de ${gameState.currentRound} rondas` });
  } else {
    // Preparar siguiente ronda
    gameState.words = {};
    gameState.validWords = {};
    gameState.currentRound++;
    gameState.timeRemaining = gameState.timeLimit;
    gameState.roundPhase = 'roundStart';
    
    // FASE 4: Auto-generar nueva letra con sistema de racha
    const letterData = generateLetterWithHistory(gameState);
    
    // Notificar nueva ronda después de un breve delay
    setTimeout(() => {
      io.to(roomId).emit('roundStart', {
        letter: letterData.letter,
        timeLimit: gameState.timeLimit,
        streakBonuses: letterData.streakBonuses,
        letterHistory: letterData.letterHistory,
        isRare: letterData.isRare,
        isMedium: letterData.isMedium,
        round: gameState.currentRound,
        categories: gameState.categories
      });
      
      gameState.roundPhase = 'writing';
      setTimeout(() => startTimer(roomId), 500);
    }, 3000);
    
    logEvent({ event: 'autoNextRound', roomId, message: `Auto-iniciando ronda ${gameState.currentRound} con letra ${gameState.currentLetter}` });
  }

  delete gameState.reviewData;
  logEvent({ event: 'autoFinishReview', roomId, message: 'Revisión finalizada automáticamente' });
}

/**
 * Procesa los resultados finales de la revisión
 */
function processFinalReviewResults(gameState) {
  const results = {};
  
  if (!gameState.reviewData || !gameState.words) return results;

  Object.keys(gameState.words).forEach(playerId => {
    const playerWords = gameState.words[playerId] || {};
    results[playerId] = {};
    
    Object.keys(playerWords).forEach(category => {
      const wordId = `${playerId}-${category}`;
      const word = playerWords[category];
      const wordVotes = gameState.reviewData.votes[wordId] || {};
      const consensus = gameState.reviewData.consensusReached[wordId];
      const stats = calculateWordVoteStats(wordVotes);
      
      // Determinar validez final
      let isValid = false;
      if (consensus) {
        isValid = consensus === 'approve';
      } else if (stats.totalVotes > 0) {
        // Sin consenso: decidir por mayoría simple
        isValid = stats.approvals >= stats.rejections;
      } else {
        // Sin votos: considerar válida si empieza con la letra correcta
        isValid = word && word.charAt(0).toUpperCase() === gameState.currentLetter;
      }
      
      results[playerId][category] = {
        word,
        isValid,
        votes: stats,
        consensus,
        points: calculateWordPoints(word, isValid, stats, gameState)
      };
    });
  });
  
  return results;
}

/**
 * Calcula puntos para una palabra basado en validación social
 */
function calculateWordPoints(word, isValid, voteStats, gameState) {
  if (!isValid || !word) return 0;
  
  let points = 0;
  
  // Puntos base por palabra válida
  points += 5;
  
  // Bonus por consenso fuerte
  if (voteStats.approvalRate >= 0.8) {
    points += 3; // Bonus por consenso muy fuerte
  } else if (voteStats.approvalRate >= 0.6) {
    points += 1; // Bonus por consenso moderado
  }
  
  // Bonus por originalidad (si es única en esa categoría)
  // TODO: Implementar verificación de unicidad
  
  // Bonus por sílabas (opcional)
  const syllables = countSyllables(word);
  if (syllables >= 4) {
    points += 2; // Bonus por palabra larga
  }
  
  return points;
}

/**
 * Actualiza las puntuaciones de los jugadores basado en los resultados de revisión
 */
function updatePlayerScoresFromReview(gameState, finalResults) {
  Object.keys(finalResults).forEach(playerId => {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const playerResults = finalResults[playerId];
    let totalPoints = 0;
    
    Object.values(playerResults).forEach(result => {
      totalPoints += result.points || 0;
    });
    
    player.score += totalPoints;
  });
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

// FASE 4: FUNCIONES AUXILIARES PARA SOCIAL PRESSURE TIMER

// Obtener jugadores que aún están escribiendo (no han enviado todas las palabras)
function getActivePlayers(gameState) {
  if (!gameState.words || !gameState.categories) return gameState.players.length;
  
  let activePlayers = 0;
  gameState.players.forEach(player => {
    if (!player.connected) return;
    
    const playerWords = gameState.words[player.name] || {};
    const wordsCompleted = gameState.categories.filter(cat => 
      playerWords[cat] && playerWords[cat].trim().length > 0
    ).length;
    
    // Considerar activo si no ha completado todas las palabras
    if (wordsCompleted < gameState.categories.length) {
      activePlayers++;
    }
  });
  
  return Math.max(1, activePlayers); // Mínimo 1 para evitar división por 0
}

// Calcular tasa de completado general
function getCompletionRate(gameState) {
  if (!gameState.words || !gameState.categories || gameState.players.length === 0) return 0;
  
  let totalPossibleWords = 0;
  let completedWords = 0;
  
  gameState.players.forEach(player => {
    if (!player.connected) return;
    
    totalPossibleWords += gameState.categories.length;
    const playerWords = gameState.words[player.name] || {};
    completedWords += gameState.categories.filter(cat => 
      playerWords[cat] && playerWords[cat].trim().length > 0
    ).length;
  });
  
  return totalPossibleWords > 0 ? completedWords / totalPossibleWords : 0;
}

// FASE 4: LETTER STREAK SYSTEM - Sistema de bonificación por letras difíciles

const RARE_LETTERS = ['K', 'Q', 'W', 'X', 'Y', 'Z'];
const MEDIUM_LETTERS = ['J', 'Ñ', 'V'];

function calculateLetterStreakBonus(gameState) {
  if (!gameState.letterHistory || gameState.letterHistory.length < 2) return {};
  
  const streakBonuses = {};
  
  // Verificar últimas 4 letras para detectar rachas
  const recentLetters = gameState.letterHistory.slice(-4);
  let consecutiveRare = 0;
  let consecutiveMedium = 0;
  
  for (let i = recentLetters.length - 1; i >= 0; i--) {
    const letter = recentLetters[i];
    
    if (RARE_LETTERS.includes(letter)) {
      consecutiveRare++;
      consecutiveMedium++; // Letras raras también cuentan como medium
    } else if (MEDIUM_LETTERS.includes(letter)) {
      consecutiveMedium++;
      break; // No continuar con raras si encontramos medium
    } else {
      break; // Romper la racha
    }
  }
  
  // Calcular multiplicadores
  let streakMultiplier = 1.0;
  let streakType = 'none';
  
  if (consecutiveRare >= 2) {
    streakMultiplier = 1.2 + (consecutiveRare - 2) * 0.3; // 1.2x, 1.5x, 1.8x...
    streakType = 'rare';
  } else if (consecutiveMedium >= 3) {
    streakMultiplier = 1.15 + (consecutiveMedium - 3) * 0.15; // 1.15x, 1.3x...
    streakType = 'medium';
  }
  
  // Aplicar bonus a todos los jugadores conectados
  gameState.players.forEach(player => {
    if (player.connected) {
      streakBonuses[player.name] = {
        multiplier: streakMultiplier,
        type: streakType,
        consecutiveCount: streakType === 'rare' ? consecutiveRare : consecutiveMedium,
        currentLetter: gameState.currentLetter
      };
    }
  });
  
  return streakBonuses;
}

function isRareLetter(letter) {
  return RARE_LETTERS.includes(letter?.toUpperCase());
}

function isMediumLetter(letter) {
  return MEDIUM_LETTERS.includes(letter?.toUpperCase());
}

// Función centralizada para generar letras con tracking de historial
function generateLetterWithHistory(gameState) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const newLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
  
  // Inicializar historial si no existe
  if (!gameState.letterHistory) {
    gameState.letterHistory = [];
  }
  
  // Agregar nueva letra al historial
  gameState.letterHistory.push(newLetter);
  
  // Mantener solo las últimas 10 letras para performance
  if (gameState.letterHistory.length > 10) {
    gameState.letterHistory = gameState.letterHistory.slice(-10);
  }
  
  gameState.currentLetter = newLetter;
  
  // Calcular bonus de racha si aplica
  const streakBonuses = calculateLetterStreakBonus(gameState);
  gameState.currentStreakBonuses = streakBonuses;
  
  console.log(`🔤 [LETTER STREAK] Nueva letra: ${newLetter}, Historial: [${gameState.letterHistory.join(', ')}]`);
  if (Object.keys(streakBonuses).length > 0) {
    console.log(`⚡ [LETTER STREAK] Bonus activo:`, Object.values(streakBonuses)[0]);
  }
  
  return {
    letter: newLetter,
    streakBonuses: streakBonuses,
    letterHistory: gameState.letterHistory.slice(-5), // Enviar últimas 5 al cliente
    isRare: isRareLetter(newLetter),
    isMedium: isMediumLetter(newLetter)
  };
}

// FASE 4: SISTEMA DE ESTADÍSTICAS BÁSICO

// Storage temporal de estadísticas (en producción usar Redis/MongoDB)
const playerStats = {};

function initializePlayerStats(playerName) {
  if (!playerStats[playerName]) {
    playerStats[playerName] = {
      gamesPlayed: 0,
      wordsCompleted: 0,
      averageWordsPerGame: 0,
      favoriteCategories: {},
      streakBonusesEarned: 0,
      socialPressuresSurvived: 0,
      fastestWordTime: null,
      longestStreak: 0,
      validationAccuracy: 0,
      totalPlayTime: 0,
      lastPlayed: new Date(),
      achievements: []
    };
  }
  return playerStats[playerName];
}

function updatePlayerStats(playerName, gameData) {
  const stats = initializePlayerStats(playerName);
  
  stats.gamesPlayed++;
  stats.wordsCompleted += gameData.wordsSubmitted || 0;
  stats.averageWordsPerGame = stats.wordsCompleted / stats.gamesPlayed;
  
  // Categorías favoritas
  if (gameData.categories) {
    gameData.categories.forEach(category => {
      stats.favoriteCategories[category] = (stats.favoriteCategories[category] || 0) + 1;
    });
  }
  
  // Bonuses y logros
  if (gameData.streakBonus) stats.streakBonusesEarned++;
  if (gameData.socialPressure) stats.socialPressuresSurvived++;
  if (gameData.playTime) stats.totalPlayTime += gameData.playTime;
  
  stats.lastPlayed = new Date();
  
  console.log(`📊 [STATS] Estadísticas actualizadas para ${playerName}:`, {
    gamesPlayed: stats.gamesPlayed,
    wordsCompleted: stats.wordsCompleted,
    averageWordsPerGame: Math.round(stats.averageWordsPerGame * 10) / 10
  });
  
  return stats;
}

function getPlayerStats(playerName) {
  return playerStats[playerName] || initializePlayerStats(playerName);
}

function getGlobalStats() {
  const totalPlayers = Object.keys(playerStats).length;
  const totalGames = Object.values(playerStats).reduce((sum, stats) => sum + stats.gamesPlayed, 0);
  const totalWords = Object.values(playerStats).reduce((sum, stats) => sum + stats.wordsCompleted, 0);
  
  return {
    totalPlayers,
    totalGames,
    totalWords,
    averageWordsPerGame: totalGames > 0 ? Math.round((totalWords / totalGames) * 10) / 10 : 0,
    activeToday: Object.values(playerStats).filter(stats => {
      const today = new Date();
      const lastPlayed = new Date(stats.lastPlayed);
      return today.toDateString() === lastPlayed.toDateString();
    }).length
  };
}

// Endpoint para obtener estadísticas
app.get('/api/stats/:playerName', (req, res) => {
  try {
    const playerName = req.params.playerName;
    const stats = getPlayerStats(playerName);
    res.json({
      success: true,
      stats: stats,
      global: getGlobalStats()
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// FASE 4: SISTEMA DE FEEDBACK - Storage temporal de feedback
const feedbackStorage = [];
const bugReports = [];

// Endpoint para enviar feedback
app.post('/api/feedback', (req, res) => {
  try {
    const { playerName, rating, message, type } = req.body;
    
    if (!playerName || !rating || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Datos incompletos: playerName, rating y type son requeridos' 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating debe estar entre 1 y 5' 
      });
    }
    
    const feedback = {
      id: Date.now().toString(),
      playerName: playerName,
      rating: parseInt(rating),
      message: message || '',
      type: type, // 'game', 'bug', 'suggestion'
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: req.ip || req.connection.remoteAddress
    };
    
    if (type === 'bug') {
      bugReports.push(feedback);
      console.log(`🐛 [FEEDBACK] Nuevo reporte de bug de ${playerName}:`, message);
    } else {
      feedbackStorage.push(feedback);
      console.log(`💬 [FEEDBACK] Nuevo feedback de ${playerName}: ${rating}⭐ - ${type}`);
    }
    
    res.json({
      success: true,
      message: 'Feedback recibido correctamente',
      id: feedback.id
    });
    
  } catch (error) {
    console.error('Error procesando feedback:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener estadísticas de feedback (admin)
app.get('/api/feedback/stats', (req, res) => {
  try {
    const totalFeedbacks = feedbackStorage.length;
    const totalBugs = bugReports.length;
    
    const averageRating = totalFeedbacks > 0 ? 
      feedbackStorage.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks : 0;
    
    const feedbackByType = feedbackStorage.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});
    
    const ratingDistribution = feedbackStorage.reduce((acc, f) => {
      acc[f.rating] = (acc[f.rating] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      stats: {
        totalFeedbacks,
        totalBugs,
        averageRating: Math.round(averageRating * 10) / 10,
        feedbackByType,
        ratingDistribution,
        recentFeedbacks: feedbackStorage.slice(-10).reverse(),
        recentBugs: bugReports.slice(-5).reverse()
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de feedback:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Export para pruebas
module.exports = { server, io };
