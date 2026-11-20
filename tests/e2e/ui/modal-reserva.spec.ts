import { test, expect } from '@playwright/test';
import { aislarRed, abrirLanding } from './helpers';

async function abrirReserva(page: any) {
  await page.getByRole('button', { name: /Agendar/ }).first().click();
  await expect(page.getByText('Elige tu Barbero')).toBeVisible();
}

test.describe('Modal de reserva — UI sin backend (RF-03..RF-06)', () => {
  test.beforeEach(async ({ page }) => { await aislarRed(page); });

  test('TC-E2E-01a abre el modal en el paso de barbero con ambos barberos', async ({ page }) => {
    await abrirLanding(page);
    await abrirReserva(page);
    await expect(page.getByRole('heading', { name: /Agendar Cita en Vivo/i })).toBeVisible();
    expect(await page.getByText('Elegir →').count()).toBe(2);
  });

  test('TC-E2E-01b elegir barbero avanza al paso de servicios con 4 opciones', async ({ page }) => {
    await abrirLanding(page);
    await abrirReserva(page);
    await page.getByText('Elegir →').first().click();
    for (const s of ['Corte', 'Corte con barba', 'Marcada', 'Cejas']) {
      await expect(page.getByText(s, { exact: true }).first()).toBeVisible();
    }
    expect(await page.getByText('Seleccionar →').count()).toBe(4);
  });

  test('TC-UI-11 Escape cierra el modal de reserva (accesibilidad)', async ({ page }) => {
    test.fail(true, 'DEFECTO-04: el modal de reserva no se cierra con Esc (solo existe en galería y cita manual). Quitar esta línea al corregir.');
    await abrirLanding(page);
    await abrirReserva(page);
    await page.keyboard.press('Escape');
    await expect(page.getByText('Elige tu Barbero')).toBeHidden({ timeout: 2_000 });
  });

  test('TC-UI-12 el modal expone role=dialog (accesibilidad)', async ({ page }) => {
    test.fail(true, 'DEFECTO-04: el modal de reserva no tiene role=dialog/aria-modal. Quitar esta línea al corregir.');
    await abrirLanding(page);
    await abrirReserva(page);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 });
  });

  test('TC-UI-13 tarjetas de barbero operables con teclado (accesibilidad)', async ({ page }) => {
    test.fail(true, 'DEFECTO-05: tarjetas de barbero/servicio son <div onClick> sin tabindex/role=button. Quitar esta línea al corregir.');
    await abrirLanding(page);
    await abrirReserva(page);
    const foco = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')].filter(d => d.textContent?.trim().startsWith('Elegir') || (d.className.includes('cursor-pointer') && d.textContent?.includes('Elegir')));
      return els.some(e => e.getAttribute('tabindex') !== null || e.getAttribute('role') === 'button');
    });
    expect(foco).toBe(true);
  });

  test('TC-E2E-12 Firestore inaccesible en paso de fecha → mensaje de error o vacío controlado, sin cuelgue', async ({ page }) => {
    await abrirLanding(page);
    await abrirReserva(page);
    await page.getByText('Elegir →').first().click();
    await page.getByText('Seleccionar →').first().click();
    // Con la red bloqueada la agenda no puede cargar: no debe quedar "Verificando agenda…" para siempre.
    await expect(page.getByText('Verificando agenda en vivo...')).toBeHidden({ timeout: 25_000 });
  });
});
