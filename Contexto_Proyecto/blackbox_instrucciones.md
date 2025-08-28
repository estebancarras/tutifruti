# Instrucciones para Black Box - Proyecto Tutti Frutti

## Objetivo

Continuar con el desarrollo del juego Tutti Frutti, mejorando funcionalidades existentes e implementando nuevas características.

## Estado Actual

El proyecto tiene implementada la estructura básica del juego:
- Sistema de salas multijugador
- Interfaz de juego con tabla de reglas y categorías
- Temporizador con animación
- Validación básica de palabras según reglas

## Tareas Prioritarias

1. **Implementar sistema de puntuación completo**
   - Calcular puntos para palabras repetidas (1 punto)
   - Calcular puntos para palabras únicas (2 puntos)
   - Calcular puntos para palabras con más de 3 sílabas (3 puntos)
   - Actualizar la tabla de puntuación en tiempo real

2. **Mejorar la validación de palabras**
   - Implementar verificación contra un diccionario o API externa
   - Detectar palabras inapropiadas
   - Mejorar la lógica de validación según las reglas

3. **Implementar persistencia de datos**
   - Configurar conexión a MongoDB (ya incluida en dependencias)
   - Crear modelos para usuarios, salas y partidas
   - Guardar historial de partidas y puntuaciones

4. **Mejorar la interfaz de usuario**
   - Añadir animaciones y efectos visuales
   - Implementar diseño responsive
   - Mejorar la experiencia de usuario en dispositivos móviles

## Archivos Clave para Modificar

1. **server.js**
   - Implementar lógica de puntuación en el servidor
   - Añadir validación de palabras mejorada
   - Configurar conexión a MongoDB

2. **game.js**
   - Actualizar la lógica del cliente para manejar puntuaciones
   - Mejorar la visualización de resultados
   - Implementar animaciones adicionales

3. **game.html y gameStyles.css**
   - Mejorar la estructura y estilos de la interfaz
   - Añadir elementos visuales para mejor experiencia de usuario

## Sugerencias de Implementación

### Sistema de Puntuación

```javascript
// Ejemplo de lógica para calcular puntuaciones
function calculateScores(allPlayerWords) {
  const wordCounts = {};
  const playerScores = {};
  
  // Contar palabras repetidas
  Object.keys(allPlayerWords).forEach(player => {
    playerScores[player] = { repetidas: 0, sinRepetir: 0, masDeTresSilabas: 0, total: 0 };
    
    Object.keys(allPlayerWords[player]).forEach(ruleIndex => {
      Object.keys(allPlayerWords[player][ruleIndex]).forEach(catIndex => {
        const word = allPlayerWords[player][ruleIndex][catIndex].toLowerCase();
        if (!word) return;
        
        if (!wordCounts[`${ruleIndex}-${catIndex}`]) {
          wordCounts[`${ruleIndex}-${catIndex}`] = {};
        }
        
        if (!wordCounts[`${ruleIndex}-${catIndex}`][word]) {
          wordCounts[`${ruleIndex}-${catIndex}`][word] = [];
        }
        
        wordCounts[`${ruleIndex}-${catIndex}`][word].push(player);
      });
    });
  });
  
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

// Función para contar sílabas (simplificada)
function countSyllables(word) {
  // Implementar lógica para contar sílabas en español
  // Esta es una versión muy simplificada
  const vowels = ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú'];
  let count = 0;
  let prevIsVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i].toLowerCase());
    if (isVowel && !prevIsVowel) {
      count++;
    }
    prevIsVowel = isVowel;
  }
  
  return count;
}
```

### Conexión a MongoDB

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

// Definir modelos
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  gamesPlayed: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const gameSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  players: [{
    username: String,
    score: Number
  }],
  categories: [String],
  rules: [String],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  words: mongoose.Schema.Types.Mixed
});

const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);

// Usar connect-mongo para almacenar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'tutifruti_secret_key',
  resave: false,
  saveUninitialized: true,
  store: connectMongo.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/tutifruti' }),
  cookie: { secure: false }
}));
```

## Recursos Útiles

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [MongoDB Node.js Driver](https://docs.mongodb.com/drivers/node/current/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Express.js Documentation](https://expressjs.com/)

## Notas Adicionales

- El proyecto utiliza Socket.io para comunicación en tiempo real, asegúrate de mantener esta estructura
- La validación de palabras puede mejorarse utilizando APIs como [Datamuse](https://www.datamuse.com/api/) o [WordsAPI](https://www.wordsapi.com/)
- Considera implementar un sistema de niveles o logros para aumentar la retención de usuarios
- Añade funcionalidades sociales como chat o lista de amigos

Para más detalles sobre la estructura y lógica del proyecto, consulta los archivos `proyecto_contexto.md` y `blackbox_config.md`.