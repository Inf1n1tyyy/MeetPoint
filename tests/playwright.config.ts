import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    locale: "ru-RU",
  },

  projects: [
    {
      name: "Chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    // Раскомментируйте для мобильного тестирования:
    // {
    //   name: "Mobile Safari",
    //   use: { ...devices["iPhone 14"] },
    // },
  ],

  // Запуск серверов перед тестами (опционально)
  // webServer: [
  //   {
  //     command: "cd ../server && npm run dev",
  //     url: "http://localhost:5000",
  //     reuseExistingServer: true,
  //   },
  //   {
  //     command: "cd ../meeting-app && npm run dev",
  //     url: "http://localhost:5173",
  //     reuseExistingServer: true,
  //   },
  // ],
});
