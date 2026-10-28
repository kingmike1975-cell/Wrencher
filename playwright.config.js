import { defineConfig, devices } from '@playwright/test';

// Plays the game in a landscape iPhone-sized Chromium, served by a plain static server.
export default defineConfig({
  testDir: 'tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8788',
    ...devices['iPhone 13 landscape'],
    defaultBrowserType: 'chromium',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: { command: 'npx http-server public -p 8788 -s -c-1', port: 8788, reuseExistingServer: true },
});
