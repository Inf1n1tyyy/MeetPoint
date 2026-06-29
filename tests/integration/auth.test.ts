/**
 * Интеграционные тесты: Auth API
 * Запуск: npx jest tests/integration/auth.test.ts
 *
 * Требования: запущенный сервер (http://localhost:5000) и PostgreSQL
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.API_URL ?? "http://localhost:5000";
const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // не кидать исключения на 4xx/5xx
});

// Уникальный email для каждого прогона тестов
const uid = Date.now();
const testUser = {
  firstName: "Тест",
  lastName: "Тестов",
  email: `test_${uid}@example.com`,
  password: "password123",
};

let authToken = "";

// ─── Регистрация ───────────────────────────────────────────────────────────────

describe("POST /auth/register", () => {
  it("успешная регистрация нового пользователя", async () => {
    const res = await http.post("/auth/register", testUser);

    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("token");
    expect(res.data.user).toMatchObject({
      email: testUser.email,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    });
    expect(res.data.user).not.toHaveProperty("passwordHash");

    authToken = res.data.token;
  });

  it("ошибка 409 при повторной регистрации с тем же email", async () => {
    const res = await http.post("/auth/register", testUser);
    expect(res.status).toBe(409);
    expect(res.data.message).toMatch(/уже существует/i);
  });

  it("ошибка 400 при некорректном email", async () => {
    const res = await http.post("/auth/register", { ...testUser, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("ошибка 400 при слишком коротком пароле", async () => {
    const res = await http.post("/auth/register", { ...testUser, email: `x_${uid}@x.ru`, password: "12" });
    expect(res.status).toBe(400);
  });

  it("ошибка 400 при коротком firstName", async () => {
    const res = await http.post("/auth/register", { ...testUser, email: `y_${uid}@y.ru`, firstName: "A" });
    expect(res.status).toBe(400);
  });

  it("ошибка 400 при отсутствии обязательных полей", async () => {
    const res = await http.post("/auth/register", {});
    expect(res.status).toBe(400);
  });
});

// ─── Вход ──────────────────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  it("успешный вход с корректными данными", async () => {
    const res = await http.post("/auth/login", {
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("token");
    expect(res.data.user.email).toBe(testUser.email);
    expect(res.data.user).not.toHaveProperty("passwordHash");
  });

  it("ошибка 401 при неверном пароле", async () => {
    const res = await http.post("/auth/login", {
      email: testUser.email,
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
    expect(res.data.message).toMatch(/неверный/i);
  });

  it("ошибка 401 при несуществующем email", async () => {
    const res = await http.post("/auth/login", {
      email: "nobody@nobody.com",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });

  it("email нечувствителен к регистру при входе", async () => {
    const res = await http.post("/auth/login", {
      email: testUser.email.toUpperCase(),
      password: testUser.password,
    });
    expect(res.status).toBe(200);
  });
});

// ─── Защищённые маршруты (токен) ───────────────────────────────────────────────

describe("Защита маршрутов (authMiddleware)", () => {
  it("ошибка 401 без токена", async () => {
    const res = await http.get("/users/me");
    expect(res.status).toBe(401);
  });

  it("ошибка 401 с невалидным токеном", async () => {
    const res = await http.get("/users/me", {
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.status).toBe(401);
  });

  it("успешный доступ с корректным токеном", async () => {
    const res = await http.get("/users/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    expect(res.data.email).toBe(testUser.email);
  });
});
