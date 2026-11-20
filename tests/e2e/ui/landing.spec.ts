import { test, expect } from '@playwright/test';
import { aislarRed, abrirLanding } from './helpers';

test.describe('Landing — contenido (RF-01, RF-02, RNF-usabilidad)', () => {
  test.beforeEach(async ({ page }) => { await aislarRed(page); });

  test('TC-UI-01 título, idioma y metadatos SEO', async ({ page }) => {
    await abrirLanding(page);
    await expect(page).toHaveTitle(/New Concept 24k/i);
    expect(await page.locator('html').getAttribute('lang')).toMatch(/^es/);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('width=device-width');
  });

  test('TC-UI-02 navegación principal con todas las secciones', async ({ page }) => {
    await abrirLanding(page);
    const nav = page.locator('nav').first();
    for (const t of ['INICIO', 'SERVICIOS', 'BARBEROS', 'GALERÍA', 'NOSOTROS', 'PREGUNTAS', 'UBICACIÓN']) {
      await expect(nav.getByText(t, { exact: false }).first()).toBeVisible();
    }
  });

  test('TC-UI-03 catálogo de servicios con precios en COP', async ({ page }) => {
    await abrirLanding(page);
    const servicios = page.locator('#servicios');
    await expect(servicios).toContainText(/\$\s?25\.000/);
    await expect(servicios).toContainText(/\$\s?35\.000/);
    await expect(servicios).toContainText(/\$\s?20\.000/);
    await expect(servicios).toContainText(/\$\s?15\.000/);
  });

  test('TC-UI-04 los dos barberos se muestran', async ({ page }) => {
    await abrirLanding(page);
    const b = page.locator('#barberos');
    await expect(b).toContainText('Sebastián Correa');
    await expect(b).toContainText('Sebastián Ciro');
  });

  test('TC-UI-05 FAQ coherente con reglas de negocio (30 min, 6 días, 3 h, WhatsApp)', async ({ page }) => {
    await abrirLanding(page);
    const botones = page.locator('#faq button');
    expect(await botones.count()).toBe(5);
    const textos: string[] = [];
    for (let i = 0; i < 5; i++) {
      await botones.nth(i).click();
      await page.waitForTimeout(300);
      textos.push(await page.locator('#faq').innerText());
    }
    const todo = textos.join(' ');
    expect(todo).toContain('30 minutos');
    expect(todo).toContain('6 días');
    expect(todo).toContain('3 horas');
    expect(todo).toContain('311 235 2517');
    expect(todo).toMatch(/gratuita|No\./);
  });

  test('TC-UI-06 FAQ: abrir una respuesta no rompe la página (un solo acordeón visible)', async ({ page }) => {
    await abrirLanding(page);
    const botones = page.locator('#faq button');
    await botones.nth(1).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#faq')).toContainText('mínimo de 30 minutos');
    await botones.nth(3).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#faq')).toContainText('completamente gratuita');
  });

  test('TC-UI-07 enlaces de WhatsApp/ubicación apuntan al número oficial', async ({ page }) => {
    await abrirLanding(page);
    const hrefs = await page.locator('a[href*="wa.me"], a[href*="whatsapp"]').evaluateAll(els => els.map(e => (e as HTMLAnchorElement).href));
    for (const h of hrefs) expect(h).toContain('573112352517');
  });

  test('TC-UI-08 imágenes locales cargan (sin imágenes rotas)', async ({ page }) => {
    await abrirLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    const rotas = await page.evaluate(() =>
      [...document.images].filter(i => i.src.startsWith(location.origin) && i.complete && i.naturalWidth === 0).map(i => i.src));
    expect(rotas).toEqual([]);
  });
});
