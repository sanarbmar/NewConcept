import { defineConfig } from 'vitest/config';

// Pruebas unitarias de la lógica de reservas (sin red, sin Firebase real).
// Las pruebas de reglas (tests/rules) y E2E (tests/e2e) tienen su propio runner.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    reporters: ['default'],
  },
});
