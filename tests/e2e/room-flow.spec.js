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

    // Esperar código de sala
    const roomCode = await host.locator('#roomCodeValue').innerText();
    expect(roomCode).toMatch(/[a-z0-9]{5,}/i);

    // INVITADO: index -> join-room -> ingresar código
    const contextGuest = await browser.newContext();
    const guest = await contextGuest.newPage();
    await guest.goto(`${BASE}/index.html`);
    await guest.fill('#username', 'guest-e2e');
    await guest.click('#joinRoomButton');
    await expect(guest).toHaveURL(/\/views\/join-room\.html/);
    await guest.fill('#roomCodeInput', roomCode);
    await guest.click('#joinRoomButton');

    // Sala de espera debería mostrar 2/5
    await expect(guest.locator('#waiting-players-count')).toHaveText('2');

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


