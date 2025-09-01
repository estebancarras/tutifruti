/**
 * ReviewState - Gestión de estado para la fase de revisión social
 * Maneja datos de jugadores, palabras, votos, consenso y estadísticas
 */

export class ReviewState {
  constructor() {
    this.data = {
      roomId: null,
      round: 1,
      letter: null,
      players: [],
      currentPlayerIndex: 0,
      words: {},          // { playerName: { categoryIndex: { word, votes: { approve: [], reject: [] } } } }
      timer: null,
      stats: {
        totalWords: 0,
        wordsReviewed: 0,
        consensusReached: 0,
        playersRemaining: 0
      },
      reviewEnded: false,
      isHost: false
    };
    
    this.listeners = new Map();
  }

  /**
   * Inicializar estado con datos del servidor
   * @param {Object} reviewData - Datos de revisión del servidor
   */
  initialize(reviewData) {
    console.log('🔧 Inicializando ReviewState:', reviewData);
    
    this.data = {
      ...this.data,
      roomId: reviewData.roomId,
      round: reviewData.round,
      letter: reviewData.letter,
      players: reviewData.players || [],
      currentPlayerIndex: reviewData.currentPlayerIndex || 0,
      words: this.processWordsData(reviewData.words || {}),
      timer: reviewData.timer,
      isHost: reviewData.isHost || false
    };
    
    this.updateStats();
    this.emit('initialized', this.data);
  }

  /**
   * Procesar datos de palabras para estructura de votos
   * @param {Object} rawWords - Palabras del servidor
   * @returns {Object} Palabras estructuradas con votos
   */
  processWordsData(rawWords) {
    const processedWords = {};
    
    Object.entries(rawWords).forEach(([playerName, playerWords]) => {
      processedWords[playerName] = {};
      
      playerWords.forEach((word, categoryIndex) => {
        if (word && word.trim()) {
          processedWords[playerName][categoryIndex] = {
            word: word.trim(),
            category: this.getCategoryName(categoryIndex),
            votes: {
              approve: [],
              reject: []
            },
            consensus: null, // 'approve', 'reject', null
            finalStatus: null // para cuando se finalice la votación
          };
        }
      });
    });
    
    return processedWords;
  }

  /**
   * Actualizar votos de una palabra específica
   * @param {Object} voteUpdate - Actualización de voto del servidor
   */
  updateVotes(voteUpdate) {
    const { wordId, votes, consensus } = voteUpdate;
    const [playerName, categoryIndex] = wordId.split('-');
    
    if (this.data.words[playerName] && this.data.words[playerName][categoryIndex]) {
      this.data.words[playerName][categoryIndex].votes = votes;
      this.data.words[playerName][categoryIndex].consensus = consensus;
      
      this.updateStats();
      this.emit('voteUpdated', { wordId, votes, consensus });
    }
  }

  /**
   * Cambiar al siguiente jugador
   * @param {string} newPlayerName - Nombre del nuevo jugador actual
   */
  changeCurrentPlayer(newPlayerName) {
    const playerIndex = this.data.players.findIndex(p => p.name === newPlayerName);
    if (playerIndex !== -1) {
      this.data.currentPlayerIndex = playerIndex;
      this.emit('playerChanged', { 
        currentPlayer: newPlayerName, 
        playerIndex 
      });
    }
  }

  /**
   * Actualizar timer
   * @param {number} timeLeft - Tiempo restante en segundos
   */
  updateTimer(timeLeft) {
    this.data.timer = timeLeft;
    this.emit('timerUpdated', timeLeft);
  }

  /**
   * Marcar jugador como desconectado
   * @param {string} playerName - Nombre del jugador
   */
  markPlayerDisconnected(playerName) {
    const player = this.data.players.find(p => p.name === playerName);
    if (player) {
      player.connected = false;
      this.emit('playerDisconnected', playerName);
    }
  }

  /**
   * Obtener estadísticas de una palabra específica
   * @param {string} wordId - ID de la palabra
   * @returns {Object} Estadísticas de la palabra
   */
  getWordStats(wordId) {
    const [playerName, categoryIndex] = wordId.split('-');
    const wordData = this.data.words[playerName]?.[categoryIndex];
    
    if (!wordData) return null;
    
    return {
      approveCount: wordData.votes.approve.length,
      rejectCount: wordData.votes.reject.length,
      totalVotes: wordData.votes.approve.length + wordData.votes.reject.length,
      consensus: wordData.consensus,
      needsMoreVotes: this.needsMoreVotes(wordData)
    };
  }

