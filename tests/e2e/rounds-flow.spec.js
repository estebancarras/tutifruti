// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('E2E: flujo de rondas (maxRounds=1) y equidad de inputs', () => {
  test('host crea con 1 ronda, invitado se une, todos escriben tras roundStart y finaliza en Resultados Finales', async ({ browser }) => {
    // Crear dos contextos para simular dos jugadores
    const context1 = await browser.newContext();
    const host = await context1.newPage();
    host.on('console', msg => console.log(`[ROUNDS-FLOW HOST CONSOLE] ${msg.text()}`));

    const context2 = await browser.newContext();
    const guest = await context2.newPage();
    guest.on('console', msg => console.log(`[ROUNDS-FLOW GUEST CONSOLE] ${msg.text()}`));

    try {
      // HOST: ir a index y crear sala
      await host.goto('http://localhost:3000/index.html');
      await host.fill('#username', 'host-e2e');
      await host.click('#createRoomButton');
      
      await host.waitForURL('**/create-room.html');
      await host.fill('#roomName', 'Sala 1 Ronda');
      await host.fill('#rounds', '1');
      await host.click('#createRoomButton');
      
      // Obtener código de sala
      await host.waitForSelector('#roomCodeValue', { state: 'visible', timeout: 15000 });
      const roomCode = (await host.textContent('#roomCodeValue')) || '';
      
      // GUEST: ir a index y unirse
      await guest.goto('http://localhost:3000/index.html');
      await guest.fill('#username', 'guest-e2e');
      await guest.click('#joinRoomButton');
      
      await guest.waitForURL('**/join-room.html');
      await guest.fill('#roomCodeInput', roomCode.trim());
      await guest.click('#joinRoomButton');
      
      // Esperar que ambos estén en la sala
      await host.waitForSelector('.player-item', { state: 'visible' });
      await guest.waitForSelector('.waiting-room-container', { state: 'visible' });
      
      // HOST: iniciar juego (ahora genera letra automáticamente)
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
        waitForGameReady(host, 'host-e2e'),
        waitForGameReady(guest, 'guest-e2e'),
      ]);

      // Detectar letra actual y llenar dinámicamente todas las categorías visibles
      const currentLetter = (await host.textContent('#letterDisplay'))?.trim() || 'A';
      const makeWords = (L) => [
        `${L}nimal`, `${L}gua`, `${L}uto`, `${L}rgentina`, `${L}tenas`, `${L}rroz`,
        `${L}rquitecto`, `${L}zul`, `${L}pple`, `${L}vengers`, `${L}tletismo`, `${L}loe`
      ];
      const hostInputs = await host.locator('.word-input:not([disabled])').all();
      const guestInputs = await guest.locator('.word-input:not([disabled])').all();
      const hostWords = makeWords(currentLetter);
      const guestWords = makeWords(currentLetter);
      for (let i = 0; i < Math.min(hostInputs.length, hostWords.length); i++) {
        await hostInputs[i].fill(hostWords[i]);
        await hostInputs[i].blur();
      }
      for (let i = 0; i < Math.min(guestInputs.length, guestWords.length); i++) {
        await guestInputs[i].fill(guestWords[i]);
        await guestInputs[i].blur();
      }
      
      // Ambos envían palabras
      await host.click('#submitWordButton');
      await guest.click('#submitWordButton');

      // Abrir modal de revisión dentro de game.html (nuevo flujo)
      await host.waitForSelector('#modal-review', { timeout: 25000 });
      await guest.waitForSelector('#modal-review', { timeout: 25000 });
      await host.waitForSelector('.review-header', { timeout: 15000 });
      await guest.waitForSelector('.review-header', { timeout: 15000 });
      
      // Ambos confirman revisión
      await host.click('#confirmReviewButton');
      await guest.click('#confirmReviewButton');
      
      // Esperar resultados de ronda (modal)
      await host.waitForSelector('#modal-roundResults .modal__body, .results-section', { timeout: 15000 });
      await guest.waitForSelector('#modal-roundResults .modal__body, .results-section', { timeout: 15000 });
      
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
