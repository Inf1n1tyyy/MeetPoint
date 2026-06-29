# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Регистрация >> показывает ошибки валидации при пустой форме
- Location: e2e\app.spec.ts:106:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role="alert"], .error, [data-error]').first()
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for locator('[role="alert"], .error, [data-error]').first()

```

```yaml
- main:
  - link "← На главную":
    - /url: /
  - text: Новый аккаунт
  - heading "Регистрация" [level=1]
  - paragraph: Создайте профиль, чтобы участвовать во встречах и общаться в чатах.
  - text: Имя
  - textbox "Имя Минимум 2 символа":
    - /placeholder: Иван
  - paragraph: Минимум 2 символа
  - text: Фамилия
  - textbox "Фамилия Минимум 2 символа":
    - /placeholder: Иванов
  - paragraph: Минимум 2 символа
  - text: Email
  - textbox "Email Некорректный email":
    - /placeholder: you@example.com
  - paragraph: Некорректный email
  - text: Пароль
  - textbox "Пароль Минимум 6 символов":
    - /placeholder: Минимум 6 символов
  - paragraph: Минимум 6 символов
  - text: Повторите пароль
  - textbox "Повторите пароль"
  - button "Создать аккаунт"
  - paragraph:
    - text: Уже есть аккаунт?
    - link "Войти":
      - /url: /login
