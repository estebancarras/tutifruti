// @ts-check
import { test, expect, chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Flujo E2E: crear sala, unirse y arrancar juego', () => {
  test('host crea, invitado se une, host inicia juego y ambos llegan a game', async ({ browser }) => {
    const contextHost = await browser.newContext();
    const host = await contextHost.newPage();

    // HOST: index -> create-room
    await host.goto(`${BASE}/index.html`);
    await host.fill('#username', 'host-e2e');
    await host.click('#createRoomButton');
    await expect(host).toHaveURL(/\/views\/create-room\.html/);

    // Crear la sala y esperar el código
    await host.click('#createRoomButton');
    await expect(host.locator('#roomCodeValue')).toHaveText(/[a-z0-9]{5,}/i);
    const roomCode = await host.locator('#roomCodeValue').innerText();

    // INVITADO: index -> join-room -> ingresar código
    const contextGuest = await browser.newContext();
    const guest = await contextGuest.newPage();
    await guest.goto(`${BASE}/index.html`);
    await guest.fill('#username', 'guest-e2e');
    await guest.click('#joinRoomButton');
    await expect(guest).toHaveURL(/\/views\/join-room\.html/);
    await guest.fill('#roomCodeInput', roomCode);
    await guest.click('#joinRoomButton');

    // Sala de espera: esperar overlay y 2 jugadores
    await guest.waitForSelector('.waiting-room-container', { timeout: 10000 });
    await expect(guest.locator('#waiting-players-count')).toHaveText('2', { timeout: 10000 });
    // Host debería ver 2/5 y botón habilitado
    await expect(host.locator('#playersCountDisplay')).toHaveText(/2\/\d+/, { timeout: 10000 });
    await expect(host.locator('#goToGameButton')).toBeEnabled({ timeout: 10000 });

    // HOST: iniciar juego
    await host.click('#goToGameButton');

    // Ambos deberían llegar a game.html (redirige por showRoulette)
    await expect(host).toHaveURL(/\/views\/game\.html\?roomId=/);
    await expect(guest).toHaveURL(/\/views\/game\.html\?roomId=/);

    // UI de juego: nombre de jugador visible y contador >= 2
    await expect(host.locator('#playerName')).toContainText('host-e2e');
    await expect(guest.locator('#playerName')).toContainText('guest-e2e');
    await expect(host.locator('#playersCount')).toContainText('2/');
    await expect(guest.locator('#playersCount')).toContainText('2/');

    await contextGuest.close();
    await contextHost.close();
  });
});


