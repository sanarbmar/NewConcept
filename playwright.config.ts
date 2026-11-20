import { defineConfig } from '@playwright/test';

// Chrome del sistema (en máquinas con Playwright instalado puedes dejar CHROME_PATH vacío).
const executablePath = process.env.CHROME_PATH || undefined;
const PORT = Number(process.env.E2E_PORT || 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/NewConcept/`,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath,
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/NewConcept/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
