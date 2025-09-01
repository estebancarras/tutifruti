/**
 * Constantes globales del juego Tutifrutti
 */

export const GAME_CONFIG = {
  MAX_PLAYERS: 5,
  TIME_LIMIT: 60,
  REVIEW_TIME: 20, // segundos para fase de revisión/votación
  // Categorías expandidas para grid 4x3 (12 total). Futuro: configurable por sala
  CATEGORIES: ['NOMBRE', 'ANIMAL', 'COSA', 'FRUTA', 'PAIS', 'COLOR', 'COMIDA', 'CIUDAD', 'PROFESION', 'MARCA', 'DEPORTE', 'PELICULA'],
  ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
};

// Fases del juego para orquestación de rondas
export const GAME_PHASES = {
  LOBBY: 'lobby',
  ROUND_START: 'roundStart',
  WRITING: 'writing',
  REVIEW: 'review',
  RESULTS: 'results',
  ENDED: 'ended'
};

// Opciones generales (pueden moverse a una configuración por sala en el futuro)
export const GAME_OPTIONS = {
  SCORING_MODE: 'classic_plus', // classic_plus | competitive (futuro)
  RARE_LETTER_BONUS_ENABLED: false
};

export const SCORES = {
  REPEATED_WORD: 1,
  UNIQUE_WORD: 2,
  SYLLABLES_BONUS: 3
};

export const ROUTES = {
  HOME: '/index.html',
  CREATE_ROOM: '/views/create-room.html',
  JOIN_ROOM: '/views/join-room.html',
  GAME: '/views/game.html',
  REVIEW: '/views/review.html',
  RESULTS: '/views/results.html'
};

export const STORAGE_KEYS = {
  USERNAME: 'username',
  CURRENT_ROOM_ID: 'currentRoomId',
  ROOMS: 'rooms'
};

export const SOCKET_EVENTS = {
  // Conexión
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Salas
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  GET_ROOMS: 'getRooms',
  ROOM_CREATED: 'roomCreated',
  JOINED_ROOM: 'joinedRoom',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  ACTIVE_ROOMS: 'activeRooms',
  // Estado de sala / rehidratación
  GET_ROOM_STATE: 'getRoomState',
  ROOM_STATE: 'roomState',
  YOU_ARE_CREATOR: 'youAreCreator',
  NEW_ROUND: 'newRound',
  RECONNECT_PLAYER: 'reconnectPlayer',
  
  // Juego
  START_GAME: 'startGame',
  // ELIMINADOS: Eventos de ruleta ya no necesarios
  // SPIN_ROULETTE: 'spinRoulette',
  // SHOW_ROULETTE: 'showRoulette', 
  // ROULETTE_SPINNING: 'rouletteSpinning',
  // ROULETTE_RESULT: 'rouletteResult',
  // Flujo principal: Auto-letter + round start inmediato
  ROUND_START: 'roundStart',       // server -> clients (inicio de ronda con letra)
  
  // Sistema de validación social y revisión
  START_REVIEW: 'startReview',     // server -> clients (comienza revisión)
  JOIN_REVIEW_ROOM: 'joinReviewRoom', // client -> server (unirse a revisión)
  REVIEW_DATA: 'reviewData',       // server -> client (datos de revisión)
  CAST_VOTE: 'castVote',           // client -> server (emitir voto)
  VOTE_UPDATE: 'voteUpdate',       // server -> clients (actualización de votos)
  PLAYER_CHANGE: 'playerChange',   // server -> clients (cambio de jugador)
  REVIEW_ENDED: 'reviewEnded',     // server -> clients (resultado de revisión)
  REVIEW_ERROR: 'reviewError',     // server -> client (error en revisión)
  FINISH_REVIEW: 'finishReview',   // client -> server (terminar revisión)
  SKIP_CURRENT_PLAYER: 'skipCurrentPlayer', // client -> server (saltar jugador)
  NEXT_ROUND: 'nextRound',         // client -> server (host avanza a siguiente ronda)

  SUBMIT_WORDS: 'submitWords',
  TIMER_UPDATE: 'timerUpdate',
  ROUND_ENDED: 'roundEnded',
  GAME_ENDED: 'gameEnded',
  PLAYER_READY: 'playerReady',
  
  // Errores
  ERROR: 'error'
};