```

# Test source

```ts
  12  |  *   BASE_URL  — URL фронтенда (default: http://localhost:5173)
  13  |  *   API_URL   — URL бэкенда  (default: http://localhost:5000)
  14  |  */
  15  | 
  16  | import { test, expect, type Page } from "@playwright/test";
  17  | 
  18  | const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
  19  | const API_URL = process.env.API_URL ?? "http://localhost:5000";
  20  | 
  21  | const uid = Date.now();
  22  | const TEST_USER = {
  23  |   firstName: "Тест",
  24  |   lastName: "E2E",
  25  |   email: `e2e_${uid}@test.com`,
  26  |   password: "password123",
  27  | };
  28  | 
  29  | // ────────────────────────────────────────────────────────────────────────────────
  30  | // Хелперы
  31  | // ────────────────────────────────────────────────────────────────────────────────
  32  | 
  33  | async function registerViaAPI(overrides: Partial<typeof TEST_USER> = {}) {
  34  |   const user = { ...TEST_USER, ...overrides };
  35  |   const res = await fetch(`${API_URL}/auth/register`, {
  36  |     method: "POST",
  37  |     headers: { "Content-Type": "application/json" },
  38  |     body: JSON.stringify(user),
  39  |   });
  40  |   const data = await res.json();
  41  |   return { ...user, token: data.token, id: data.user?.id };
  42  | }
  43  | 
  44  | async function loginViaUI(page: Page, email: string, password: string) {
  45  |   await page.goto(`${BASE_URL}/login`);
  46  |   await page.fill('input[type="email"]', email);
  47  |   await page.fill('input[type="password"]', password);
  48  |   await page.click('button[type="submit"]');
  49  | }
  50  | 
  51  | // ────────────────────────────────────────────────────────────────────────────────
  52  | // Лендинг
  53  | // ────────────────────────────────────────────────────────────────────────────────
  54  | 
  55  | test.describe("Landing Page", () => {
  56  |   test("открывается и содержит кнопки входа и регистрации", async ({ page }) => {
  57  |     await page.goto(BASE_URL);
  58  |     await expect(page).toHaveTitle(/meetpoint/i);
  59  |     await expect(page.getByRole("link", { name: /войти/i })).toBeVisible();
  60  |     await expect(page.getByRole("link", { name: /зарегистрироваться/i })).toBeVisible();
  61  |   });
  62  | 
  63  |   test("неавторизованный пользователь редиректится на /login при переходе на /meetings", async ({ page }) => {
  64  |     await page.goto(`${BASE_URL}/meetings`);
  65  |     await expect(page).toHaveURL(/login/);
  66  |   });
  67  | });
  68  | 
  69  | // ────────────────────────────────────────────────────────────────────────────────
  70  | // Регистрация
  71  | // ────────────────────────────────────────────────────────────────────────────────
  72  | 
  73  | test.describe("Регистрация", () => {
  74  |   const newUser = {
  75  |     firstName: "Новый",
  76  |     lastName: "Пользователь",
  77  |     email: `register_${uid}@test.com`,
  78  |     password: "password123",
  79  |   };
  80  | 
  81  |   test("успешная регистрация перенаправляет на /meetings", async ({ page }) => {
  82  |     await page.goto(`${BASE_URL}/register`);
  83  | 
  84  |     await page.fill('input[name="firstName"]', newUser.firstName);
  85  |     await page.fill('input[name="lastName"]', newUser.lastName);
  86  |     await page.fill('input[name="email"]', newUser.email);
  87  |     await page.fill('input[name="password"]', newUser.password);
  88  |     await page.click('button[type="submit"]');
  89  | 
  90  |     await expect(page).toHaveURL(/meetings/, { timeout: 5000 });
  91  |   });
  92  | 
  93  |   test("ошибка при повторной регистрации с тем же email", async ({ page }) => {
  94  |     await page.goto(`${BASE_URL}/register`);
  95  | 
  96  |     await page.fill('input[name="firstName"]', newUser.firstName);
  97  |     await page.fill('input[name="lastName"]', newUser.lastName);
  98  |     await page.fill('input[name="email"]', newUser.email);
  99  |     await page.fill('input[name="password"]', newUser.password);
  100 |     await page.click('button[type="submit"]');
  101 | 
  102 |     // Должно появиться сообщение об ошибке
  103 |     await expect(page.getByText(/уже существует/i)).toBeVisible({ timeout: 5000 });
  104 |   });
  105 | 
  106 |   test("показывает ошибки валидации при пустой форме", async ({ page }) => {
  107 |     await page.goto(`${BASE_URL}/register`);
  108 |     await page.click('button[type="submit"]');
  109 | 
  110 |     // Должны появиться сообщения об ошибках полей
  111 |     const errors = page.locator('[role="alert"], .error, [data-error]');
> 112 |     await expect(errors.first()).toBeVisible({ timeout: 3000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
  113 |   });
  114 | });
  115 | 
  116 | // ────────────────────────────────────────────────────────────────────────────────
  117 | // Логин
  118 | // ────────────────────────────────────────────────────────────────────────────────
  119 | 
  120 | test.describe("Логин", () => {
  121 |   let user: Awaited<ReturnType<typeof registerViaAPI>>;
  122 | 
  123 |   test.beforeAll(async () => {
  124 |     user = await registerViaAPI({ email: `login_${uid}@test.com` });
  125 |   });
  126 | 
  127 |   test("успешный вход перенаправляет на /meetings", async ({ page }) => {
  128 |     await loginViaUI(page, user.email, user.password);
  129 |     await expect(page).toHaveURL(/meetings/, { timeout: 5000 });
  130 |   });
  131 | 
  132 |   test("ошибка при неверном пароле", async ({ page }) => {
  133 |     await loginViaUI(page, user.email, "wrongpassword");
  134 |     await expect(page.getByText(/неверный/i)).toBeVisible({ timeout: 5000 });
  135 |   });
  136 | 
  137 |   test("токен сохраняется в localStorage после входа", async ({ page }) => {
  138 |     await loginViaUI(page, user.email, user.password);
  139 |     await page.waitForURL(/meetings/);
  140 | 
  141 |     const token = await page.evaluate(() => {
  142 |       for (const key of Object.keys(localStorage)) {
  143 |         const value = localStorage.getItem(key) ?? "";
  144 |         if (value.startsWith("ey")) return value;
  145 |       }
  146 |       return null;
  147 |     });
  148 | 
  149 |     expect(token).toBeTruthy();
  150 |     expect(token!.split(".")).toHaveLength(3); // JWT
  151 |   });
  152 | });
  153 | 
  154 | // ────────────────────────────────────────────────────────────────────────────────
  155 | // Список встреч
  156 | // ────────────────────────────────────────────────────────────────────────────────
  157 | 
  158 | test.describe("Страница встреч", () => {
  159 |   let user: Awaited<ReturnType<typeof registerViaAPI>>;
  160 | 
  161 |   test.beforeAll(async () => {
  162 |     user = await registerViaAPI({ email: `meetings_${uid}@test.com` });
  163 |   });
  164 | 
  165 |   test("отображает список встреч после входа", async ({ page }) => {
  166 |     await loginViaUI(page, user.email, user.password);
  167 |     await expect(page).toHaveURL(/meetings/, { timeout: 5000 });
  168 | 
  169 |     // Страница загрузилась (нет infinite spinner)
  170 |     await expect(page.locator('[data-testid="meetings-list"], .meetings-list, main')).toBeVisible();
  171 |   });
  172 | 
  173 |   test("работает поиск по названию", async ({ page }) => {
  174 |     await loginViaUI(page, user.email, user.password);
  175 |     await page.waitForURL(/meetings/);
  176 | 
  177 |     const searchInput = page.getByPlaceholder(/поиск/i).or(page.locator('input[type="search"]'));
  178 |     if (await searchInput.isVisible()) {
  179 |       await searchInput.fill("несуществующая встреча xyz123");
  180 |       await page.waitForTimeout(500);
  181 |       // Список должен стать пустым или показать заглушку
  182 |       await expect(page.getByText(/ничего не найдено|no results|пусто/i).or(
  183 |         page.locator('[data-testid="empty-state"]')
  184 |       )).toBeVisible({ timeout: 3000 }).catch(() => {
  185 |         // Если нет точного сообщения — OK, главное что не crash
  186 |       });
  187 |     }
  188 |   });
  189 | });
  190 | 
  191 | // ────────────────────────────────────────────────────────────────────────────────
  192 | // Создание встречи
  193 | // ────────────────────────────────────────────────────────────────────────────────
  194 | 
  195 | test.describe("Создание встречи", () => {
  196 |   let user: Awaited<ReturnType<typeof registerViaAPI>>;
  197 | 
  198 |   test.beforeAll(async () => {
  199 |     user = await registerViaAPI({ email: `create_meet_${uid}@test.com` });
  200 |   });
  201 | 
  202 |   test("можно создать встречу через форму", async ({ page }) => {
  203 |     await loginViaUI(page, user.email, user.password);
  204 |     await page.waitForURL(/meetings/);
  205 | 
  206 |     // Ищем кнопку создания
  207 |     const createBtn = page.getByRole("button", { name: /создать|новая|add|new/i })
  208 |       .or(page.getByText(/создать встречу/i));
  209 | 
  210 |     if (await createBtn.isVisible()) {
  211 |       await createBtn.click();
  212 | 
```