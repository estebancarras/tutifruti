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

  test('Complete review flow: write words → review → vote → results', async ({ browser }) => {
    // Crear dos contextos para simular dos jugadores
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const host = await context1.newPage();
    const player = await context2.newPage();

    try {
      // Host crea sala
      await host.goto(baseURL);
      await host.fill('#username', 'Host');
      await host.click('.btn-primary');
      
      await host.waitForURL('**/create-room.html');
      await host.fill('#roomName', 'Review Test Room');
      await host.click('#createRoomBtn');
      
      // Obtener código de sala
      await host.waitForSelector('#roomCode', { state: 'visible' });
      const roomCode = await host.textContent('#roomCode');
      
      // Player se une
      await player.goto(baseURL);
      await player.fill('#username', 'Player1');
      await player.click('.btn-primary');
      
      await player.waitForURL('**/join-room.html');
      await player.fill('#joinRoomId', roomCode.trim());
      await player.click('#joinRoomBtn');
      
      // Esperar que ambos estén en la sala
      await host.waitForSelector('.player-item', { state: 'visible' });
      await player.waitForSelector('.waiting-room', { state: 'visible' });
      
      // Host inicia juego
      await host.click('#goToGameButton');
      
      // Ambos deberían ir al juego
      await host.waitForURL('**/game.html*');
      await player.waitForURL('**/game.html*');
      
      // Esperar que se cargue la interfaz del juego
      await host.waitForSelector('#categoriesGrid .category-card');
      await player.waitForSelector('#categoriesGrid .category-card');
      
      // Host llena palabras
      await host.fill('#input-NOMBRE', 'Ana');
      await host.fill('#input-ANIMAL', 'Avestruz');
      await host.fill('#input-COSA', 'Auto');
      await host.fill('#input-FRUTA', 'Arandano');
      
      // Player llena palabras
      await player.fill('#input-NOMBRE', 'Alberto');
      await player.fill('#input-ANIMAL', 'Águila');
      await player.fill('#input-COSA', 'Avión');
      await player.fill('#input-FRUTA', 'Aguacate');
      
      // Ambos envían palabras
      await host.click('#submitWordButton');
      await player.click('#submitWordButton');
      
      // Deberían ser redirigidos a revisión
      await host.waitForURL('**/review.html*', { timeout: 10000 });
      await player.waitForURL('**/review.html*', { timeout: 10000 });
      
      // Verificar que la interfaz de revisión se carga
      await host.waitForSelector('.words-grid .word-card');
      await player.waitForSelector('.words-grid .word-card');
      
      // Verificar información de la ronda
      const hostRound = await host.textContent('#currentRound');
      const playerRound = await player.textContent('#currentRound');
      expect(hostRound).toBe('1');
      expect(playerRound).toBe('1');
      
      // Verificar que hay palabras para revisar
      const hostWordCards = await host.locator('.word-card').count();
      const playerWordCards = await player.locator('.word-card').count();
      expect(hostWordCards).toBeGreaterThan(0);
      expect(playerWordCards).toBeGreaterThan(0);
      
      // Host vota en la primera palabra del player
      const firstWordCard = host.locator('.word-card').first();
      await firstWordCard.locator('.vote-approve').click();
      
      // Player vota en la primera palabra del host
      const playerFirstCard = player.locator('.word-card').first();
      await playerFirstCard.locator('.vote-approve').click();
      
      // Verificar feedback visual de votación
      await expect(firstWordCard).toHaveClass(/voted-approve/);
      await expect(playerFirstCard).toHaveClass(/voted-approve/);
      
      // Host finaliza la revisión (como creador)
      await host.click('#finishReviewBtn');
      
      // Ambos deberían ir a resultados
      await host.waitForURL('**/results.html*', { timeout: 10000 });
      await player.waitForURL('**/results.html*', { timeout: 10000 });
      
      // Verificar que se muestran los resultados
      await host.waitForSelector('.leaderboard-table .leaderboard-row');
      await player.waitForSelector('.leaderboard-table .leaderboard-row');
      
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

  test('Review UI elements and accessibility', async ({ page }) => {
    await page.goto(`${baseURL}/views/review.html?roomId=test123`);
    
    // Verificar elementos principales de la UI
    await expect(page.locator('.review-header')).toBeVisible();
    await expect(page.locator('.current-player-panel')).toBeVisible();
    await expect(page.locator('.words-grid')).toBeVisible();
    await expect(page.locator('.players-sidebar')).toBeVisible();
    
    // Verificar temporizador
    await expect(page.locator('.timer-circle')).toBeVisible();
    await expect(page.locator('#timeRemaining')).toBeVisible();
    
    // Verificar botones de acción
    await expect(page.locator('#finishReviewBtn')).toBeVisible();
    await expect(page.locator('#skipVotingBtn')).toBeVisible();
    
    // Verificar accesibilidad básica
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="complementary"]')).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });

  test('Social pressure effects and visual feedback', async ({ page }) => {
    await page.goto(`${baseURL}/views/review.html?roomId=test123`);
    
    // Simular que hay palabras cargadas (esto normalmente vendría del servidor)
    await page.evaluate(() => {
      // Simular palabras en el grid
      const wordsGrid = document.getElementById('wordsGrid');
      const wordCard = document.createElement('div');
      wordCard.className = 'word-card';
      wordCard.setAttribute('data-word-id', 'test-word-1');
      wordCard.innerHTML = `
        <div class="word-header">
          <h3 class="word-text">TestWord</h3>
          <span class="word-category">NOMBRE</span>
        </div>
        <div class="vote-status">
          <div class="vote-count approve">
            <span>✅</span>
            <span class="approve-count">0</span>
          </div>
          <div class="vote-count reject">
            <span>❌</span>
            <span class="reject-count">0</span>
          </div>
        </div>
        <div class="vote-actions">
          <button class="vote-btn vote-approve" data-vote="approve">
            <span>✅</span>
            Aprobar
          </button>
          <button class="vote-btn vote-reject" data-vote="reject">
            <span>❌</span>
            Rechazar
          </button>
        </div>
      `;
      wordsGrid.appendChild(wordCard);
    });
    
    const wordCard = page.locator('[data-word-id="test-word-1"]');
    await expect(wordCard).toBeVisible();
    
    // Probar votación
    await wordCard.locator('.vote-approve').click();
    
    // Verificar que se aplicó la clase de voto
    await expect(wordCard).toHaveClass(/voted-approve/);
    
    // Verificar feedback visual (puede ser temporal)
    const voteButton = wordCard.locator('.vote-approve');
    await expect(voteButton).toBeVisible();
  });

  test('Consensus and social scoring display', async ({ page }) => {
    await page.goto(`${baseURL}/views/review.html?roomId=test123`);
    
    // Verificar elementos de consenso
    await expect(page.locator('.voting-summary')).toBeVisible();
    await expect(page.locator('#approvedCount')).toBeVisible();
    await expect(page.locator('#rejectedCount')).toBeVisible();
    await expect(page.locator('#pendingCount')).toBeVisible();
    
    // Verificar barra de progreso
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('#progressFill')).toBeVisible();
    
    // Verificar stats iniciales
    const approvedCount = await page.textContent('#approvedCount');
    const rejectedCount = await page.textContent('#rejectedCount');
    const pendingCount = await page.textContent('#pendingCount');
    
    expect(approvedCount).toBe('0');
    expect(rejectedCount).toBe('0');
    expect(pendingCount).toBe('0');
  });

  test('Mobile responsiveness', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 } // iPhone size
    });
    const page = await context.newPage();
    
    await page.goto(`${baseURL}/views/review.html?roomId=test123`);
    
    // Verificar que los elementos principales siguen siendo visibles en móvil
    await expect(page.locator('.review-header')).toBeVisible();
    await expect(page.locator('.words-grid')).toBeVisible();
    
    // Verificar que el grid se adapta (debería ser 1 columna en móvil)
    const gridStyle = await page.locator('.words-grid').evaluate(el => 
      window.getComputedStyle(el).gridTemplateColumns
    );
    // En móvil debería ser una sola columna
    expect(gridStyle).toContain('1fr');
    
    await context.close();
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Intentar acceder a revisión sin roomId
    await page.goto(`${baseURL}/views/review.html`);
    
    // Debería mostrar error o redireccionar
    await page.waitForTimeout(2000); // Dar tiempo para procesar
    
    // Verificar que se maneja el error gracefully
    const currentUrl = page.url();
    const hasError = await page.locator('.toast-container').isVisible();
    
    expect(hasError || currentUrl.includes('index.html')).toBeTruthy();
  });
});


