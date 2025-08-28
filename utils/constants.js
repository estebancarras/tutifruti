/**
 * Constantes globales del juego Tutifrutti
 */

export const GAME_CONFIG = {
  MAX_PLAYERS: 5,
  TIME_LIMIT: 60,
  CATEGORIES: ['NOMBRE', 'ANIMAL', 'COSA', 'FRUTA'],
  ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
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
  GAME: '/views/game.html'
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
  SPIN_ROULETTE: 'spinRoulette',
  SHOW_ROULETTE: 'showRoulette',
  ROULETTE_SPINNING: 'rouletteSpinning',
  ROULETTE_RESULT: 'rouletteResult',
  SUBMIT_WORDS: 'submitWords',
  TIMER_UPDATE: 'timerUpdate',
  ROUND_ENDED: 'roundEnded',
  GAME_ENDED: 'gameEnded',
  PLAYER_READY: 'playerReady',
  
  // Errores
  ERROR: 'error'
};