  /**
   * Verificar si un jugador puede votar por una palabra
   * @param {string} playerName - Nombre del jugador
   * @param {string} wordId - ID de la palabra
   * @returns {boolean}
   */
  canPlayerVote(playerName, wordId) {
    const [wordPlayerName] = wordId.split('-');
    
    // No puede votar por sus propias palabras
    if (wordPlayerName === playerName) return false;
    
    const wordData = this.getWordData(wordId);
    if (!wordData) return false;
    
    // Verificar si ya votó
    const hasVoted = wordData.votes.approve.includes(playerName) || 
                     wordData.votes.reject.includes(playerName);
    
    return !hasVoted;
  }

  /**
   * Obtener progreso de votación por jugador
   * @param {string} playerName - Nombre del jugador
   * @returns {Object} Progreso de votación
   */
  getPlayerVotingProgress(playerName) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return { voted: 0, total: 0, percentage: 0 };
    
    const playerWords = this.data.words[currentPlayer.name] || {};
    const totalWords = Object.keys(playerWords).length;
    let votedWords = 0;
    
    Object.entries(playerWords).forEach(([categoryIndex, wordData]) => {
      const wordId = `${currentPlayer.name}-${categoryIndex}`;
      if (!this.canPlayerVote(playerName, wordId)) {
        votedWords++;
      }
    });
    
    return {
      voted: votedWords,
      total: totalWords,
      percentage: totalWords > 0 ? Math.round((votedWords / totalWords) * 100) : 0
    };
  }

  /**
   * Obtener jugador actual siendo evaluado
   * @returns {Object|null}
   */
  getCurrentPlayer() {
    return this.data.players[this.data.currentPlayerIndex] || null;
  }

  /**
   * Obtener palabras del jugador actual
   * @returns {Object}
   */
  getCurrentPlayerWords() {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer ? this.data.words[currentPlayer.name] || {} : {};
  }

  /**
   * Verificar si una palabra necesita más votos
   * @param {Object} wordData - Datos de la palabra
   * @returns {boolean}
   */
  needsMoreVotes(wordData) {
    const totalVotes = wordData.votes.approve.length + wordData.votes.reject.length;
    const minVotesRequired = Math.max(2, Math.floor(this.data.players.length * 0.6));
    return totalVotes < minVotesRequired && !wordData.consensus;
  }

  /**
   * Actualizar estadísticas generales
   */
  updateStats() {
    let totalWords = 0;
    let wordsReviewed = 0;
    let consensusReached = 0;
    
    Object.values(this.data.words).forEach(playerWords => {
      Object.values(playerWords).forEach(wordData => {
        totalWords++;
        
        const totalVotes = wordData.votes.approve.length + wordData.votes.reject.length;
        if (totalVotes > 0) wordsReviewed++;
        if (wordData.consensus) consensusReached++;
      });
    });
    
    this.data.stats = {
      totalWords,
      wordsReviewed,
      consensusReached,
      playersRemaining: Math.max(0, this.data.players.length - this.data.currentPlayerIndex - 1)
    };
    
    this.emit('statsUpdated', this.data.stats);
  }

  /**
   * Obtener datos de una palabra específica
   * @param {string} wordId - ID de la palabra
   * @returns {Object|null}
   */
  getWordData(wordId) {
    const [playerName, categoryIndex] = wordId.split('-');
    return this.data.words[playerName]?.[categoryIndex] || null;
  }

  /**
   * Obtener nombre de categoría por índice
   * @param {number} index - Índice de categoría
   * @returns {string}
   */
  getCategoryName(index) {
    // Importar categorías desde constants.js (simplificado por ahora)
    const categories = [
      'Nombre', 'Animal', 'Cosa', 'País', 'Ciudad', 'Comida',
      'Profesión', 'Color', 'Marca', 'Película', 'Deporte', 'Planta'
    ];
    return categories[index] || `Categoría ${index + 1}`;
  }

  /**
   * Agregar listener para eventos de estado
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remover listener de evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emitir evento a listeners
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos del evento
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error en listener de ${event}:`, error);
      }
    });
  }

  /**
   * Obtener estado completo
   * @returns {Object}
   */
  getState() {
    return { ...this.data };
  }

  /**
   * Resetear estado
   */
  reset() {
    this.data = {
      roomId: null,
      round: 1,
      letter: null,
      players: [],
      currentPlayerIndex: 0,
      words: {},
      timer: null,
      stats: {
        totalWords: 0,
        wordsReviewed: 0,
        consensusReached: 0,
        playersRemaining: 0
      },
      reviewEnded: false,
      isHost: false
    };
    
    this.listeners.clear();
    this.emit('reset');
  }
}