import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:6173',
    headless: true,
  },
  webServer: [
    {
      command: 'cd backend && PORT=6172 node src/index.js',
      port: 6172,
      reuseExistingServer: false,
    },
    {
      command: 'cd frontend && VITE_API_URL=http://localhost:6172 npx vite --port 6173',
      port: 6173,
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
