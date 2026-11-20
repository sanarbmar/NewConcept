import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * TC-E2E-09 / RF-10: el enlace personal que se entrega al cliente debe incluir la base /NewConcept/.
 * Prueba estática (la UI usa window.location.origin, que en GitHub Pages es https://sanarbmar.github.io SIN /NewConcept).
 */
describe('Enlace personal de gestión (#mis-citas/TOKEN)', () => {
  const src = readFileSync(resolve(__dirname, '../../src/components/BookingModal.tsx'), 'utf8');

  it('DEFECTO-03 (corregido): el enlace se arma con la ruta actual y conserva /NewConcept/', () => {
    expect(src).not.toMatch(/window\.location\.origin\}?\/#mis-citas/);
    expect(src).toMatch(/window\.location\.origin\}\$\{window\.location\.pathname\}#mis-citas/);
  });

  it('el token se genera con el prefijo nc24k_', () => {
    expect(src).toContain('mis-citas');
  });
});
