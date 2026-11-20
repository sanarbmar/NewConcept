import { Page } from '@playwright/test';

/** Bloquea todo lo que no sea el servidor local: pruebas deterministas y NUNCA tocan Firestore de producción. */
export async function aislarRed(page: Page, bloqueados: string[] = []) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('data:') || url.startsWith('blob:')) {
      return route.continue();
    }
    bloqueados.push(url);
    return route.abort();
  });
}

/** Abre la landing y espera a que termine el loader (1.2 s). */
export async function abrirLanding(page: Page, hash = '') {
  await page.goto(hash ? `./${hash}` : './', { waitUntil: 'load' });
  await page.getByText('NEW CONCEPT 24K').first().waitFor();
  await page.waitForTimeout(1500);
}
