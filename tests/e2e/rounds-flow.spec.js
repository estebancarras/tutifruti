// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('E2E: flujo de rondas (maxRounds=1) y equidad de inputs', () => {
  test('host crea con 1 ronda, invitado se une, todos escriben tras roundStart y finaliza en Resultados Finales', async ({ browser }) => {
    // Crear dos contextos para simular dos jugadores
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const host = await context1.newPage();
    const guest = await context2.newPage();

    try {
      // HOST: ir a index y crear sala
      await host.goto('http://localhost:3000');
      await host.fill('#username', 'host-e2e');
      await host.click('.btn-primary');
      
      await host.waitForURL('**/create-room.html');
      await host.fill('#roomName', 'Sala 1 Ronda');
      await host.fill('#rounds', '1');
      await host.click('#createRoomBtn');
      
      // Obtener código de sala
      await host.waitForSelector('#roomCode', { state: 'visible' });
      const roomCode = await host.textContent('#roomCode');
      
      // GUEST: ir a index y unirse
      await guest.goto('http://localhost:3000');
      await guest.fill('#username', 'guest-e2e');
      await guest.click('.btn-primary');
      
      await guest.waitForURL('**/join-room.html');
      await guest.fill('#joinRoomId', roomCode.trim());
      await guest.click('#joinRoomBtn');
      
      // Esperar que ambos estén en la sala
      await host.waitForSelector('.player-item', { state: 'visible' });
      await guest.waitForSelector('.waiting-room', { state: 'visible' });
      
      // HOST: iniciar juego (ahora genera letra automáticamente)
      await host.click('#goToGameButton');
      
      // Ambos deberían ir al juego
      await host.waitForURL('**/game.html*');
      await guest.waitForURL('**/game.html*');
      
      // Esperar que se cargue la interfaz del juego
      await host.waitForSelector('#categoriesGrid .category-card');
      await guest.waitForSelector('#categoriesGrid .category-card');
      
      // HOST: llenar palabras
      await host.fill('#input-NOMBRE', 'Ana');
      await host.fill('#input-ANIMAL', 'Avestruz');
      await host.fill('#input-COSA', 'Auto');
      await host.fill('#input-FRUTA', 'Arandano');
      
      // GUEST: llenar palabras
      await guest.fill('#input-NOMBRE', 'Bruno');
      await guest.fill('#input-ANIMAL', 'Ballena');
      await guest.fill('#input-COSA', 'Barco');
      await guest.fill('#input-FRUTA', 'Banana');
      
      // Ambos envían palabras
      await host.click('#submitWordButton');
      await guest.click('#submitWordButton');
      
      // Deberían ser redirigidos a revisión
      await host.waitForURL('**/review.html*', { timeout: 10000 });
      await guest.waitForURL('**/review.html*', { timeout: 10000 });
      
      // Verificar que la interfaz de revisión se carga
      await host.waitForSelector('.words-grid .word-card');
      await guest.waitForSelector('.words-grid .word-card');
      
      // HOST: finalizar revisión (como creador)
      await host.click('#finishReviewBtn');
      
      // Ambos deberían ir a resultados
      await host.waitForURL('**/results.html*', { timeout: 10000 });
      await guest.waitForURL('**/results.html*', { timeout: 10000 });
      
      // Verificar que se muestran los resultados
      await host.waitForSelector('.leaderboard-table .leaderboard-row');
      await guest.waitForSelector('.leaderboard-table .leaderboard-row');
      
      // Verificar que hay al menos un jugador en la tabla
      const hostLeaderboardRows = await host.locator('.leaderboard-row').count();
      const guestLeaderboardRows = await guest.locator('.leaderboard-row').count();
      expect(hostLeaderboardRows).toBeGreaterThanOrEqual(2);
      expect(guestLeaderboardRows).toBeGreaterThanOrEqual(2);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
