# Ejemplos de Código para Black Box - Proyecto Tutti Frutti

Este documento proporciona ejemplos de código para implementar algunas de las funcionalidades sugeridas en el proyecto Tutti Frutti.

## 1. Sistema de Puntuación Completo

### Servidor (server.js)

```javascript
// Función para calcular puntuaciones al final de la ronda
socket.on('submitWords', ({ roomId, playerName, words }) => {
  const gameState = gameStates[roomId];
  if (!gameState) return;
  
  // Guardar las palabras enviadas por el jugador
  gameState.words[playerName] = words;
  
  // Verificar si todos los jugadores han enviado sus palabras
  const allPlayersSubmitted = gameState.players.every(player => 
    gameState.words[player.name] && Object.keys(gameState.words[player.name]).length > 0
  );
  
  if (allPlayersSubmitted || gameState.timeRemaining <= 0) {
    // Calcular puntuaciones
    const scores = calculateScores(gameState.words, gameState.rules, gameState.categories);
    
    // Actualizar puntuaciones en el estado del juego
    Object.keys(scores).forEach(player => {
      const playerIndex = gameState.players.findIndex(p => p.name === player);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].score += scores[player].total;
        gameState.scores[player] = scores[player];
      }
    });
    
    // Notificar a todos los jugadores
    io.to(roomId).emit('roundEnded', {
      scores: gameState.scores,
      words: gameState.words,
      playerScores: gameState.players.map(p => ({ name: p.name, score: p.score }))
    });
    
    // Reiniciar para la siguiente ronda
    gameState.words = {};
    gameState.currentRound++;
    gameState.timeRemaining = gameState.timeLimit;
    
    // Si es la última ronda, finalizar el juego
    if (gameState.currentRound >= gameState.maxRounds) {
      io.to(roomId).emit('gameEnded', {
        finalScores: gameState.players.map(p => ({ name: p.name, score: p.score }))
      });
      
      // Guardar resultados en la base de datos
      saveGameResults(roomId, gameState);
    }
  }
});

// Función para calcular puntuaciones
function calculateScores(allPlayerWords, rules, categories) {
  const wordCounts = {};
  const playerScores = {};
  
  // Inicializar puntuaciones para cada jugador
  Object.keys(allPlayerWords).forEach(player => {
    playerScores[player] = { repetidas: 0, sinRepetir: 0, masDeTresSilabas: 0, total: 0 };
  });
  
  // Contar palabras por regla y categoría
  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const key = `${ruleIndex}-${catIndex}`;
      wordCounts[key] = {};
      
      // Contar palabras de cada jugador
      Object.keys(allPlayerWords).forEach(player => {
        if (!allPlayerWords[player][ruleIndex] || !allPlayerWords[player][ruleIndex][catIndex]) return;
        
        const word = allPlayerWords[player][ruleIndex][catIndex].toLowerCase().trim();
        if (!word) return;
        
        if (!wordCounts[key][word]) {
          wordCounts[key][word] = [];
        }
        
        wordCounts[key][word].push(player);
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

// Función para contar sílabas en español
function countSyllables(word) {
  word = word.toLowerCase();
  if (!word) return 0;
  
  // Reglas básicas para contar sílabas en español
  // Esta es una implementación simplificada
  const vowels = ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü'];
  const diphthongs = ['ai', 'au', 'ei', 'eu', 'io', 'iu', 'oi', 'ou', 'ua', 'ue', 'ui', 'uo'];
  
  let syllables = 0;
  let i = 0;
  
  while (i < word.length) {
    // Verificar si es vocal
    if (vowels.includes(word[i])) {
      syllables++;
      
      // Verificar si forma diptongo con la siguiente letra
      if (i < word.length - 1) {
        const possibleDiphthong = word.substring(i, i + 2);
        if (diphthongs.includes(possibleDiphthong)) {
          i += 2; // Saltar el diptongo completo
          continue;
        }
      }
      
      // Saltar todas las vocales consecutivas (excepto diptongos)
      while (i < word.length && vowels.includes(word[i])) {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return syllables;
}

// Función para guardar resultados en la base de datos
async function saveGameResults(roomId, gameState) {
  try {
    // Crear nuevo documento de juego
    const game = new Game({
      roomId,
      players: gameState.players.map(p => ({ username: p.name, score: p.score })),
      categories: gameState.categories,
      rules: gameState.rules,
      startedAt: gameState.startTime,
      endedAt: new Date(),
      words: gameState.words
    });
    
    await game.save();
    
    // Actualizar estadísticas de usuarios
    for (const player of gameState.players) {
      await User.findOneAndUpdate(
        { username: player.name },
        { 
          $inc: { 
            gamesPlayed: 1,
            totalScore: player.score
          }
        },
        { upsert: true }
      );
    }
    
    console.log(`Juego ${roomId} guardado en la base de datos`);
  } catch (error) {
    console.error('Error al guardar resultados:', error);
  }
}
```

