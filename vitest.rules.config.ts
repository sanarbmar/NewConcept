import { defineConfig } from 'vitest/config';

// Pruebas de reglas: requieren el emulador de Firestore corriendo (ver tests/README.md).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
