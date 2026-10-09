import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4176",
    browserName: "chromium",
    ...(process.env["PLAYWRIGHT_CHANNEL"] ? { channel: process.env["PLAYWRIGHT_CHANNEL"] } : {}),
    launchOptions: { args: ["--mute-audio"] },
    reducedMotion: "no-preference",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: !process.env["CI"],
  },
});
