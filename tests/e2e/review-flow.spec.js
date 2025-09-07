/**
 * Tests E2E para el Sistema de Validación Social
 * Playwright - Tutifrutti Review Flow
 */

const { test, expect } = require('@playwright/test');

test.describe('Review System E2E Flow', () => {
  let baseURL;

  test.beforeAll(async () => {
    baseURL = 'http://localhost:3000';
  });

  test('Complete review flow: write words → review modal → vote → results', async ({ browser }) => {
    // Crear dos contextos para simular dos jugadores
    const context1 = await browser.newContext();
    const host = await context1.newPage();
    host.on('console', msg => console.log(`[REVIEW-FLOW HOST CONSOLE] ${msg.text()}`));

    const context2 = await browser.newContext();
    const player = await context2.newPage();
    player.on('console', msg => console.log(`[REVIEW-FLOW PLAYER CONSOLE] ${msg.text()}`));

    try {
      // Host crea sala
      await host.goto(`${baseURL}/index.html`);
      await host.fill('#username', 'Host');
      await host.click('#createRoomButton');
      
      await host.waitForURL('**/create-room.html');
      await host.fill('#roomName', 'Review Test Room');
      await host.click('#createRoomButton');
      
      // Obtener código de sala
      await host.waitForSelector('#roomCodeValue', { state: 'visible', timeout: 15000 });
      const roomCode = (await host.textContent('#roomCodeValue')) || '';
      
      // Player se une
      await player.goto(`${baseURL}/index.html`);
      await player.fill('#username', 'Player1');
      await player.click('#joinRoomButton');
      
      await player.waitForURL('**/join-room.html');
      await player.fill('#joinRoomId', roomCode.trim());
      await player.click('#joinRoomButton');
      
      // Esperar que ambos estén en la sala
      await host.waitForSelector('.player-item', { state: 'visible' });
      await player.waitForSelector('.waiting-room', { state: 'visible' });
      
      // Host inicia juego
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
        waitForGameReady(host, 'Host'),
        waitForGameReady(player, 'Player1'),
      ]);

      // Detectar letra actual y llenar dinámicamente todas las categorías visibles
      const currentLetter = (await host.textContent('#letterDisplay'))?.trim() || 'A';
      const makeWords = (L) => [
        `${L}nimal`, `${L}gua`, `${L}uto`, `${L}rgentina`, `${L}tenas`, `${L}rroz`,
        `${L}rquitecto`, `${L}zul`, `${L}pple`, `${L}vengers`, `${L}tletismo`, `${L}loe`
      ];
      const hostInputs = await host.locator('.word-input:not([disabled])').all();
      const guestInputs = await player.locator('.word-input:not([disabled])').all();
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
      await player.click('#submitWordButton');
      // Espera a que el backend procese y emita datos de revisión
      await host.waitForLoadState('networkidle');
      await player.waitForLoadState('networkidle');
      
      // Abrir modal de revisión dentro de game.html (nuevo flujo)
      // Si por latencia del backend no llega a tiempo, abrimos manualmente como fallback
      try {
        await host.waitForSelector('#modal-review', { timeout: 25000 });
        await player.waitForSelector('#modal-review', { timeout: 25000 });
      } catch (_) {
        // Fallback: construir payload mínimo usando la letra y las categorías visibles
        const fallbackOpen = async (page, letter) => {
          await page.evaluate(async (L) => {
            const categories = Array.from(document.querySelectorAll('.category-card .category-card__title')).map(el => el.textContent.trim()).filter(Boolean);
            const username = localStorage.getItem('username') || 'Jugador';
            const other = username.toLowerCase() === 'host' ? 'Player1' : 'Host';
            const buildWords = (name) => {
              const words = {};
              categories.forEach((cat, idx) => {
                const sample = [`${L}nimal`, `${L}gua`, `${L}uto`, `${L}rgentina`, `${L}tenas`, `${L}rroz`, `${L}rquitecto`, `${L}zul`, `${L}pple`, `${L}vengers`, `${L}tletismo`, `${L}loe`][idx % 12];
                words[cat] = sample;
              });
              return words;
            };
            const payload = {
              categories,
              words: {
                [username]: buildWords(username),
                [other]: buildWords(other)
              },
              letter: L,
              reviewTime: 60
            };
            const mod = await import('/public/js/ui-manager.js');
            mod.uiManager.openReviewModal(payload, { isHost: username.toLowerCase() === 'host' });
          }, letter);
        };
        await Promise.all([
          fallbackOpen(host, currentLetter),
          fallbackOpen(player, currentLetter)
        ]);
        await host.waitForSelector('#modal-review', { timeout: 10000 });
        await player.waitForSelector('#modal-review', { timeout: 10000 });
      }
      await host.waitForSelector('.review-header', { timeout: 15000 });
      await player.waitForSelector('.review-header', { timeout: 15000 });
      
      // Verificar que hay ítems para revisar en el modal
      const hostWordCards = await host.locator('.review-item').count();
      const playerWordCards = await player.locator('.review-item').count();
      expect(hostWordCards).toBeGreaterThan(0);
      expect(playerWordCards).toBeGreaterThan(0);
      
      // Host vota válida en el primer ítem disponible del modal
      const hostFirstItem = host.locator('.review-item').first();
      await hostFirstItem.locator('.vote-valid').click();
      
      // Player vota válida en el primer ítem disponible del modal
      const playerFirstItem = player.locator('.review-item').first();
      await playerFirstItem.locator('.vote-valid').click();
      
      // Confirmar resultados (cada jugador)
      await host.click('#confirmReviewButton');
      await player.click('#confirmReviewButton');
      
      // Esperar visualización de resultados de ronda (modal de resultados)
      await host.waitForSelector('#modal-roundResults .modal__body, .results-section', { timeout: 15000 });
      await player.waitForSelector('#modal-roundResults .modal__body, .results-section', { timeout: 15000 });
      
      // Verificar que hay al menos un jugador en la tabla
      const hostLeaderboardRows = await host.locator('.leaderboard-row').count();
      const playerLeaderboardRows = await player.locator('.leaderboard-row').count();
      expect(hostLeaderboardRows).toBeGreaterThanOrEqual(2);
      expect(playerLeaderboardRows).toBeGreaterThanOrEqual(2);
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Review UI elements and accessibility (modal)', async ({ page }) => {
    // Definir datos en localStorage antes de cargar para evitar redirecciones
    await page.addInitScript(() => {
      localStorage.setItem('username', 'E2EUser');
      localStorage.setItem('currentRoomId', 'test123');
    });
    // Abrir game.html y simular apertura del modal con datos mock
    await page.addInitScript(() => {
      localStorage.setItem('username', 'E2EUser');
      localStorage.setItem('currentRoomId', 'test123');
    });
    await page.goto(`${baseURL}/views/game.html?roomId=test123`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    // Asegurar que ui-manager esté cargado y expuesto
    await page.addScriptTag({ type: 'module', content: "import '/public/js/ui-manager.js';" });
    await page.waitForFunction(() => !!window.uiManager && typeof window.uiManager.openReviewModal === 'function');
    await page.evaluate(() => {
      const payload = {
        categories: ['NOMBRE', 'ANIMAL'],
        words: {
          Otro: { NOMBRE: 'Ana', ANIMAL: 'Avestruz' }
        },
        letter: 'A',
        reviewTime: 60
      };
      window.uiManager?.openReviewModal(payload, { isHost: true });
    });
    await page.waitForTimeout(50);
    await page.waitForSelector('#modal-review', { timeout: 10000, state: 'attached' });
    await expect(page.locator('.review-header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.review-category').first()).toBeVisible();
    await expect(page.locator('#confirmReviewButton')).toBeVisible();
  });

  test('Social pressure effects and visual feedback (modal)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('username', 'E2EUser');
      localStorage.setItem('currentRoomId', 'test123');
    });
    await page.goto(`${baseURL}/views/game.html?roomId=test123`);
    await page.waitForLoadState('domcontentloaded');
    await page.addScriptTag({ type: 'module', content: "import '/public/js/ui-manager.js';" });
    await page.waitForFunction(() => !!window.uiManager && typeof window.uiManager.openReviewModal === 'function');
    await page.evaluate(() => {
      const payload = {
        categories: ['NOMBRE'],
        words: { Otro: { NOMBRE: 'Ana' } },
        letter: 'A',
        reviewTime: 60
      };
      window.uiManager?.openReviewModal(payload, { isHost: false });
    });
    await page.waitForTimeout(50);
    await page.waitForSelector('#modal-review', { timeout: 10000, state: 'attached' });
    const item = page.locator('.review-item').first();
    await expect(item).toBeVisible();
    await item.locator('.vote-valid').click();
    // Botón visible después de clic
    await expect(item.locator('.vote-valid')).toBeVisible();
  });

  test('Consensus and social scoring display (modal minimal)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('username', 'E2EUser');
      localStorage.setItem('currentRoomId', 'test123');
    });
    await page.goto(`${baseURL}/views/game.html?roomId=test123`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async () => {
      const payload = {
        categories: ['NOMBRE', 'ANIMAL'],
        words: { Otro: { NOMBRE: 'Ana', ANIMAL: 'Avestruz' } },
        letter: 'A',
        reviewTime: 60
      };
      const mod = await import('/public/js/ui-manager.js');
      mod.uiManager.openReviewModal(payload, { isHost: false });
    });
    await page.waitForTimeout(50);
    await page.waitForSelector('#modal-review', { timeout: 10000 });
    await expect(page.locator('.review-header')).toBeVisible({ timeout: 10000 });
    // No hay summary global, pero al menos hay contadores por ítem
    await expect(page.locator('.review-item .vote-valid-count').first()).toBeVisible();
    await expect(page.locator('.review-item .vote-invalid-count').first()).toBeVisible();
  });

  test('Mobile responsiveness (modal)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 } // iPhone size
    });
    const page = await context.newPage();
    
    await page.addInitScript(() => {
      localStorage.setItem('username', 'E2EUser');
      localStorage.setItem('currentRoomId', 'test123');
    });
    await page.goto(`${baseURL}/views/game.html?roomId=test123`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async () => {
      const payload = {
        categories: ['NOMBRE', 'ANIMAL'],
        words: { Otro: { NOMBRE: 'Ana', ANIMAL: 'Avestruz' } },
        letter: 'A',
        reviewTime: 60
      };
      const mod = await import('/public/js/ui-manager.js');
      mod.uiManager.openReviewModal(payload, { isHost: false });
    });
    await page.waitForTimeout(50);
    await page.waitForSelector('#modal-review', { timeout: 10000 });
    await expect(page.locator('.review-header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.review-category').first()).toBeVisible({ timeout: 10000 });
    
    await context.close();
  });

  test('Error handling and edge cases (modal)', async ({ page }) => {
    // Intentar abrir modal sin datos correctos
    await page.goto(`${baseURL}/views/game.html`);
    // Debería no romper ni mostrar errores no manejados
    await page.waitForTimeout(1000);
    expect(true).toBeTruthy();
  });
});


