import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: ['**/*.alignment.spec.ts', '**/*.smoke.spec.ts'],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:17004',
  },
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:17004',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
