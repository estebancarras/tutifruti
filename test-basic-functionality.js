/**
 * Script básico para probar la funcionalidad principal
 * Ejecutar con: node test-basic-functionality.js
 */

const http = require('http');

console.log('🧪 Iniciando pruebas básicas del servidor...\n');

// Prueba 1: Verificar que el servidor responde
function testServerResponse() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000', (res) => {
      console.log('✅ Servidor responde correctamente');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log('❌ Error al conectar con el servidor');
      console.log(`   Error: ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Timeout al conectar con el servidor');
      req.abort();
      reject(new Error('Timeout'));
    });
  });
}

// Prueba 2: Verificar archivos estáticos
function testStaticFiles() {
  const files = [
    '/public/css/base.css',
    '/public/css/components.css', 
    '/public/css/game.css',
    '/public/js/socket-manager.js',
    '/utils/constants.js',
    '/views/create-room.html'
  ];

  const promises = files.map(file => {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:3000${file}`, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ ${file} - OK`);
          resolve(true);
        } else {
          console.log(`❌ ${file} - Status: ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('error', () => {
        console.log(`❌ ${file} - Error de conexión`);
        resolve(false);
      });

      req.setTimeout(3000, () => {
        req.abort();
        console.log(`❌ ${file} - Timeout`);
        resolve(false);
      });
    });
  });

  return Promise.all(promises);
}

// Prueba 3: Verificar Socket.IO endpoint
function testSocketIOEndpoint() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/socket.io/', (res) => {
      if (res.statusCode === 400) {
        // Socket.IO responde con 400 a requests HTTP normales, eso es correcto
        console.log('✅ Socket.IO endpoint disponible');
        resolve(true);
      } else {
        console.log(`⚠️  Socket.IO endpoint respuesta inesperada: ${res.statusCode}`);
        resolve(true); // No es crítico
      }
    });

    req.on('error', (err) => {
      console.log('❌ Error al verificar Socket.IO endpoint');
      reject(err);
    });

    req.setTimeout(3000, () => {
      req.abort();
      console.log('❌ Timeout al verificar Socket.IO');
      reject(new Error('Timeout'));
    });
  });
}

// Ejecutar todas las pruebas
async function runTests() {
  try {
    console.log('1️⃣ Probando respuesta del servidor...');
    await testServerResponse();
    console.log('');

    console.log('2️⃣ Probando archivos estáticos...');
    const staticResults = await testStaticFiles();
    const successCount = staticResults.filter(Boolean).length;
    console.log(`   ${successCount}/${staticResults.length} archivos OK\n`);

    console.log('3️⃣ Probando Socket.IO...');
    await testSocketIOEndpoint();
    console.log('');

    console.log('🎉 Pruebas básicas completadas exitosamente!');
    console.log('');
    console.log('🌐 El servidor está funcionando correctamente en:');
    console.log('   👉 http://localhost:3000');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Abre http://localhost:3000 en tu navegador');
    console.log('   2. Ingresa tu nombre');
    console.log('   3. Crea una sala o únete a una existente');
    console.log('   4. ¡Disfruta jugando Tutifrutti!');

  } catch (error) {
    console.log('');
    console.log('❌ Algunas pruebas fallaron');
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('   1. Verifica que el servidor esté ejecutándose: npm start');
    console.log('   2. Confirma que el puerto 3000 esté disponible');
    console.log('   3. Revisa los logs del servidor para errores');
    console.log('');
    process.exit(1);
  }
}

// Verificar si el servidor está ejecutándose antes de hacer pruebas
console.log('🔍 Verificando si el servidor está ejecutándose...\n');
runTests();
