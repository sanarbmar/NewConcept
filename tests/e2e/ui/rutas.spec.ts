import { test, expect } from '@playwright/test';
import { aislarRed, abrirLanding } from './helpers';

test.describe('Rutas hash y estados de error (RF-12, RF-20, TC-E2E-12)', () => {
  test.beforeEach(async ({ page }) => { await aislarRed(page); });

  test('TC-CAN-08 token inexistente / Firestore caído → mensaje controlado, sin pantalla en blanco', async ({ page }) => {
    await abrirLanding(page, '#mis-citas/nc24k_noexiste0000000000');
    await expect(page.getByText(/CITA NO ENCONTRADA/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/VOLVER AL INICIO/i)).toBeVisible();
  });

  test('TC-CAN-08b "Volver al inicio" regresa a la landing', async ({ page }) => {
    await abrirLanding(page, '#mis-citas/nc24k_noexiste0000000000');
    await page.getByText(/VOLVER AL INICIO/i).click();
    await expect(page.getByText(/PRECISIÓN URBANA/i)).toBeVisible();
  });

  test('TC-SEC-20 #admin sin sesión muestra login y NO datos', async ({ page }) => {
    await abrirLanding(page, '#admin');
    await expect(page.getByText(/ACCESO RESTRINGIDO/i)).toBeVisible();
    await expect(page.getByText(/INICIAR SESIÓN CON GOOGLE/i)).toBeVisible();
    const cuerpo = await page.locator('body').innerText();
    expect(cuerpo).not.toMatch(/\b3[0-9]{9}\b.*\$/s); // sin teléfonos+precios de clientes
  });

  test('TC-UI-09 el modal de admin se cierra con Escape', async ({ page }) => {
    test.fail(true, 'DEFECTO-07 (bajo): la pantalla de login admin no se cierra con Esc (solo la cita manual). Quitar esta línea al corregir.');
    await abrirLanding(page, '#admin');
    await expect(page.getByText(/ACCESO RESTRINGIDO/i)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText(/ACCESO RESTRINGIDO/i)).toBeHidden();
  });

  test('TC-UI-10 botón "atrás" del navegador sale de la vista de cita', async ({ page }) => {
    test.fail(true, 'DEFECTO-08 (bajo): App.tsx no limpia clientTokenView en hashchange; "atrás" deja al cliente en la vista de cita. Quitar esta línea al corregir.');
    await abrirLanding(page);
    await page.goto('./#mis-citas/nc24k_noexiste0000000000');
    await expect(page.getByText(/CITA NO ENCONTRADA/i)).toBeVisible({ timeout: 20_000 });
    await page.goBack();
    // Esperado por usuario: volver a la landing. Si falla → DEFECTO (App.tsx no limpia clientTokenView en hashchange).
    await expect(page.getByText(/PRECISIÓN URBANA/i)).toBeVisible({ timeout: 5_000 });
  });
});
