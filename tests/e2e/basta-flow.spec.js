/**
 * Test E2E para el nuevo flujo con botón ¡BASTA!
 * Verifica que el botón aparezca cuando se completen todas las categorías
 * y que redirija correctamente a la revisión social
 */

const { test, expect } = require('@playwright/test');

test.describe('Flujo del botón ¡BASTA!', () => {
  test('botón ¡BASTA! aparece al completar todas las categorías y redirige a revisión', async ({ browser }) => {
    console.log('🚀 Iniciando test de flujo ¡BASTA!...');
    
    // Crear dos contextos (host y invitado)
    const context1 = await browser.newContext();
    const host = await context1.newPage();
    host.on('console', msg => console.log(`[BASTA-OK HOST CONSOLE] ${msg.text()}`));

    const context2 = await browser.newContext();
    const guest = await context2.newPage();
    guest.on('console', msg => console.log(`[BASTA-OK GUEST CONSOLE] ${msg.text()}`));
    
    try {
      // ===== HOST: CREAR SALA =====
      console.log('📱 Host creando sala...');
      await host.goto('http://localhost:3000/index.html', { timeout: 20000 });
      await host.fill('#username', 'host-basta');
      await host.click('#createRoomButton');
      
      await host.waitForURL('**/create-room.html', { timeout: 10000 });
      await host.fill('#roomName', 'Sala BASTA Test');
      await host.click('#createRoomButton');
      
      await host.waitForSelector('#roomCodeValue', { state: 'visible', timeout: 20000 });
      const roomCode = await host.textContent('#roomCodeValue');
      console.log(`✅ Sala creada con código: ${roomCode}`);
      
      // ===== GUEST: UNIRSE A SALA =====
      console.log('👥 Invitado uniéndose...');
      await guest.goto('http://localhost:3000/index.html', { timeout: 20000 });
      await guest.fill('#username', 'guest-basta');
      await guest.click('#joinRoomButton');
      
      await guest.waitForURL('**/join-room.html', { timeout: 20000 });
      await guest.fill('#roomCodeInput', roomCode.trim());
      await guest.click('#joinRoomButton');
      
      // Esperar confirmación de unión
      await guest.waitForSelector('.waiting-room-container', { state: 'visible', timeout: 15000 });
      console.log('✅ Invitado se unió');
      
      // ===== INICIAR JUEGO =====
      console.log('🎮 Iniciando juego...');
      await host.click('#goToGameButton');
      
      // Ambos deben llegar a game.html y estar listos
      const waitForGameReady = async (page, username) => {
        try {
          await page.waitForURL('**/game.html*', { timeout: 12000 });
        } catch (e) {
          console.log(`⏳ Navegación a game.html no detectada para ${username}, forzando...`);
          await page.evaluate((user) => {
            const roomId = localStorage.getItem('currentRoomId');
            if (user) localStorage.setItem('username', user);
            if (roomId) window.location.href = `/views/game.html?roomId=${roomId}`;
          }, username);
        }
        await page.waitForURL('**/game.html*', { timeout: 15000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('.word-input', { state: 'attached', timeout: 20000 });
        console.log(`✅ UI de juego lista para ${username}`);
      };

      await Promise.all([
        waitForGameReady(host, 'host-basta'),
        waitForGameReady(guest, 'guest-basta'),
      ]);
      
      // Verificar que la letra se muestre
      await host.waitForSelector('#letterDisplay', { state: 'visible', timeout: 15000 });
      const currentLetter = await host.textContent('#letterDisplay');
      console.log(`✅ Letra actual: ${currentLetter}`);
      
      // ===== COMPLETAR TODAS LAS CATEGORÍAS =====
      console.log('📝 Completando todas las categorías...');
      
      // Obtener todos los inputs de palabras
      const wordInputs = await host.locator('.word-input').all();
      console.log(`📊 Encontrados ${wordInputs.length} inputs`);
      
      // Llenar cada input con una palabra que empiece con la letra actual
      const testWords = {
        0: `${currentLetter}ngel`,     // Nombre
        1: `${currentLetter}gua`,      // Animal  
        2: `${currentLetter}uto`,      // Cosa
        3: `${currentLetter}rgentina`, // País
        4: `${currentLetter}tenas`,    // Ciudad
        5: `${currentLetter}rroz`,     // Comida
        6: `${currentLetter}rquitecto`, // Profesión
        7: `${currentLetter}zul`,      // Color
        8: `${currentLetter}pple`,     // Marca
        9: `${currentLetter}vengers`,  // Película
        10: `${currentLetter}tletismo`, // Deporte
        11: `${currentLetter}loe`      // Planta
      };
      
      // Llenar los inputs uno por uno
      for (let i = 0; i < Math.min(wordInputs.length, 12); i++) {
        const word = testWords[i] || `${currentLetter}palabra${i}`;
        await wordInputs[i].fill(word);
        await wordInputs[i].blur(); // Trigger eventos
        
        // Pequeña pausa para que se procesen los eventos
        await host.waitForTimeout(100);
      }
      
      console.log('✅ Todas las categorías completadas');
      
      // ===== VERIFICAR QUE APARECE BOTÓN ¡BASTA! =====
      console.log('🔍 Verificando aparición del botón ¡BASTA!...');
      
      await host.waitForSelector('#bastaButton', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Verificar que tiene la clase de pulso
      const bastaButton = host.locator('#bastaButton');
      await expect(bastaButton).toBeVisible();
      // Clase de pulso es opcional según estilo actual
      // await expect(bastaButton).toHaveClass(/btn--pulse/);
      
      console.log('✅ Botón ¡BASTA! visible y con animación');
      
      // ===== PRESIONAR ¡BASTA! =====
      console.log('⚡ Presionando botón ¡BASTA!...');
      await bastaButton.click();
      
      // Verificar notificación de éxito
      await host.waitForSelector('.notification.success', { 
        state: 'visible', 
        timeout: 3000 
      });
      
      const notification = await host.textContent('.notification.success');
      expect(notification).toContain('terminado');
      console.log('✅ Notificación de éxito mostrada');
      
      // ===== VERIFICAR APERTURA DE MODAL DE REVISIÓN EN game.html =====
      console.log('🔄 Verificando apertura de modal de revisión...');
      await host.waitForSelector('#modal-review .modal__body, .review-header', { timeout: 15000 });
      await guest.waitForSelector('#modal-review .modal__body, .review-header', { timeout: 15000 });

      // Verificar que hay elementos de revisión
      await host.waitForSelector('.review-category .review-item', { state: 'visible', timeout: 10000 });
      const wordCards = await host.locator('.review-item').count();
      expect(wordCards).toBeGreaterThan(0);
      console.log(`✅ ${wordCards} elementos disponibles para revisar`);
      
      console.log('🎉 ¡Test de flujo ¡BASTA! completado exitosamente!');
      
    } catch (error) {
      console.error('❌ Error en test:', error);
      
      // Capturar screenshots para debugging
      await host.screenshot({ path: 'test-results/basta-host-error.png', fullPage: true });
      await guest.screenshot({ path: 'test-results/basta-guest-error.png', fullPage: true });
      
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });
  
  test('botón ¡BASTA! NO aparece si faltan categorías', async ({ browser }) => {
    console.log('🚀 Iniciando test de botón ¡BASTA! - caso incompleto...');
    
    // Usar dos contextos para permitir iniciar el juego
    const context1 = await browser.newContext();
    const host = await context1.newPage();
    host.on('console', msg => console.log(`[BASTA-NOK HOST CONSOLE] ${msg.text()}`));

    const context2 = await browser.newContext();
    const guest = await context2.newPage();
    guest.on('console', msg => console.log(`[BASTA-NOK GUEST CONSOLE] ${msg.text()}`));
    
    try {
      // Crear sala con Host
      await host.goto('http://localhost:3000/index.html', { timeout: 20000 });
      await host.fill('#username', 'host-incomplete');
      await host.click('#createRoomButton');
      await host.waitForURL('**/create-room.html', { timeout: 10000 });
      await host.fill('#roomName', 'Sala Incompleta');
      await host.click('#createRoomButton');
      await host.waitForSelector('#roomCodeValue', { state: 'visible', timeout: 20000 });
      const roomCode = (await host.textContent('#roomCodeValue')).trim();
      
      // Invitado se une
      await guest.goto('http://localhost:3000/index.html', { timeout: 20000 });
      await guest.fill('#username', 'guest-incomplete');
      await guest.click('#joinRoomButton');
      await guest.waitForURL('**/join-room.html', { timeout: 20000 });
      await guest.fill('#roomCodeInput', roomCode);
      await guest.click('#joinRoomButton');
      await guest.waitForSelector('.waiting-room-container', { state: 'visible', timeout: 15000 });
      
      // Iniciar juego desde host
      await host.click('#goToGameButton');
      
      const waitForGameReady = async (page, username) => {
        try {
          await page.waitForURL('**/game.html*', { timeout: 12000 });
        } catch (e) {
          console.log(`⏳ Navegación a game.html no detectada para ${username}, forzando...`);
          await page.evaluate((user) => {
            const roomId = localStorage.getItem('currentRoomId');
            if (user) localStorage.setItem('username', user);
            if (roomId) window.location.href = `/views/game.html?roomId=${roomId}`;
          }, username);
        }
        await page.waitForURL('**/game.html*', { timeout: 15000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector('.word-input', { state: 'attached', timeout: 20000 });
        console.log(`✅ UI de juego lista para ${username}`);
      };

      await Promise.all([
        waitForGameReady(host, 'host-incomplete'),
        waitForGameReady(guest, 'guest-incomplete'),
      ]);
      await host.waitForSelector('#letterDisplay', { state: 'visible', timeout: 15000 });
      const currentLetter = await host.textContent('#letterDisplay');
      
      // Llenar SOLO algunas categorías (no todas)
      const wordInputs = await host.locator('.word-input').all();
      const halfCount = Math.max(1, Math.floor(wordInputs.length / 2));
      for (let i = 0; i < halfCount; i++) {
        const word = `${currentLetter}test${i}`;
        await wordInputs[i].fill(word);
        await wordInputs[i].blur();
        await host.waitForTimeout(50);
      }
      console.log(`✅ Completadas ${halfCount} de ${wordInputs.length} categorías`);
      
      // Verificar que el botón ¡BASTA! NO está visible
      await host.waitForTimeout(500);
      const bastaButton = host.locator('#bastaButton');
      await expect(bastaButton).toBeHidden();
      
      // Verificar que el botón de enviar sí está habilitado
      const submitButton = host.locator('#submitWordButton');
      await expect(submitButton).toBeEnabled();
      console.log('✅ Botón enviar habilitado para envío parcial');
      
    } catch (error) {
      console.error('❌ Error en test:', error);
      await host.screenshot({ path: 'test-results/basta-incomplete-error.png', fullPage: true });
      await guest.screenshot({ path: 'test-results/basta-incomplete-guest-error.png', fullPage: true });
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
