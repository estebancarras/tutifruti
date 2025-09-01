// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Flujo E2E: crear sala, unirse y arrancar juego', () => {
  test('host crea, invitado se une, host inicia juego y ambos llegan a game', async ({ browser }) => {
    console.log('🚀 Iniciando test de flujo de salas...');
    
    // Crear dos contextos para simular dos jugadores
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const host = await context1.newPage();
    const guest = await context2.newPage();

    try {
      console.log('📱 Navegando a index...');
      
      // HOST: ir a index y crear sala
      await host.goto('https://tutifruti-3ii6.onrender.com', { timeout: 15000 });
      console.log('✅ Host llegó a index');
      
      await host.fill('#username', 'host-e2e');
      await host.click('#createRoomButton');
      console.log('✅ Host hizo clic en botón crear sala');
      
      await host.waitForURL('**/create-room.html', { timeout: 15000 });
      console.log('✅ Host llegó a create-room.html');
      
      await host.fill('#roomName', 'Sala Test E2E');
      await host.click('#createRoomButton');
      console.log('✅ Host creó sala');
      
      // Obtener código de sala
      await host.waitForSelector('#roomCodeValue', { state: 'visible', timeout: 15000 });
      const roomCode = await host.textContent('#roomCodeValue');
      console.log(`✅ Código de sala obtenido: ${roomCode}`);
      
      // GUEST: ir a index y unirse
      console.log('👥 Invitado se une...');
      await guest.goto('https://tutifruti-3ii6.onrender.com', { timeout: 15000 });
      await guest.fill('#username', 'guest-e2e');
      await guest.click('#joinRoomButton');
      
      await guest.waitForURL('**/join-room.html', { timeout: 10000 });
      await guest.fill('#joinRoomId', roomCode.trim());
      await guest.click('#joinRoomButton');
      console.log('✅ Invitado se unió a la sala');
      
      // Esperar que ambos estén en la sala
      await host.waitForSelector('.player-item', { state: 'visible', timeout: 10000 });
      await guest.waitForSelector('.waiting-room', { state: 'visible', timeout: 10000 });
      console.log('✅ Ambos están en la sala de espera');
      
      // HOST: iniciar juego
      console.log('🎮 Iniciando juego...');
      await host.click('#goToGameButton');
      
      // Ambos deberían ir al juego
      await host.waitForURL('**/game.html*', { timeout: 10000 });
      await guest.waitForURL('**/game.html*', { timeout: 10000 });
      console.log('✅ Ambos llegaron al juego');
      
      // Esperar que se cargue la interfaz del juego
      await host.waitForSelector('#categoriesGrid .category-card', { timeout: 10000 });
      await guest.waitForSelector('#categoriesGrid .category-card', { timeout: 10000 });
      console.log('✅ Interfaz del juego cargada');
      
      // UI de juego: nombre de jugador visible y contador >= 2
      await expect(host.locator('#currentPlayerName')).toContainText('host-e2e');
      await expect(guest.locator('#currentPlayerName')).toContainText('guest-e2e');
      await expect(host.locator('#playersCount')).toContainText('2/');
      await expect(guest.locator('#playersCount')).toContainText('2/');
      console.log('✅ Información de jugadores verificada');
      
      // Verificar que la letra se generó automáticamente
      await expect(host.locator('#currentLetter')).toHaveText(/[A-ZÑÁÉÍÓÚÜ]/);
      await expect(guest.locator('#currentLetter')).toHaveText(/[A-ZÑÁÉÍÓÚÜ]/);
      console.log('✅ Letra generada automáticamente');
      
      // Verificar que los inputs están habilitados
      await expect(host.locator('#input-NOMBRE')).toBeEnabled();
      await expect(guest.locator('#input-NOMBRE')).toBeEnabled();
      console.log('✅ Inputs habilitados');
      
      console.log('🎉 Test completado exitosamente!');
      
    } catch (error) {
      console.error('❌ Error en test:', error.message);
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});