### Cliente (game.js)

```javascript
// Escuchar evento de fin de ronda
socket.on('roundEnded', ({ scores, words, playerScores }) => {
  // Actualizar puntuaciones en la interfaz
  updateScoreTable(scores);
  
  // Mostrar palabras de todos los jugadores
  displayAllPlayerWords(words);
  
  // Actualizar clasificación
  updateLeaderboard(playerScores);
  
  // Mostrar mensaje
  document.getElementById('selectedLetter').innerText = 'Ronda finalizada. Preparando siguiente ronda...';
});

// Función para actualizar la tabla de puntuaciones
function updateScoreTable(scores) {
  const scoreTable = document.getElementById('scoreTable');
  if (!scoreTable) return;
  
  // Obtener puntuaciones del jugador actual
  const playerScore = scores[username] || { repetidas: 0, sinRepetir: 0, masDeTresSilabas: 0, total: 0 };
  
  // Actualizar las celdas de la tabla
  const tbody = scoreTable.querySelector('tbody');
  if (tbody && tbody.rows.length > 0) {
    const row = tbody.rows[0];
    if (row.cells.length >= 5) {
      row.cells[1].textContent = playerScore.repetidas;
      row.cells[2].textContent = `${playerScore.sinRepetir} x 2`;
      row.cells[3].textContent = `${playerScore.masDeTresSilabas} x 3`;
      row.cells[4].textContent = playerScore.total;
    }
  }
}

// Función para mostrar palabras de todos los jugadores
function displayAllPlayerWords(allWords) {
  // Crear modal para mostrar todas las palabras
  const modal = document.createElement('div');
  modal.className = 'words-modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'words-modal-content';
  
  // Título
  const title = document.createElement('h2');
  title.textContent = 'Palabras de todos los jugadores';
  modalContent.appendChild(title);
  
  // Tabla de palabras
  const table = document.createElement('table');
  table.className = 'all-words-table';
  
  // Encabezado
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Celda vacía para la esquina
  headerRow.appendChild(document.createElement('th'));
  
  // Encabezados para cada categoría
  categories.forEach(category => {
    const th = document.createElement('th');
    th.textContent = category;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Cuerpo de la tabla
  const tbody = document.createElement('tbody');
  
  // Filas para cada regla
  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    const row = document.createElement('tr');
    
    // Celda con la regla
    const ruleCell = document.createElement('td');
    ruleCell.textContent = rules[ruleIndex];
    ruleCell.className = 'rule-cell';
    row.appendChild(ruleCell);
    
    // Celdas para cada categoría
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const cell = document.createElement('td');
      
      // Crear lista de palabras para esta celda
      const wordsList = document.createElement('ul');
      
      // Añadir palabras de cada jugador
      Object.keys(allWords).forEach(player => {
        if (allWords[player][ruleIndex] && 
            allWords[player][ruleIndex][catIndex] && 
            allWords[player][ruleIndex][catIndex].trim()) {
          
          const word = allWords[player][ruleIndex][catIndex].trim();
          const listItem = document.createElement('li');
          
          // Contar cuántos jugadores usaron esta palabra
          let wordCount = 0;
          Object.keys(allWords).forEach(p => {
            if (allWords[p][ruleIndex] && 
                allWords[p][ruleIndex][catIndex] && 
                allWords[p][ruleIndex][catIndex].trim().toLowerCase() === word.toLowerCase()) {
              wordCount++;
            }
          });
          
          // Aplicar clase según si es repetida o no
          const wordClass = wordCount > 1 ? 'repeated-word' : 'unique-word';
          
          listItem.innerHTML = `<span class="${wordClass}">${word}</span> <small>(${player})</small>`;
          wordsList.appendChild(listItem);
        }
      });
      
      cell.appendChild(wordsList);
      row.appendChild(cell);
    }
    
    tbody.appendChild(row);
  }
  
  table.appendChild(tbody);
  modalContent.appendChild(table);
  
  // Botón para cerrar
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Cerrar';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}
```

