/**
 * Интеграционные тесты: Meetings API
 * Запуск: npx jest tests/integration/meetings.test.ts
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.API_URL ?? "http://localhost:5000";
const http: AxiosInstance = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

const uid = Date.now();

// Вспомогательная функция: создаём пользователя и возвращаем заголовок авторизации
async function createUser(suffix = "") {
  const res = await http.post("/auth/register", {
    firstName: "User",
    lastName: "Test",
    email: `meet_${suffix}_${uid}@test.com`,
    password: "password123",
  });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.data)}`);
  return res.data.token as string;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Валидный payload для создания встречи (в будущем)
function futureMeeting(overrides: Record<string, unknown> = {}) {
  const dt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    title: "Тестовая встреча",
    description: "Описание для интеграционного теста, длинное достаточно",
    category: "IT",
    address: "ул. Примерная, 1",
    dateTime: dt,
    participantsLimit: 10,
    ...overrides,
  };
}

let creatorToken = "";
let joinerToken = "";
let createdMeetingId = "";

beforeAll(async () => {
  creatorToken = await createUser("creator");
  joinerToken = await createUser("joiner");
});

// ─── GET /meetings/categories ──────────────────────────────────────────────────

describe("GET /meetings/categories", () => {
  it("возвращает список категорий", async () => {
    const res = await http.get("/meetings/categories", { headers: authHeader(creatorToken) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data).toContain("IT");
  });
});

// ─── POST /meetings ────────────────────────────────────────────────────────────

describe("POST /meetings", () => {
  it("создаёт встречу с корректными данными", async () => {
    const res = await http.post("/meetings", futureMeeting(), { headers: authHeader(creatorToken) });

    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty("id");
    expect(res.data.title).toBe("Тестовая встреча");
    expect(res.data.participantsCount).toBe(1); // создатель автоматически участник
    expect(res.data.chatId).toBeTruthy();        // чат создаётся автоматически
    expect(res.data.isParticipant).toBe(true);

    createdMeetingId = res.data.id;
  });

  it("ошибка 400: дата в прошлом", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const res = await http.post("/meetings", futureMeeting({ dateTime: past }), {
      headers: authHeader(creatorToken),
    });
    expect(res.status).toBe(400);
  });

  it("ошибка 400: слишком короткое название", async () => {
    const res = await http.post("/meetings", futureMeeting({ title: "AB" }), {
      headers: authHeader(creatorToken),
    });
    expect(res.status).toBe(400);
  });

  it("ошибка 400: слишком короткое описание", async () => {
    const res = await http.post("/meetings", futureMeeting({ description: "Кратко" }), {
      headers: authHeader(creatorToken),
    });
    expect(res.status).toBe(400);
  });

  it("ошибка 401 без токена", async () => {
    const res = await http.post("/meetings", futureMeeting());
    expect(res.status).toBe(401);
  });
});

// ─── GET /meetings ─────────────────────────────────────────────────────────────

describe("GET /meetings", () => {
  it("возвращает страницу предстоящих встреч с метаданными пагинации", async () => {
    const res = await http.get("/meetings", { headers: authHeader(creatorToken) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data).toHaveProperty("page");
    expect(res.data).toHaveProperty("limit");
    expect(res.data).toHaveProperty("hasMore");
    // в списке не должно быть тяжёлых вложенных данных
    if (res.data.items.length > 0) {
      expect(res.data.items[0]).toHaveProperty("participantsCount");
      expect(res.data.items[0]).not.toHaveProperty("participants");
    }
  });

  it("уважает параметр limit", async () => {
    const res = await http.get("/meetings?limit=2", { headers: authHeader(creatorToken) });
    expect(res.status).toBe(200);
    expect(res.data.limit).toBe(2);
    expect(res.data.items.length).toBeLessThanOrEqual(2);
  });

  it("фильтрация по категории", async () => {
    const res = await http.get("/meetings?category=IT", { headers: authHeader(creatorToken) });
    expect(res.status).toBe(200);
    res.data.items.forEach((m: any) => expect(m.category).toBe("IT"));
  });

  it("поиск по названию", async () => {
    const res = await http.get("/meetings?search=Тестовая", { headers: authHeader(creatorToken) });
    expect(res.status).toBe(200);
    const found = res.data.items.some((m: any) => m.id === createdMeetingId);
    expect(found).toBe(true);
  });
});

// ─── GET /meetings/:id ─────────────────────────────────────────────────────────

describe("GET /meetings/:id", () => {
  it("возвращает встречу по id", async () => {
    const res = await http.get(`/meetings/${createdMeetingId}`, { headers: authHeader(creatorToken) });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(createdMeetingId);
    expect(res.data).toHaveProperty("participants");
    expect(res.data).toHaveProperty("creator");
  });

  it("ошибка 404 для несуществующей встречи", async () => {
    const res = await http.get("/meetings/00000000-0000-0000-0000-000000000000", {
      headers: authHeader(creatorToken),
    });
    expect(res.status).toBe(404);
  });
});

// ─── POST /meetings/:id/join ───────────────────────────────────────────────────

describe("POST /meetings/:id/join", () => {
  it("другой пользователь может присоединиться к встрече", async () => {
    const res = await http.post(`/meetings/${createdMeetingId}/join`, {}, {
      headers: authHeader(joinerToken),
    });
    expect(res.status).toBe(200);
    expect(res.data.participantsCount).toBe(2);
    expect(res.data.isParticipant).toBe(true);
  });

  it("повторное присоединение не дублирует участника", async () => {
    const res = await http.post(`/meetings/${createdMeetingId}/join`, {}, {
      headers: authHeader(joinerToken),
    });
    // Должен вернуть 200 или 400, главное — не дублировать участника
    const detail = await http.get(`/meetings/${createdMeetingId}`, { headers: authHeader(joinerToken) });
    const count = detail.data.participants.filter((p: any) => p.id !== undefined).length;
    expect(count).toBeLessThanOrEqual(2);
  });

  it("ошибка при достижении лимита участников", async () => {
    // Создаём встречу с лимитом 1 (создатель сразу занимает место)
    const limited = await http.post("/meetings", futureMeeting({ participantsLimit: 1 }), {
      headers: authHeader(creatorToken),
    });
    const limitedId = limited.data.id;

    const res = await http.post(`/meetings/${limitedId}/join`, {}, {
      headers: authHeader(joinerToken),
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toMatch(/лимит/i);
  });
});
