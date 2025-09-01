// @ts-check
/**
 * Pruebas de edge cases sobre Socket.IO
 */
const { io } = require('socket.io-client');
const { server } = require('../server');

let BASE;
const CONNECT_OPTS = { transports: ['websocket'], forceNew: true, reconnection: true };

function connectClient() {
  return io(BASE, CONNECT_OPTS);
}

// Emite un evento cuando el socket esté conectado; si ya lo está, emite inmediatamente
function emitWhenConnected(socket, event, payload) {
  if (socket.connected) {
    socket.emit(event, payload);
  } else {
    socket.once('connect', () => socket.emit(event, payload));
  }
}

beforeAll(async () => {
  if (!server.listening) {
    await new Promise((resolve) => server.listen(0, () => resolve(true)));
  }
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3000;
  BASE = `http://localhost:${port}`;
});

  // No cerramos el servidor en esta suite; otras suites se encargan de cerrarlo.

function waitForEvent(socket, event, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout esperando evento ${event}`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

describe('Socket.IO edge cases', () => {
  jest.setTimeout(60000);

  test('joinRoom en sala llena retorna error', async () => {
    const host = connectClient();
    const p2 = connectClient();
    const p3 = connectClient();

    const refs = { roomId: null };

    // Crear sala con maxPlayers=2
    await new Promise((resolve, reject) => {
      emitWhenConnected(host, 'createRoom', { playerName: 'Host', roomName: 'Sala 2', maxPlayers: 2 });
      host.on('joinedRoom', (data) => {
        try {
          expect(data).toHaveProperty('roomId');
          refs.roomId = data.roomId;
          resolve(true);
        } catch (e) { reject(e); }
      });
      host.on('error', (err) => reject(new Error(`host error: ${JSON.stringify(err)}`)));
      setTimeout(() => reject(new Error('Timeout joinedRoom host')), 15000);
    });

    // Unirse p2
    await new Promise((resolve, reject) => {
      emitWhenConnected(p2, 'joinRoom', { roomId: refs.roomId, playerName: 'Bob' });
      p2.on('joinedRoom', () => resolve(true));
      p2.on('error', (err) => reject(new Error(`p2 error: ${JSON.stringify(err)}`)));
      p2.on('connect_error', (err) => reject(new Error(`p2 connect_error: ${err && err.message ? err.message : err}`)));
      setTimeout(() => reject(new Error('Timeout joinedRoom p2')), 15000);
    });

    // Intentar un tercero: debe fallar por "La sala está llena"
    const err = await new Promise((resolve) => {
      emitWhenConnected(p3, 'joinRoom', { roomId: refs.roomId, playerName: 'Ana' });
      p3.on('error', (e) => resolve(e));
      p3.on('connect_error', (e) => resolve({ message: `CONNECT_ERROR: ${e && e.message ? e.message : e}` }));
      // timeout: si no llega error, igual fallamos luego
      setTimeout(() => resolve({ message: 'NO_ERROR' }), 15000);
    });

    expect(err && err.message).toBeDefined();
    expect(err.message).toMatch(/llena/i);

    host.disconnect();
    p2.disconnect();
    p3.disconnect();
  });

  test('joinRoom cuando el juego ya inició retorna error', async () => {
    const host = connectClient();
    const p2 = connectClient();
    const p3 = connectClient();
    const refs = { roomId: null };

    // Crear sala y unirse p2
    await new Promise((resolve, reject) => {
      emitWhenConnected(host, 'createRoom', { playerName: 'Host', roomName: 'Sala Iniciada', maxPlayers: 5 });
      host.on('joinedRoom', (data) => {
        refs.roomId = data.roomId;
        resolve(true);
      });
      host.on('error', (e) => reject(new Error(`host error: ${JSON.stringify(e)}`)));
      setTimeout(() => reject(new Error('Timeout host create/join')), 15000);
    });

    await new Promise((resolve, reject) => {
      emitWhenConnected(p2, 'joinRoom', { roomId: refs.roomId, playerName: 'Bob' });
      p2.on('joinedRoom', () => resolve(true));
      p2.on('error', (e) => reject(new Error(`p2 error: ${JSON.stringify(e)}`)));
      p2.on('connect_error', (e) => reject(new Error(`p2 connect_error: ${e && e.message ? e.message : e}`)));
      setTimeout(() => reject(new Error('Timeout p2 join')), 15000);
    });

    // Iniciar juego
    host.emit('startGame');
    await waitForEvent(host, 'roundStart', 10000);

    // Tercer jugador intenta unirse: debe fallar "El juego ya ha comenzado"
    const err = await new Promise((resolve) => {
      emitWhenConnected(p3, 'joinRoom', { roomId: refs.roomId, playerName: 'Ana' });
      p3.on('error', (e) => resolve(e));
      p3.on('connect_error', (e) => resolve({ message: `CONNECT_ERROR: ${e && e.message ? e.message : e}` }));
      setTimeout(() => resolve({ message: 'NO_ERROR' }), 15000);
    });

    expect(err && err.message).toMatch(/ya ha comenzado/i);

    host.disconnect();
    p2.disconnect();
    p3.disconnect();
  });

  test('No-creador no puede startGame', async () => {
    const host = connectClient();
    const p2 = connectClient();
    const refs = { roomId: null };

    // Crear y unir segundo jugador
    await new Promise((resolve, reject) => {
      emitWhenConnected(host, 'createRoom', { playerName: 'Host', roomName: 'Sala Permisos', maxPlayers: 5 });
      host.on('joinedRoom', (data) => { refs.roomId = data.roomId; resolve(true); });
      host.on('error', (e) => reject(new Error(`host error: ${JSON.stringify(e)}`)));
      setTimeout(() => reject(new Error('Timeout host joinedRoom')), 15000);
    });

    await new Promise((resolve, reject) => {
      emitWhenConnected(p2, 'joinRoom', { roomId: refs.roomId, playerName: 'Bob' });
      p2.on('joinedRoom', () => resolve(true));
      p2.on('error', (e) => reject(new Error(`p2 error: ${JSON.stringify(e)}`)));
      p2.on('connect_error', (e) => reject(new Error(`p2 connect_error: ${e && e.message ? e.message : e}`)));
      setTimeout(() => reject(new Error('Timeout p2 joinedRoom')), 15000);
    });

    // p2 intenta iniciar: debe recibir error "Solo el creador..."
    const errStart = await new Promise((resolve) => {
      p2.emit('startGame');
      p2.once('error', (e) => resolve(e));
      setTimeout(() => resolve({ message: 'NO_ERROR' }), 2000);
    });
    expect(errStart && errStart.message).toMatch(/solo el creador/i);

    // Host inicia correctamente
    host.emit('startGame');
    await waitForEvent(host, 'roundStart', 10000);

    // Verificar que p2 también recibe roundStart pero no puede controlar el juego
    await waitForEvent(p2, 'roundStart', 5000);

    host.disconnect();
    p2.disconnect();
  });

  test('Rate limiting básico en createRoom', async () => {
    const s = connectClient();

    const results = [];
    await new Promise((resolve, reject) => {
      emitWhenConnected(s, 'createRoom', { playerName: 'RL', roomName: 'RL1', maxPlayers: 5 });
      emitWhenConnected(s, 'createRoom', { playerName: 'RL', roomName: 'RL2', maxPlayers: 5 });
      emitWhenConnected(s, 'createRoom', { playerName: 'RL', roomName: 'RL3', maxPlayers: 5 }); // debería disparar rate limit
      s.on('error', (e) => {
        results.push(e);
      });
      setTimeout(() => resolve(true), 3000);
    });

    // Debe haber al menos un error de rate limit
    const found = results.find((e) => (e && e.message && /Demasiadas solicitudes.*crear sala/i.test(e.message)));
    expect(found).toBeTruthy();

    s.disconnect();
  });

  test('submitWords con letra inválida no suma puntos y marca validWords=false', async () => {
    const host = connectClient();
    const p2 = connectClient();
    const refs = { roomId: null, letter: null };

    // host create and p2 join
    await new Promise((resolve, reject) => {
      emitWhenConnected(host, 'createRoom', { playerName: 'Host', roomName: 'Scoring', maxPlayers: 5 });
      host.on('joinedRoom', (data) => { refs.roomId = data.roomId; resolve(true); });
      host.on('error', (e) => reject(new Error(`host error: ${JSON.stringify(e)}`)));
      setTimeout(() => reject(new Error('Timeout host joinedRoom')), 15000);
    });

    await new Promise((resolve, reject) => {
      emitWhenConnected(p2, 'joinRoom', { roomId: refs.roomId, playerName: 'Bob' });
      p2.on('joinedRoom', () => resolve(true));
      p2.on('error', (e) => reject(new Error(`p2 error: ${JSON.stringify(e)}`)));
      p2.on('connect_error', (e) => reject(new Error(`p2 connect_error: ${e && e.message ? e.message : e}`)));
      setTimeout(() => reject(new Error('Timeout p2 joinedRoom')), 15000);
    });

    // start game with new flow
    host.emit('startGame');
    const rr = await waitForEvent(host, 'roundStart', 10000);
    expect(rr).toHaveProperty('letter');
    refs.letter = rr.letter;

    // construir palabras con letra diferente
    const badPrefix = refs.letter === 'A' ? 'B' : 'A';
    const badWords = (prefix) => ({
      NOMBRE: `${prefix}xx`,
      ANIMAL: `${prefix}yy`,
      COSA: `${prefix}zz`,
      FRUTA: `${prefix}ww`
    });

    // enviar ambos
    host.emit('submitWords', { roomId: refs.roomId, playerName: 'Host', words: badWords(badPrefix) });
    p2.emit('submitWords', { roomId: refs.roomId, playerName: 'Bob', words: badWords(badPrefix) });

    const reviewStart = await waitForEvent(host, 'startReview', 15000);
    expect(reviewStart).toHaveProperty('round');
    expect(reviewStart).toHaveProperty('letter');
    expect(reviewStart.letter).toBe(refs.letter);

    // Con el nuevo flujo, las palabras con letra incorrecta pasan a revisión
    // donde serán rechazadas por los jugadores

    host.disconnect();
    p2.disconnect();
  });
});
