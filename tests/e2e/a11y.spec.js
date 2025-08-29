// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('A11y/UX básico - Páginas principales', () => {
  test('index.html - estructura y controles accesibles', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);

    // Título y formulario principal
    await expect(page).toHaveTitle(/Tutifrutti/i);
    await expect(page.locator('#welcomeForm')).toBeVisible();

    // Campo de nombre con label y aria-describedby
    const username = page.locator('#username');
    await expect(username).toBeVisible();
    await expect(page.locator('label[for="username"]')).toBeVisible();
    await expect(username).toHaveAttribute('aria-describedby', /username-help/);

    // Botones con texto y role "button"
    await expect(page.locator('#createRoomButton')).toBeVisible();
    await expect(page.locator('#joinRoomButton')).toBeVisible();
  });

  test('create-room.html - accesibilidad básica de formulario y lista de jugadores', async ({ page }) => {
    // Fluir desde index para garantizar estado correcto
    await page.goto(`${BASE}/index.html`);
    await page.fill('#username', 'a11y-user');
    await page.click('#createRoomButton');
    await expect(page).toHaveURL(/\/views\/create-room\.html/);

    // Encabezado y formulario
    await expect(page.getByRole('heading', { name: /Crear Sala/i })).toBeVisible();
    await expect(page.locator('#createRoomForm')).toBeVisible();

    // Campos y accesibilidad
    await expect(page.locator('#playerName')).toBeVisible();
    await expect(page.locator('#roomName')).toBeVisible();
    await expect(page.locator('#roomName')).toHaveAttribute('aria-describedby', /roomName-help/);

    // Botón crear sala visible
    await expect(page.locator('#createRoomButton')).toBeVisible();
  });

  test('join-room.html - formulario y región de salas', async ({ page }) => {
    // Fluir desde index para garantizar estado correcto
    await page.goto(`${BASE}/index.html`);
    await page.fill('#username', 'a11y-guest');
    await page.click('#joinRoomButton');
    await expect(page).toHaveURL(/\/views\/join-room\.html/);

    // Encabezado y formulario
    await expect(page.getByRole('heading', { name: /Unirse a Sala/i })).toBeVisible();
    await expect(page.locator('#joinRoomForm')).toBeVisible();

    // Campo código con aria-describedby y lista de salas como región
    await expect(page.locator('#roomCodeInput')).toBeVisible();
    await expect(page.locator('#roomCodeInput')).toHaveAttribute('aria-describedby', /roomCode-help/);

    const roomsRegion = page.locator('#roomsList');
    await expect(roomsRegion).toBeVisible();
    await expect(roomsRegion).toHaveAttribute('role', 'region');
  });
});