## 2. Validación de Palabras Mejorada

```javascript
// En server.js
const axios = require('axios');

// Función para validar palabra usando API externa
async function validateWord(word, language = 'es') {
  try {
    // Usando la API de Datamuse para verificar si la palabra existe
    const response = await axios.get(`https://api.datamuse.com/words?sp=${word}&md=d&max=1`);
    
    // Si hay resultados y tienen definiciones, la palabra es válida
    return response.data.length > 0 && response.data[0].defs;
  } catch (error) {
    console.error('Error al validar palabra:', error);
    // En caso de error, asumimos que la palabra es válida
    return true;
  }
}

// Función para verificar si una palabra cumple con una regla
function wordMatchesRule(word, rule) {
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

// Función para verificar palabras inapropiadas
function containsInappropriateContent(word) {
  // Lista básica de palabras inapropiadas
  const inappropriateWords = [
    // Añadir lista de palabras inapropiadas
  ];
  
  return inappropriateWords.some(badWord => 
    word.toLowerCase().includes(badWord.toLowerCase())
  );
}

// Modificar la función de envío de palabras para incluir validación
socket.on('submitWords', async ({ roomId, playerName, words }) => {
  const gameState = gameStates[roomId];
  if (!gameState) return;
  
  // Validar cada palabra
  const validatedWords = {};
  const validWords = {};
  
  for (const ruleIndex in words) {
    validatedWords[ruleIndex] = {};
    validWords[ruleIndex] = {};
    
    for (const catIndex in words[ruleIndex]) {
      const word = words[ruleIndex][catIndex].trim();
      
      if (!word) {
        validatedWords[ruleIndex][catIndex] = '';
        validWords[ruleIndex][catIndex] = false;
        continue;
      }
      
      // Verificar si cumple con la regla
      const matchesRule = wordMatchesRule(word, gameState.rules[ruleIndex]);
      
      // Verificar si es una palabra inapropiada
      const isInappropriate = containsInappropriateContent(word);
      
      // Verificar si es una palabra válida en el diccionario
      const isValidWord = await validateWord(word);
      
      // La palabra es válida si cumple con la regla, no es inapropiada y existe en el diccionario
      const isValid = matchesRule && !isInappropriate && isValidWord;
      
      validatedWords[ruleIndex][catIndex] = word;
      validWords[ruleIndex][catIndex] = isValid;
    }
  }
  
  // Guardar las palabras validadas
  gameState.words[playerName] = validatedWords;
  gameState.validWords = gameState.validWords || {};
  gameState.validWords[playerName] = validWords;
  
  // Resto de la lógica para procesar las palabras enviadas...
});
```

## 3. Interfaz de Usuario Mejorada

### CSS (gameStyles.css)

```css
/* Animaciones para la tabla */
@keyframes highlightCell {
  0% { background-color: rgba(255, 255, 0, 0.2); }
  50% { background-color: rgba(255, 255, 0, 0.5); }
  100% { background-color: rgba(255, 255, 0, 0.2); }
}

/* Estilos para la tabla principal */
#tuttiTable {
  border-collapse: collapse;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

#tuttiTable th {
  background-color: #4CAF50;
  color: white;
  text-transform: uppercase;
  padding: 12px;
  text-align: center;
  font-weight: bold;
  letter-spacing: 1px;
}

#tuttiTable td {
  padding: 10px;
  text-align: center;
  border: 1px solid #ddd;
  position: relative;
}

#tuttiTable tr:nth-child(even) {
  background-color: #f9f9f9;
}

#tuttiTable tr:hover {
  background-color: #f1f1f1;
}

/* Estilos para los inputs */
.wordInput {
  width: 100%;
  padding: 8px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.wordInput:focus {
  border-color: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  outline: none;
}

.wordInput:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

/* Estilos para palabras válidas e inválidas */
.valid-word {
  color: #4CAF50;
  font-weight: bold;
}

.invalid-word {
  color: #f44336;
  text-decoration: line-through;
}

.repeated-word {
  color: #ff9800;
}

.unique-word {
  color: #2196F3;
  font-weight: bold;
}

/* Estilos para el modal de palabras */
.words-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.words-modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Animación para el temporizador */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

#timerDisplay.warning {
  color: #f44336;
  animation: pulse 0.5s infinite;
}

