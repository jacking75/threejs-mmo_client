import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/performance", workers: 1, timeout: 300_000,
  reporter: [["list"], ["json", { outputFile: "docs_working/performance-results.json" }]],
  use: { baseURL: "http://127.0.0.1:4173", channel: "chrome", ...devices["Desktop Chrome"], trace: "retain-on-failure" },
});
