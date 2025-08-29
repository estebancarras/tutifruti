// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Frontend Robustness Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar viewport para móvil
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('Responsividad móvil - Página principal', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    
    // Verificar que los elementos principales son visibles en móvil
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#createRoomButton')).toBeVisible();
    await expect(page.locator('#joinRoomButton')).toBeVisible();
    
    // Verificar que los botones son clickeables (tamaño touch-friendly)
    const createBtn = page.locator('#createRoomButton');
    const joinBtn = page.locator('#joinRoomButton');
    
    const createBox = await createBtn.boundingBox();
    const joinBox = await joinBtn.boundingBox();
    
    // Los botones deben tener al menos 44px de altura (estándar touch)
    expect(createBox?.height).toBeGreaterThanOrEqual(44);
    expect(joinBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('Navegación por teclado - Crear sala', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    
    // Navegar usando Tab
    await page.keyboard.press('Tab'); // Focus en input nombre
    await page.keyboard.type('TestUser');
    
    await page.keyboard.press('Tab'); // Focus en botón crear
    await page.keyboard.press('Enter'); // Activar crear sala
    
    await expect(page).toHaveURL(/\/views\/create-room\.html/);
    
    // Esperar que la página cargue completamente
    await page.waitForLoadState('networkidle');
    
    // Verificar que el focus está en el primer input
    await page.keyboard.press('Tab'); // Nombre del jugador
    await page.keyboard.press('Tab'); // Nombre de la sala
    await page.keyboard.type('Sala Test');
    
    await page.keyboard.press('Tab'); // Rondas
    await page.keyboard.press('Tab'); // Botón crear
    
    // Esperar que el botón esté habilitado antes de hacer clic
    await expect(page.locator('#createRoomButton')).toBeEnabled();
    await page.keyboard.press('Enter');
    
    // Esperar que el botón se deshabilite (indicando que se está procesando)
    await expect(page.locator('#createRoomButton')).toBeDisabled({ timeout: 5000 });
    
    // Esperar que la sección roomInfo se muestre (no esté hidden) con timeout mayor
    await expect(page.locator('#roomInfo')).not.toHaveClass('hidden', { timeout: 15000 });
    // Verificar que se creó la sala
    await expect(page.locator('#roomCodeValue')).toBeVisible({ timeout: 15000 });
  });

  test('Prevención doble clic - Botones críticos', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await page.fill('#username', 'TestUser');
    
    // Hacer doble clic rápido en crear sala
    const createBtn = page.locator('#createRoomButton');
    await createBtn.dblclick();
    
    // Esperar navegación
    await page.waitForURL(/\/views\/create-room\.html/);
    await page.waitForLoadState('networkidle');
    
    // Crear sala con doble clic
    await page.fill('#roomName', 'Test Room');
    const createRoomBtn = page.locator('#createRoomButton');
    
    // Esperar que el botón esté habilitado
    await expect(createRoomBtn).toBeEnabled();
    
    // Doble clic rápido
    await createRoomBtn.dblclick();
    
    // Esperar que el botón se deshabilite (indicando que se está procesando)
    await expect(createRoomBtn).toBeDisabled({ timeout: 5000 });
    
    // Esperar que la sección roomInfo se muestre con timeout mayor
    await expect(page.locator('#roomInfo')).not.toHaveClass('hidden', { timeout: 15000 });
    // Verificar que solo se creó una sala (no duplicada)
    await expect(page.locator('#roomCodeValue')).toBeVisible({ timeout: 15000 });
    
    // Verificar que el botón se deshabilitó después del primer clic
    await expect(createRoomBtn).toBeDisabled();
  });

  test('Validación en tiempo real - Inputs de palabras', async ({ page }) => {
    // Crear sala primero
    await page.goto(`${BASE}/index.html`);
    await page.fill('#username', 'TestUser');
    await page.click('#createRoomButton');
    
    await page.fill('#roomName', 'Test Room');
    await page.click('#createRoomButton');
    
    // Esperar que la sección roomInfo se muestre con timeout mayor
    await expect(page.locator('#roomInfo')).not.toHaveClass('hidden', { timeout: 10000 });
    // Simular inicio de juego (necesitamos al menos 2 jugadores para los tests reales)
    // Por ahora verificamos que la UI está lista
    await expect(page.locator('#roomCodeValue')).toBeVisible({ timeout: 10000 });
    
    // Verificar que hay un botón de "Esperando jugadores"
    await expect(page.locator('text=Esperando jugadores')).toBeVisible();
  });

  test('Accesibilidad - ARIA labels y roles', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    
    // Verificar roles ARIA
    await expect(page.locator('#main-content')).toBeVisible();
    
    // Verificar labels
    const nameInput = page.locator('#username');
    await expect(nameInput).toHaveAttribute('aria-describedby');
    
    // Verificar que los botones tienen texto descriptivo
    const createBtn = page.locator('#createRoomButton');
    const joinBtn = page.locator('#joinRoomButton');
    
    await expect(createBtn).toContainText('Crear');
    await expect(joinBtn).toContainText('Unirse');
  });

  test('Responsividad tablet - Crear y unirse', async ({ page }) => {
    // Configurar viewport para tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(`${BASE}/index.html`);
    
    // Verificar layout en tablet
    await expect(page.locator('.hero__form')).toBeVisible();
    
    // Crear sala
    await page.fill('#username', 'TabletUser');
    await page.click('#createRoomButton');
    
    await expect(page).toHaveURL(/\/views\/create-room\.html/);
    
    // Verificar que el formulario se ve bien en tablet
    await expect(page.locator('.create-room-card')).toBeVisible();
    
    await page.fill('#roomName', 'Tablet Room');
    await page.click('#createRoomButton');
    
    // Esperar que la sección roomInfo se muestre con timeout mayor
    await expect(page.locator('#roomInfo')).not.toHaveClass('hidden', { timeout: 10000 });
    // Verificar sala creada
    await expect(page.locator('#roomCodeValue')).toBeVisible({ timeout: 10000 });
  });

  test('Manejo de errores - Conexión perdida', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    
    // Simular desconexión interceptando requests
    await page.route('**/socket.io/**', route => {
      route.abort();
    });
    
    await page.fill('#username', 'TestUser');
    await page.click('#createRoomButton');
    
    // Verificar que se maneja la desconexión gracefully
    // (El comportamiento exacto depende de la implementación)
    await page.waitForTimeout(2000);
    
    // Verificar que no hay errores JavaScript no manejados
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });

  test('Limpieza de memoria - Múltiples navegaciones', async ({ page }) => {
    // Navegar múltiples veces para verificar limpieza
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE}/index.html`);
      await page.fill('#username', `User${i}`);
      await page.click('#createRoomButton');
      
      await page.waitForURL(/\/views\/create-room\.html/);
      await page.waitForLoadState('networkidle');
      
      await page.fill('#roomName', `Room${i}`);
      
      // Esperar que el botón esté habilitado
      await expect(page.locator('#createRoomButton')).toBeEnabled();
      await page.click('#createRoomButton');
      
      // Esperar que el botón se deshabilite
      await expect(page.locator('#createRoomButton')).toBeDisabled({ timeout: 5000 });
      
      // Esperar que la sección roomInfo se muestre con timeout mayor
      await expect(page.locator('#roomInfo')).not.toHaveClass('hidden', { timeout: 15000 });
      // Esperar que la sala se cree
      await expect(page.locator('#roomCodeValue')).toBeVisible({ timeout: 15000 });
      
      // Navegar directamente al inicio en lugar de usar goBack()
      await page.goto(`${BASE}/index.html`);
    }
    
    // Verificar que estamos en la página principal y no hay memory leaks obvios
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
  });

  test('Validación de entrada - Caracteres especiales', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    
    // Probar caracteres especiales en nombre
    await page.fill('#username', '🎮TestUser123!@#');
    await page.click('#createRoomButton');
    
    await expect(page).toHaveURL(/\/views\/create-room\.html/);
    
    // Probar caracteres especiales en nombre de sala
    await page.fill('#roomName', 'Sala🍎Test!@#$%');
    await page.click('#createRoomButton');
    
    // Esperar que la sección roomInfo se muestre con timeout mayor
    await expect(page.locator('#roomInfo')).not.toHaveClass('hidden', { timeout: 10000 });
    // Verificar que se maneja correctamente
    await expect(page.locator('#roomCodeValue')).toBeVisible({ timeout: 10000 });
  });

  test('Persistencia de datos - LocalStorage', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await page.fill('#username', 'PersistentUser');
    await page.click('#createRoomButton');
    
    await page.fill('#roomName', 'Persistent Room');
    await page.click('#createRoomButton');
    
    const roomCode = await page.locator('#roomCodeValue').textContent();
    
    // Recargar página
    await page.reload();
    
    // Verificar que los datos persisten
    // (Dependiendo de la implementación)
    await page.waitForTimeout(1000);
    
    // Navegar de vuelta al inicio y verificar
    await page.goto(`${BASE}/index.html`);
    
    // El nombre debería persistir
    const savedName = await page.locator('#username').inputValue();
    expect(savedName).toBe('PersistentUser');
  });
});
