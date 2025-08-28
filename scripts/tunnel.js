#!/usr/bin/env node
const localtunnel = require('localtunnel');

(async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const subdomain = undefined; // puedes fijar uno si tienes premium
    const tunnel = await localtunnel({ port, subdomain });

    console.log('==============================================');
    console.log('🔌 Tunel público activo');
    console.log(`🌐 URL pública: ${tunnel.url}`);
    console.log('Comparte esta URL con tus amigos para jugar online');
    console.log('==============================================');

    tunnel.on('close', () => {
      console.log('🔌 Tunel cerrado');
    });
  } catch (err) {
    console.error('Error al iniciar el túnel:', err);
    process.exit(1);
  }
})();


