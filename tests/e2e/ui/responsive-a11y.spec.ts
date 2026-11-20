import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { aislarRed, abrirLanding } from './helpers';

const anchos = [360, 390, 768, 1024, 1440];

test.describe('Responsive y accesibilidad (RNF)', () => {
  test.beforeEach(async ({ page }) => { await aislarRed(page); });

  for (const w of anchos) {
    test(`TC-UI-14 sin scroll horizontal a ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await abrirLanding(page);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(1);
    });
  }

  test('TC-UI-15 axe: landing sin violaciones críticas', async ({ page }) => {
    await abrirLanding(page);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const graves = r.violations.filter(v => v.impact === 'critical');
    console.log('AXE landing:', r.violations.map(v => `${v.impact}:${v.id}(${v.nodes.length})`).join(', ') || 'sin violaciones');
    expect(graves.map(v => v.id)).toEqual([]);
  });

  test('TC-UI-16 axe: landing sin violaciones serias (reporta)', async ({ page }) => {
    test.fail(true, 'DEFECTO-06: contraste insuficiente (color-contrast, 11 nodos en landing). Quitar esta línea al corregir.');
    await abrirLanding(page);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serias = r.violations.filter(v => v.impact === 'serious');
    expect(serias.map(v => `${v.id}(${v.nodes.length})`)).toEqual([]);
  });

  test('TC-UI-17 axe: modal de reserva', async ({ page }) => {
    test.fail(true, 'DEFECTO-04/06: botón sin nombre accesible (cerrar) y contraste en el modal. Quitar esta línea al corregir.');
    await abrirLanding(page);
    await page.getByRole('button', { name: /Agendar/ }).first().click();
    await expect(page.getByText('Elige tu Barbero')).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    console.log('AXE modal:', r.violations.map(v => `${v.impact}:${v.id}(${v.nodes.length})`).join(', ') || 'sin violaciones');
    expect(r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => v.id)).toEqual([]);
  });

  test('TC-UI-18 sin errores de JS en consola/pageerror al cargar la landing', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', e => errores.push(e.message));
    await abrirLanding(page);
    expect(errores).toEqual([]);
  });

  test('TC-UI-19 recursos propios sin 404', async ({ page }) => {
    const malos: string[] = [];
    page.on('response', r => { if (r.url().startsWith('http://127.0.0.1') && r.status() >= 400) malos.push(`${r.status()} ${r.url()}`); });
    await abrirLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    expect(malos).toEqual([]);
  });
});
