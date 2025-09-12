
import { roomRepository } from '../repositories/roomRepository.js';

// --- Estado y Lógica de Votación ---

/**
 * Maneja la solicitud de un jugador para validar sus votos.
 * @param {object} io - Instancia de Socket.IO.
 * @param {object} socket - El socket del jugador.
 * @param {object} data - Datos de la validación.
 * @param {string} data.roomId - ID de la sala.
 * @param {string} data.playerName - Nombre del jugador.
 * @param {object} data.votes - Votos emitidos por el jugador.
 */
export function handleValidateVoting(io, socket, { roomId, playerName, votes }) {
  const room = roomRepository.findRoom(roomId);

  if (!room || room.state?.votingPhase !== 'active') {
    socket.emit('votingError', { message: 'La votación ya ha terminado.' });
    console.error(`[VOTING] Voto rechazado para ${playerName} en sala ${roomId}. La votación no está activa.`);
    return;
  }

  // Almacenar los votos del jugador
  if (!room.state.votes) {
    room.state.votes = {};
  }
  room.state.votes[playerName] = votes;

  // Marcar al jugador como que ha validado
  if (!room.state.playersValidated) {
    room.state.playersValidated = new Set();
  }
  room.state.playersValidated.add(playerName);

  console.log(`[VOTING] ${playerName} ha validado en la sala ${roomId}. (${room.state.playersValidated.size}/${room.players.length})`);

  // Notificar a todos del progreso
  const validatedPlayers = Array.from(room.state.playersValidated);
  const allPlayerNames = room.players.map(p => p.name);
  const pendingPlayers = allPlayerNames.filter(name => !validatedPlayers.includes(name));

  io.to(roomId).emit('votingProgress', {
    playersReady: validatedPlayers.length,
    totalPlayers: allPlayerNames.length,
    pendingPlayers: pendingPlayers,
  });

  // Comprobar si todos los jugadores han validado
  if (validatedPlayers.length === allPlayerNames.length) {
    console.log(`[VOTING] ¡Todos los jugadores han validado en la sala ${roomId}! Procesando resultados...`);
    
    // Marcar la votación como terminada para evitar más votos
    room.state.votingPhase = 'finished';
    io.to(roomId).emit('votingProcessing', { message: 'Todos han votado. Calculando resultados...' });

    // Usar un pequeño delay para que los jugadores vean el mensaje de "Procesando"
    setTimeout(() => {
      processAndSendResults(io, roomId);
    }, 1500);
  }
}

/**
 * Procesa los resultados de la votación y los envía a los jugadores.
 * @param {object} io - Instancia de Socket.IO.
 * @param {string} roomId - ID de la sala.
 */
