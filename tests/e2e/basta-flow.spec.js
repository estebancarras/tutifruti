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
    const context2 = await browser.newContext();
    const host = await context1.newPage();
    const guest = await context2.newPage();
    
    try {
      // ===== HOST: CREAR SALA =====
      console.log('📱 Host creando sala...');
      await host.goto('https://tutifruti-3ii6.onrender.com', { timeout: 15000 });
      await host.fill('#username', 'host-basta');
      await host.click('#createRoomButton');
      
      await host.waitForURL('**/create-room.html', { timeout: 10000 });
      await host.fill('#roomName', 'Sala BASTA Test');
      await host.click('#createRoomButton');
      
      await host.waitForSelector('#roomCodeValue', { state: 'visible', timeout: 10000 });
      const roomCode = await host.textContent('#roomCodeValue');
      console.log(`✅ Sala creada con código: ${roomCode}`);
      
      // ===== GUEST: UNIRSE A SALA =====
      console.log('👥 Invitado uniéndose...');
      await guest.goto('https://tutifruti-3ii6.onrender.com', { timeout: 15000 });
      await guest.fill('#username', 'guest-basta');
      await guest.click('#joinRoomButton');
      
      await guest.waitForURL('**/join-room.html', { timeout: 10000 });
      await guest.fill('#joinRoomId', roomCode.trim());
      await guest.click('#joinRoomButton');
      
      // Esperar confirmación de unión
      await guest.waitForSelector('.waiting-room', { state: 'visible', timeout: 10000 });
      console.log('✅ Invitado se unió');
      
      // ===== INICIAR JUEGO =====
      console.log('🎮 Iniciando juego...');
      await host.click('#goToGameButton');
      
      // Ambos deben llegar a game.html
      await host.waitForURL('**/game.html', { timeout: 10000 });
      await guest.waitForURL('**/game.html', { timeout: 10000 });
      
      // Verificar que la letra se muestre
      await host.waitForSelector('#currentLetter', { state: 'visible', timeout: 10000 });
      const currentLetter = await host.textContent('#currentLetter');
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
      await expect(bastaButton).toHaveClass(/btn--pulse/);
      
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
      
      // ===== VERIFICAR REDIRECCIÓN A REVISIÓN =====
      console.log('🔄 Verificando redirección a revisión...');
      
      // Esperar redirección a review.html
      await host.waitForURL('**/review.html', { timeout: 15000 });
      await guest.waitForURL('**/review.html', { timeout: 15000 });
      
      console.log('✅ Ambos jugadores redirigidos a revisión');
      
      // Verificar elementos de la página de revisión
      await host.waitForSelector('.review-container', { 
        state: 'visible', 
        timeout: 10000 
      });
      
      await host.waitForSelector('#currentPlayerName', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      const currentPlayerName = await host.textContent('#currentPlayerName');
      expect(currentPlayerName).toBeTruthy();
      console.log(`✅ Revisión iniciada para jugador: ${currentPlayerName}`);
      
      // Verificar que hay palabras para revisar
      await host.waitForSelector('.words-voting-grid .word-card', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      const wordCards = await host.locator('.word-card').count();
      expect(wordCards).toBeGreaterThan(0);
      console.log(`✅ ${wordCards} palabras disponibles para revisar`);
      
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
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Crear sala y iniciar juego
      await page.goto('https://tutifruti-3ii6.onrender.com', { timeout: 15000 });
      await page.fill('#username', 'test-incomplete');
      await page.click('#createRoomButton');
      
      await page.waitForURL('**/create-room.html', { timeout: 10000 });
      await page.fill('#roomName', 'Sala Incompleta');
      await page.click('#createRoomButton');
      await page.click('#goToGameButton');
      
      await page.waitForURL('**/game.html', { timeout: 10000 });
      await page.waitForSelector('#currentLetter', { state: 'visible', timeout: 10000 });
      
      const currentLetter = await page.textContent('#currentLetter');
      
      // Llenar SOLO algunas categorías (no todas)
      const wordInputs = await page.locator('.word-input').all();
      const halfCount = Math.floor(wordInputs.length / 2);
      
      for (let i = 0; i < halfCount; i++) {
        const word = `${currentLetter}test${i}`;
        await wordInputs[i].fill(word);
        await wordInputs[i].blur();
        await page.waitForTimeout(100);
      }
      
      console.log(`✅ Completadas ${halfCount} de ${wordInputs.length} categorías`);
      
      // Verificar que el botón ¡BASTA! NO está visible
      await page.waitForTimeout(2000); // Esperar un poco
      
      const bastaButton = page.locator('#bastaButton');
      await expect(bastaButton).toBeHidden();
      
      console.log('✅ Botón ¡BASTA! correctamente oculto');
      
      // Verificar que el botón de enviar sí está habilitado
      const submitButton = page.locator('#submitWordButton');
      await expect(submitButton).toBeEnabled();
      
      console.log('✅ Botón enviar habilitado para envío parcial');
      
    } catch (error) {
      console.error('❌ Error en test:', error);
      await page.screenshot({ path: 'test-results/basta-incomplete-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
