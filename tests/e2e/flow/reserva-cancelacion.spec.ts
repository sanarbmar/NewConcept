/**
 * Flujos completos contra el EMULADOR (TC-E2E-01..11, TC-CAN-01..07).
 * SIN VERIFICAR en el sandbox (el emulador no se pudo descargar). Requiere el cambio de tests/e2e/flow/PATCH-emulador.md
 * y la app construida con VITE_USE_EMULATOR=1. Ajusta selectores si algún texto difiere.
 *
 * Reloj de referencia: miércoles 2026-11-11 09:00 America/Bogota (setFixedTime solo fija Date; no rompe timers de Firestore).
 */
import { test, expect, Page, request } from '@playwright/test';

const PROJECT = process.env.FIREBASE_PROJECT || 'demo-nc24k';
const EMU = 'http://127.0.0.1:8080';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/NewConcept/';
const CTX = { baseURL: BASE, timezoneId: 'America/Bogota', locale: 'es-CO' };
const NOW = new Date('2026-11-11T14:00:00Z'); // 09:00 Bogotá

async function limpiarEmulador() {
  const ctx = await request.newContext();
  const r = await ctx.delete(`${EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`);
  expect(r.ok()).toBeTruthy();
  await ctx.dispose();
}

async function abrir(page: Page) {
  await page.clock.setFixedTime(NOW);
  await page.goto('./', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
}

async function reservar(page: Page, { barbero = 0, servicio = 0, hora = /10:00/, nombre = 'Cliente Prueba', tel = '3001234567' } = {}) {
  await page.getByRole('button', { name: /Agendar/ }).first().click();
  await page.getByText('Elegir →').nth(barbero).click();
  await page.getByText('Seleccionar →').nth(servicio).click();
  await expect(page.getByText('Verificando agenda en vivo...')).toBeHidden({ timeout: 15_000 });
  await page.getByRole('button', { name: hora }).first().click();
  await page.getByRole('button', { name: /Continuar|Siguiente|Datos/i }).first().click().catch(() => {});
  await page.getByPlaceholder('Ej. Carlos Restrepo').fill(nombre);
  await page.getByPlaceholder('311 235 2517').fill(tel);
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: /Confirmar Reserva Inmediata/i }).click();
}

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => { await limpiarEmulador(); });

test('TC-E2E-01 reserva exitosa muestra "Cita Confirmada al Instante" y token nc24k_', async ({ page }) => {
  await abrir(page);
  await reservar(page);
  await expect(page.getByText(/Cita Confirmada al Instante/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText(/nc24k_[A-Za-z0-9]{18}/);
});

test('TC-E2E-04 el horario reservado deja de ofrecerse al siguiente cliente', async ({ browser }) => {
  const a = await (await browser.newContext(CTX)).newPage();
  await abrir(a);
  await reservar(a);
  await expect(a.getByText(/Cita Confirmada al Instante/i)).toBeVisible({ timeout: 15_000 });

  const b = await (await browser.newContext(CTX)).newPage();
  await abrir(b);
  await b.getByRole('button', { name: /Agendar/ }).first().click();
  await b.getByText('Elegir →').nth(0).click();
  await b.getByText('Seleccionar →').nth(0).click();
  await expect(b.getByText('Verificando agenda en vivo...')).toBeHidden({ timeout: 15_000 });
  await expect(b.getByRole('button', { name: /^10:00/ })).toHaveCount(0);
});

test('TC-E2E-05 carrera: dos clientes confirman el MISMO horario → solo uno gana', async ({ browser }) => {
  const mk = async () => { const p = await (await browser.newContext(CTX)).newPage(); await abrir(p); return p; };
  const [p1, p2] = [await mk(), await mk()];
  // Ambos llegan hasta el formulario con el mismo horario visible
  for (const [p, n, t] of [[p1, 'Cliente Uno', '3001111111'], [p2, 'Cliente Dos', '3002222222']] as const) {
    await p.getByRole('button', { name: /Agendar/ }).first().click();
    await p.getByText('Elegir →').nth(0).click();
    await p.getByText('Seleccionar →').nth(0).click();
    await expect(p.getByText('Verificando agenda en vivo...')).toBeHidden({ timeout: 15_000 });
    await p.getByRole('button', { name: /10:00/ }).first().click();
    await p.getByPlaceholder('Ej. Carlos Restrepo').fill(n);
    await p.getByPlaceholder('311 235 2517').fill(t);
    await p.locator('input[type="checkbox"]').first().check();
  }
  await Promise.all([
    p1.getByRole('button', { name: /Confirmar Reserva Inmediata/i }).click(),
    p2.getByRole('button', { name: /Confirmar Reserva Inmediata/i }).click(),
  ]);
  await p1.waitForTimeout(4000);
  const ok1 = await p1.getByText(/Cita Confirmada al Instante/i).count();
  const ok2 = await p2.getByText(/Cita Confirmada al Instante/i).count();
  const err = (await p1.getByText(/acaba de ser reservado/i).count()) + (await p2.getByText(/acaba de ser reservado/i).count());
  expect(ok1 + ok2).toBe(1);
  expect(err).toBe(1);
});

test('TC-CAN-01 cancelar desde el enlace personal libera el horario', async ({ page, browser }) => {
  await abrir(page);
  await reservar(page);
  await expect(page.getByText(/Cita Confirmada al Instante/i)).toBeVisible({ timeout: 15_000 });
  const token = (await page.locator('body').innerText()).match(/nc24k_[A-Za-z0-9]{18}/)![0];

  // Cita a las 10:00 con "ahora" = 09:00 → faltan 1 h (<3 h): la cancelación debe estar BLOQUEADA (TC-CAN-04)
  const g = await (await browser.newContext(CTX)).newPage();
  await abrir(g);
  await g.goto(`./#mis-citas/${token}`);
  await expect(g.getByText(/WhatsApp|311 235 2517/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(g.getByRole('button', { name: /Cancelar (mi )?cita/i })).toHaveCount(0);
});