/* Diseño responsive */
@media (max-width: 768px) {
  #tuttiTable th, #tuttiTable td {
    padding: 8px 4px;
    font-size: 14px;
  }
  
  .wordInput {
    font-size: 14px;
    padding: 6px;
  }
  
  #timerDisplay, #selectedLetter {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  #tuttiTable {
    font-size: 12px;
  }
  
  .wordInput {
    font-size: 12px;
    padding: 4px;
  }
  
  #wordInputContainer {
    padding: 10px 5px;
  }
}
```

## 4. Persistencia de Datos con MongoDB

```javascript
// En server.js
const mongoose = require('mongoose');
const connectMongo = require('connect-mongo');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tutifruti', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error al conectar a MongoDB:', err));

// Definir esquemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: String,
  password: String, // Debería estar hasheado
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const gameSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  roomName: String,
  players: [{
    username: String,
    score: Number,
    words: mongoose.Schema.Types.Mixed,
    validWords: mongoose.Schema.Types.Mixed
  }],
  categories: [String],
  rules: [String],
  rounds: { type: Number, default: 1 },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  winner: String
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  roomName: String,
  creator: String,
  maxPlayers: { type: Number, default: 5 },
  isPrivate: { type: Boolean, default: false },
  password: String,
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true }
});

// Crear modelos
const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);
const Room = mongoose.model('Room', roomSchema);

// Función para guardar una nueva sala
async function saveRoom(roomData) {
  try {
    const room = new Room(roomData);
    await room.save();
    return room;
  } catch (error) {
    console.error('Error al guardar sala:', error);
    return null;
  }
}

// Función para guardar un nuevo usuario
async function saveUser(userData) {
  try {
    // Verificar si el usuario ya existe
    let user = await User.findOne({ username: userData.username });
    
    if (user) {
      // Actualizar último login
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Crear nuevo usuario
      user = new User(userData);
      await user.save();
    }
    
    return user;
  } catch (error) {
    console.error('Error al guardar usuario:', error);
    return null;
  }
}

// Función para guardar resultados del juego
async function saveGameResults(gameData) {
  try {
    // Crear nuevo juego
    const game = new Game(gameData);
    await game.save();
    
    // Actualizar estadísticas de usuarios
    const winner = gameData.players.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
    
    // Actualizar estadísticas del ganador
    await User.findOneAndUpdate(
      { username: winner.username },
      { $inc: { gamesWon: 1 } }
    );
    
    // Actualizar estadísticas de todos los jugadores
    for (const player of gameData.players) {
      await User.findOneAndUpdate(
        { username: player.username },
        { 
          $inc: { 
            gamesPlayed: 1,
            totalScore: player.score
          }
        }
      );
    }
    
    return game;
  } catch (error) {
    console.error('Error al guardar resultados del juego:', error);
    return null;
  }
}

// Modificar la función de crear sala para guardar en la base de datos
socket.on('createRoom', async ({ playerName, roomName, maxPlayers, isPrivate, password }) => {
  const roomId = generateRoomId();
  const newRoom = {
    roomId,
    roomName: roomName || `Sala de ${playerName}`,
    creator: playerName,
    currentPlayers: 1,
    maxPlayers: maxPlayers || 5,
    isPrivate: isPrivate || false,
    password,
    createdAt: new Date()
  };
  
  // Guardar sala en la base de datos
  await saveRoom({
    roomId,
    roomName: newRoom.roomName,
    creator: playerName,
    maxPlayers: newRoom.maxPlayers,
    isPrivate: newRoom.isPrivate,
    password: newRoom.password
  });
  
  // Guardar o actualizar usuario
  await saveUser({
    username: playerName,
    lastLogin: new Date()
  });
  
  // Resto de la lógica para crear la sala...
});
```

Estos ejemplos de código proporcionan una base para implementar las funcionalidades sugeridas en el proyecto Tutti Frutti. Puedes adaptarlos según las necesidades específicas del proyecto y expandirlos con características adicionales.