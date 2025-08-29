// @ts-check
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('E2E: flujo de rondas (maxRounds=1) y equidad de inputs', () => {
  test('host crea con 1 ronda, invitado se une, todos escriben tras ruleta y finaliza en Resultados Finales', async ({ browser }) => {
    // Contexto HOST
    const contextHost = await browser.newContext();
    const host = await contextHost.newPage();

    // HOST: index -> create-room
    await host.goto(`${BASE}/index.html`);
    await host.fill('#username', 'host-rounds');
    await host.click('#createRoomButton');
    await expect(host).toHaveURL(/\/views\/create-room\.html/);

    // Establecer 1 ronda y crear sala
    await host.fill('#rounds', '1');
    await host.click('#createRoomButton');
    await expect(host.locator('#roomCodeValue')).toHaveText(/[a-z0-9]{5,}/i, { timeout: 10000 });
    const roomCode = await host.locator('#roomCodeValue').innerText();

    // Contexto INVITADO
    const contextGuest = await browser.newContext();
    const guest = await contextGuest.newPage();

    // INVITADO: index -> join-room
    await guest.goto(`${BASE}/index.html`);
    await guest.fill('#username', 'guest-rounds');
    await guest.click('#joinRoomButton');
    await expect(guest).toHaveURL(/\/views\/join-room\.html/);

    await guest.fill('#roomCodeInput', roomCode);
    await guest.click('#joinRoomButton');

    // Sala de espera
    await guest.waitForSelector('.waiting-room-container', { timeout: 15000 });
    await expect(guest.locator('#waiting-players-count')).toHaveText('2', { timeout: 15000 });

    // HOST ve 2 jugadores y botón habilitado
    await expect(host.locator('#playersCountDisplay')).toHaveText(/2\/\d+/, { timeout: 15000 });
    await expect(host.locator('#goToGameButton')).toBeEnabled({ timeout: 15000 });

    // HOST: iniciar juego
    await host.click('#goToGameButton');

    // Ambos llegan a game.html
    await expect(host).toHaveURL(/\/views\/game\.html\?roomId=/, { timeout: 15000 });
    await expect(guest).toHaveURL(/\/views\/game\.html\?roomId=/, { timeout: 15000 });

    // Esperar SHOW_ROULETTE y que host tenga botón "Girar Ruleta"
    const hostSpinBtn = host.locator('#spinWheelButton');
    await expect(hostSpinBtn).toBeVisible({ timeout: 15000 });

    // HOST: girar ruleta
    await hostSpinBtn.click();

    // Esperar que aparezca una letra seleccionada distinta de "?"
    const letterLocatorHost = host.locator('#currentLetterDisplay');
    await expect(letterLocatorHost).toHaveText(/[A-ZÑÁÉÍÓÚÜ]/i, { timeout: 15000 });
    const letter = (await letterLocatorHost.innerText()).trim().charAt(0).toUpperCase();

    // Ambos deberían poder escribir tras la ruleta (inputs habilitados)
    const hostNameInput = host.locator('#input-NOMBRE');
    const guestNameInput = guest.locator('#input-NOMBRE');

    await expect(hostNameInput).toBeEnabled({ timeout: 15000 });
    await expect(guestNameInput).toBeEnabled({ timeout: 15000 });

    // Completar palabras válidas y enviar en ambos
    const validWord = `${letter}a`;
    await hostNameInput.fill(validWord);
    await host.click('#submitWordButton');

    await guestNameInput.fill(validWord);
    await guest.click('#submitWordButton');

    // Debe aparecer modal de resultados de la ronda
    await expect(host.getByText('Resultados de la Ronda')).toBeVisible({ timeout: 20000 });

    // Como maxRounds=1, el juego debe terminar con "Resultados Finales"
    await expect(host.getByRole('heading', { name: 'Resultados Finales' })).toBeVisible({ timeout: 30000 });

    await contextGuest.close();
    await contextHost.close();
  });
});