function processAndSendResults(io, roomId) {
  const room = roomRepository.findRoom(roomId);
  if (!room) return;

  const { words: playersWords, votes: playerVotes, categories } = room.state;
  const results = {};
  const roundScores = {};

  // 1. Consolidar votos para cada palabra
  const wordVoteCounts = {}; // { 'player-category': { approve: 1, reject: 2 } }
  for (const voterName in playerVotes) {
    for (const wordKey in playerVotes[voterName]) {
      const vote = playerVotes[voterName][wordKey]; // true para válido, false para inválido
      if (!wordVoteCounts[wordKey]) {
        wordVoteCounts[wordKey] = { approve: 0, reject: 0 };
      }
      if (vote) {
        wordVoteCounts[wordKey].approve++;
      } else {
        wordVoteCounts[wordKey].reject++;
      }
    }
  }

  // 2. Determinar la validez de cada palabra y calcular puntajes
  for (const category of categories) {
    const wordsInCategory = [];
    // Recopilar todas las palabras válidas para esta categoría
    for (const playerName in playersWords) {
        const word = playersWords[playerName][category];
        if (!word) continue;

        const wordKey = `${playerName}-${category}`;
        const counts = wordVoteCounts[wordKey] || { approve: 0, reject: 0 };
        const isOwnWord = Object.keys(playerVotes).length === 1; // Si solo hay un votante, es su propia palabra
        const isValid = isOwnWord || counts.approve > counts.reject;

        if (isValid) {
            wordsInCategory.push(word.toLowerCase());
        }
    }

    // Calcular puntajes para cada jugador en esta categoría
    for (const playerName in playersWords) {
        if (!roundScores[playerName]) roundScores[playerName] = { total: 0, details: {} };
        
        const word = playersWords[playerName][category];
        if (!word) {
            roundScores[playerName].details[category] = { word: '-', score: 0, reason: 'No contestado' };
            continue;
        }

        const wordKey = `${playerName}-${category}`;
        const counts = wordVoteCounts[wordKey] || { approve: 0, reject: 0 };
        const isOwnWord = Object.keys(playerVotes).length === 1;
        const isValid = isOwnWord || counts.approve > counts.reject;

        let score = 0;
        let reason = '';

        if (isValid) {
            const occurrences = wordsInCategory.filter(w => w === word.toLowerCase()).length;
            if (occurrences > 1) {
                score = 5; // Palabra repetida
                reason = 'Válida, pero repetida';
            } else {
                score = 10; // Palabra única
                reason = 'Válida y única';
            }
        } else {
            score = 0; // Palabra inválida
            reason = `Rechazada por votación (${counts.approve} a favor, ${counts.reject} en contra)`;
        }
        
        roundScores[playerName].total += score;
        roundScores[playerName].details[category] = { word, score, reason, votes: counts };
    }
  }

  // 3. Actualizar puntajes y preparar datos para el ranking
  const rankingData = room.players.map(player => {
    const roundScore = roundScores[player.name]?.total || 0;
    if (!player.score) player.score = 0;
    
    // Actualizar el puntaje total del jugador en el estado de la sala
    player.score += roundScore;

    return {
      name: player.name,
      score: player.score, // Puntaje total acumulado
      scoreChange: roundScore, // Puntaje de esta ronda
    };
  });

  // Ordenar jugadores por puntaje total para asignar el ranking
  rankingData.sort((a, b) => b.score - a.score);

  // Asignar el rango (rank)
  const rankedPlayers = rankingData.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  // 4. Preparar y enviar el paquete de resultados
  const resultsData = {
    round: room.state.round,
    letter: room.state.letter,
    scores: roundScores, // Mantenemos los detalles de la ronda para la vista de detalles
    ranking: rankedPlayers, // Ranking con puntaje total, de ronda y rango
    resultsUrl: `/views/results.html?roomId=${roomId}`
  };

  console.log(`[VOTING] Resultados procesados para la sala ${roomId}. Redirigiendo jugadores.`);
  io.to(roomId).emit('show-round-results', resultsData);

  // Limpiar estado para la siguiente ronda (o mantenerlo para revisión)
  room.state.votingPhase = 'finished';
  room.state.playersValidated.clear();
  // No limpiar los votos para poder mostrarlos en la pantalla de resultados
}

/**
 * Inicia la fase de votación para una sala.
 * @param {object} io - Instancia de Socket.IO.
 * @param {string} roomId - ID de la sala.
 */
export function startVotingPhase(io, roomId) {
    const room = roomRepository.findRoom(roomId);
    if (!room) return;

    console.log(`[VOTING] Iniciando fase de votación para la sala ${roomId}`);

    // Simular que tenemos las palabras de la ronda (esto debería venir de la fase de juego)
    // En un flujo real, esto se llenaría con 'handleSubmitWords'
    if (!room.state.words) {
        console.warn(`[VOTING] No hay palabras para votar en la sala ${roomId}. Usando datos de ejemplo.`);
        // Lógica para generar datos de ejemplo si no existen
    }

    room.state.votingPhase = 'active';
    room.state.votes = {};
    room.state.playersValidated = new Set();

    // Notificar a los clientes que la fase de votación ha comenzado
    io.to(roomId).emit('votingStarted', {
        round: room.state.round,
        letter: room.state.letter,
        categories: room.state.categories,
        playersWords: room.state.words
    });
}

/**
 * Maneja la solicitud de datos de votación de un cliente.
 * @param {object} socket - El socket del jugador.
 * @param {object} data - Datos de la solicitud.
 */
export function handleRequestVotingData(socket, { roomId }) {
    const room = roomRepository.findRoom(roomId);
    if (!room || !room.state) {
        socket.emit('error', { message: 'No se encontraron datos de la sala.' });
        return;
    }

    socket.emit('votingData', {
        round: room.state.round,
        letter: room.state.letter,
        categories: room.state.categories,
        words: room.state.words,
    });
}
