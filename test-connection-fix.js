/**
 * Test simple para verificar que la conexión no se pierde
 * durante la transición a revisión
 */

const { io } = require('socket.io-client');

async function testConnectionFix() {
  console.log('🧪 Probando corrección de conexión...');
  
  const socket = io('http://localhost:3000');
  
  try {
    // Esperar conexión
    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('✅ Conectado al servidor');
        resolve();
      });
    });
    
    // Crear sala
    socket.emit('createRoom', {
      playerName: 'TestUser',
      roomName: 'Test Connection Fix',
      maxPlayers: 5,
      rounds: 3
    });
    
    const roomData = await new Promise((resolve) => {
      socket.on('roomCreated', resolve);
    });
    
    console.log('✅ Sala creada:', roomData.roomId);
    
    // Simular inicio de juego
    socket.emit('startGame');
    
    const roundData = await new Promise((resolve) => {
      socket.on('roundStart', resolve);
    });
    
    console.log('✅ Ronda iniciada con letra:', roundData.letter);
    
    // Simular envío de palabras
    socket.emit('submitWords', {
      roomId: roomData.roomId,
      playerName: 'TestUser',
      words: {
        'NOMBRE': 'Ana',
        'ANIMAL': 'Aguila',
        'COSA': 'Auto'
      }
    });
    
    // Esperar evento de revisión
    const reviewData = await new Promise((resolve) => {
      socket.on('startReview', resolve);
    });
    
    console.log('✅ Revisión iniciada:', reviewData.message);
    
    // Verificar que la sala sigue activa
    socket.emit('getRoomState', { roomId: roomData.roomId });
    
    const roomState = await new Promise((resolve) => {
      socket.on('roomState', resolve);
    });
    
    console.log('✅ Estado de sala después de startReview:', {
      players: roomState.players.length,
      isPlaying: roomState.isPlaying
    });
    
    console.log('🎉 ¡Test completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    socket.disconnect();
  }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
  testConnectionFix();
}

module.exports = { testConnectionFix };
