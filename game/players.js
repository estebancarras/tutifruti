/**
 * Modelo de jugador para el juego Tutifrutti
 * Compatible con ES Modules y nueva arquitectura
 */

class Player {
    constructor(id, name, isCreator = false) {
        this.id = id;                    // ID del socket
        this.name = name;                // Nombre del jugador
        this.isCreator = isCreator;      // Si es el creador de la sala
        this.score = 0;                  // Puntuación total acumulada
        this.ready = false;              // Estado de preparación para la ronda
        this.words = {};                 // Palabras enviadas por ronda {letter: {category: word}}
        this.roundScores = {};           // Puntuaciones por ronda {round: {repetidas, unicas, silabas, total}}
        this.isOnline = true;            // Estado de conexión
        this.joinedAt = new Date();      // Timestamp de cuando se unió
        this.lastActivity = new Date();  // Última actividad
    }

    /**
     * Añade una palabra para una categoría y letra específica
     * @param {string} category - Categoría (NOMBRE, ANIMAL, etc.)
     * @param {string} word - Palabra ingresada
     * @param {string} letter - Letra de la ronda
     * @param {boolean} isValid - Si la palabra es válida
     */
    addWord(category, word, letter, isValid = true) {
        if (!this.words[letter]) {
            this.words[letter] = {};
        }
        
        this.words[letter][category] = {
            word: word.trim(),
            isValid: isValid,
            timestamp: new Date(),
            syllables: this.countSyllables(word)
        };
        
        this.updateLastActivity();
    }

    /**
     * Actualiza la puntuación del jugador
     * @param {number} points - Puntos a añadir
     * @returns {number} Puntuación total actualizada
     */
    updateScore(points) {
        this.score += points;
        this.updateLastActivity();
        return this.score;
    }

    /**
     * Establece la puntuación de una ronda específica
     * @param {number} round - Número de ronda
     * @param {Object} scoreBreakdown - Desglose de puntuación
     */
    setRoundScore(round, scoreBreakdown) {
        this.roundScores[round] = {
            repetidas: scoreBreakdown.repetidas || 0,
            unicas: scoreBreakdown.sinRepetir || 0,
            silabas: scoreBreakdown.masDeTresSilabas || 0,
            total: scoreBreakdown.total || 0,
            timestamp: new Date()
        };
        
        this.updateLastActivity();
    }

    /**
     * Obtiene las palabras de una ronda específica
     * @param {string} letter - Letra de la ronda
     * @returns {Object} Palabras de la ronda
     */
    getWordsForRound(letter) {
        return this.words[letter] || {};
    }

    /**
     * Verifica si el jugador ha enviado palabras para una letra
     * @param {string} letter - Letra de la ronda
     * @returns {boolean} True si ha enviado palabras
     */
    hasSubmittedForRound(letter) {
        return letter in this.words && Object.keys(this.words[letter]).length > 0;
    }

    /**
     * Marca al jugador como listo para la siguiente ronda
     * @param {boolean} ready - Estado de preparación
     */
    setReady(ready = true) {
        this.ready = ready;
        this.updateLastActivity();
    }

    /**
     * Actualiza el estado de conexión
     * @param {boolean} online - Estado de conexión
     */
    setOnlineStatus(online) {
        this.isOnline = online;
        if (online) {
            this.updateLastActivity();
        }
    }

    /**
     * Actualiza la marca de tiempo de última actividad
     */
    updateLastActivity() {
        this.lastActivity = new Date();
    }

    /**
     * Cuenta las sílabas de una palabra (método simplificado para español)
     * @param {string} word - Palabra
     * @returns {number} Número estimado de sílabas
     */
    countSyllables(word) {
        if (!word || typeof word !== 'string') return 0;
        
        const vowels = ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü'];
        let syllables = 0;
        let prevIsVowel = false;
        
        for (let i = 0; i < word.toLowerCase().length; i++) {
            const isVowel = vowels.includes(word.toLowerCase()[i]);
            if (isVowel && !prevIsVowel) {
                syllables++;
            }
            prevIsVowel = isVowel;
        }
        
        return syllables || 1; // Mínimo 1 sílaba
    }

    /**
     * Obtiene estadísticas del jugador
     * @returns {Object} Estadísticas del jugador
     */
    getStats() {
        const totalRounds = Object.keys(this.roundScores).length;
        const totalWords = Object.values(this.words).reduce((acc, round) => 
            acc + Object.keys(round).length, 0
        );
        
        return {
            name: this.name,
            totalScore: this.score,
            totalRounds,
            totalWords,
            averageScore: totalRounds > 0 ? Math.round(this.score / totalRounds) : 0,
            isOnline: this.isOnline,
            isCreator: this.isCreator,
            joinedAt: this.joinedAt,
            lastActivity: this.lastActivity
        };
    }

    /**
     * Serializa el jugador para envío por red
     * @returns {Object} Datos del jugador serializados
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            isCreator: this.isCreator,
            score: this.score,
            ready: this.ready,
            isOnline: this.isOnline,
            stats: this.getStats()
        };
    }
}

// Exportar para Node.js y ES Modules
if (typeof module !== 'undefined' && module.exports) {
module.exports = { Player };
} else if (typeof window !== 'undefined') {
    window.Player = Player;
}
