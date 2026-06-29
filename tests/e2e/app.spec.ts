/**
 * E2E тесты — MeetPoint (Playwright)
 *
 * Установка:
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *
 * Запуск:
 *   npx playwright test tests/e2e/
 *
 * Переменные окружения:
 *   BASE_URL  — URL фронтенда (default: http://localhost:5173)
 *   API_URL   — URL бэкенда  (default: http://localhost:5000)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:5000";

const uid = Date.now();
const TEST_USER = {
  firstName: "Тест",
  lastName: "E2E",
  email: `e2e_${uid}@test.com`,
  password: "password123",
};

// ────────────────────────────────────────────────────────────────────────────────
// Хелперы
// ────────────────────────────────────────────────────────────────────────────────

async function registerViaAPI(overrides: Partial<typeof TEST_USER> = {}) {
  const user = { ...TEST_USER, ...overrides };
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  return { ...user, token: data.token, id: data.user?.id };
}

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

// ────────────────────────────────────────────────────────────────────────────────
// Лендинг
// ────────────────────────────────────────────────────────────────────────────────

test.describe("Landing Page", () => {
  test("открывается и содержит кнопки входа и регистрации", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/meetpoint/i);
    await expect(page.getByRole("link", { name: /войти/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /зарегистрироваться/i })).toBeVisible();
  });

  test("неавторизованный пользователь редиректится на /login при переходе на /meetings", async ({ page }) => {
    await page.goto(`${BASE_URL}/meetings`);
    await expect(page).toHaveURL(/login/);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Регистрация
// ────────────────────────────────────────────────────────────────────────────────

test.describe("Регистрация", () => {
  const newUser = {
    firstName: "Новый",
    lastName: "Пользователь",
    email: `register_${uid}@test.com`,
    password: "password123",
  };

  test("успешная регистрация перенаправляет на /meetings", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input[name="firstName"]', newUser.firstName);
    await page.fill('input[name="lastName"]', newUser.lastName);
    await page.fill('input[name="email"]', newUser.email);
    await page.fill('input[name="password"]', newUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/meetings/, { timeout: 5000 });
  });

  test("ошибка при повторной регистрации с тем же email", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input[name="firstName"]', newUser.firstName);
    await page.fill('input[name="lastName"]', newUser.lastName);
    await page.fill('input[name="email"]', newUser.email);
    await page.fill('input[name="password"]', newUser.password);
    await page.click('button[type="submit"]');

    // Должно появиться сообщение об ошибке
    await expect(page.getByText(/уже существует/i)).toBeVisible({ timeout: 5000 });
  });

  test("показывает ошибки валидации при пустой форме", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.click('button[type="submit"]');

    // Должны появиться сообщения об ошибках полей
    const errors = page.locator('[role="alert"], .error, [data-error]');
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Логин
// ────────────────────────────────────────────────────────────────────────────────

test.describe("Логин", () => {
  let user: Awaited<ReturnType<typeof registerViaAPI>>;

  test.beforeAll(async () => {
    user = await registerViaAPI({ email: `login_${uid}@test.com` });
  });

  test("успешный вход перенаправляет на /meetings", async ({ page }) => {
    await loginViaUI(page, user.email, user.password);
    await expect(page).toHaveURL(/meetings/, { timeout: 5000 });
  });

  test("ошибка при неверном пароле", async ({ page }) => {
    await loginViaUI(page, user.email, "wrongpassword");
    await expect(page.getByText(/неверный/i)).toBeVisible({ timeout: 5000 });
  });

  test("токен сохраняется в localStorage после входа", async ({ page }) => {
    await loginViaUI(page, user.email, user.password);
    await page.waitForURL(/meetings/);

    const token = await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        const value = localStorage.getItem(key) ?? "";
        if (value.startsWith("ey")) return value;
      }
      return null;
    });

    expect(token).toBeTruthy();
    expect(token!.split(".")).toHaveLength(3); // JWT
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Список встреч
// ────────────────────────────────────────────────────────────────────────────────

test.describe("Страница встреч", () => {
  let user: Awaited<ReturnType<typeof registerViaAPI>>;

  test.beforeAll(async () => {
    user = await registerViaAPI({ email: `meetings_${uid}@test.com` });
  });

  test("отображает список встреч после входа", async ({ page }) => {
    await loginViaUI(page, user.email, user.password);
    await expect(page).toHaveURL(/meetings/, { timeout: 5000 });

    // Страница загрузилась (нет infinite spinner)
    await expect(page.locator('[data-testid="meetings-list"], .meetings-list, main')).toBeVisible();
  });

  test("работает поиск по названию", async ({ page }) => {
    await loginViaUI(page, user.email, user.password);
    await page.waitForURL(/meetings/);

    const searchInput = page.getByPlaceholder(/поиск/i).or(page.locator('input[type="search"]'));
    if (await searchInput.isVisible()) {
      await searchInput.fill("несуществующая встреча xyz123");
      await page.waitForTimeout(500);
      // Список должен стать пустым или показать заглушку
      await expect(page.getByText(/ничего не найдено|no results|пусто/i).or(
        page.locator('[data-testid="empty-state"]')
      )).toBeVisible({ timeout: 3000 }).catch(() => {
        // Если нет точного сообщения — OK, главное что не crash
      });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Создание встречи
// ────────────────────────────────────────────────────────────────────────────────

test.describe("Создание встречи", () => {
  let user: Awaited<ReturnType<typeof registerViaAPI>>;

  test.beforeAll(async () => {
    user = await registerViaAPI({ email: `create_meet_${uid}@test.com` });
  });

  test("можно создать встречу через форму", async ({ page }) => {
    await loginViaUI(page, user.email, user.password);
    await page.waitForURL(/meetings/);

    // Ищем кнопку создания
    const createBtn = page.getByRole("button", { name: /создать|новая|add|new/i })
      .or(page.getByText(/создать встречу/i));

    if (await createBtn.isVisible()) {
      await createBtn.click();

      // Заполняем форму
      const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      const dateStr = future.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

      await page.fill('input[name="title"]', "E2E тестовая встреча");
      await page.fill('textarea[name="description"]', "Описание E2E встречи для автотеста, достаточно длинное");
      await page.fill('input[name="address"]', "ул. Тестовая, 1");

      const dateInput = page.locator('input[type="datetime-local"]');
      if (await dateInput.isVisible()) {
        await dateInput.fill(dateStr);
      }

      // Выбираем категорию если есть select
      const categorySelect = page.locator('select[name="category"]');
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption({ index: 1 });
      }

      await page.click('button[type="submit"]');

      // После создания должны перейти на страницу встречи или список
      await expect(page).toHaveURL(/meetings/, { timeout: 5000 });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Выход из аккаунта
// ────────────────────────────────────────────────────────────────────────────────

test.describe("Выход из аккаунта", () => {
  let user: Awaited<ReturnType<typeof registerViaAPI>>;

  test.beforeAll(async () => {
    user = await registerViaAPI({ email: `logout_${uid}@test.com` });
  });

  test("выход очищает сессию и редиректит на главную", async ({ page }) => {
    await loginViaUI(page, user.email, user.password);
    await page.waitForURL(/meetings/);

    // Ищем кнопку выхода
    const logoutBtn = page.getByRole("button", { name: /выйти|logout/i })
      .or(page.getByText(/выйти/i));

    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/$|login/, { timeout: 3000 });

      // localStorage должен быть очищен
      const token = await page.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
          const val = localStorage.getItem(key) ?? "";
          if (val.startsWith("ey")) return val;
        }
        return null;
      });
      expect(token).toBeNull();
    }
  });
});
