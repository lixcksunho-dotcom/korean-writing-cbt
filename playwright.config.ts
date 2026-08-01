import { defineConfig, devices } from '@playwright/test'

// 기본 대상은 배포된 프로덕션. 로컬을 보려면 PLAYWRIGHT_BASE_URL로 바꾼다.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://kptest.cloud',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
