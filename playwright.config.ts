import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: process.env.CI ? 120_000 : 60_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    ...(process.env.CI ? {
      viewport: { width: 960, height: 640 },
      launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--disable-dev-shm-usage"] },
    } : {}),
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
    command: "node node_modules/vite/bin/vite.js --mode editor-test",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
