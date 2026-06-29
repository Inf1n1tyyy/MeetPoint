/**
 * Интеграционные тесты: Chats & Users API
 * Запуск: npx jest tests/integration/chats-users.test.ts
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.API_URL ?? "http://localhost:5000";
const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true,
});

const uid = Date.now();

async function registerAndGetToken(suffix: string) {
  const res = await http.post("/auth/register", {
    firstName: "User",
    lastName: suffix,
    email: `cu_${suffix}_${uid}@test.com`,
    password: "password123",
  });
  if (res.status !== 201)
    throw new Error(`register failed (${suffix}): ${JSON.stringify(res.data)}`);
  return {
    token: res.data.token as string,
    userId: res.data.user.id as string,
  };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

let aliceToken = "",
  aliceId = "";
let bobToken = "",
  bobId = "";

let meetingId = "";
let chatId = "";

beforeAll(async () => {
  ({ token: aliceToken, userId: aliceId } = await registerAndGetToken("alice"));
  ({ token: bobToken, userId: bobId } = await registerAndGetToken("bob"));

  // Создаём встречу (Alice) и Bob присоединяется → создаётся чат
  const dt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const meetRes = await http.post(
    "/meetings",
    {
      title: "Chat Test Meeting",
      description: "Для тестирования чата и участников встречи",
      category: "IT",
      address: "Тестовая, 1",
      dateTime: dt,
      participantsLimit: 10,
    },
    { headers: auth(aliceToken) },
  );

  meetingId = meetRes.data.id;
  chatId = meetRes.data.chatId;

  await http.post(
    `/meetings/${meetingId}/join`,
    {},
    { headers: auth(bobToken) },
  );
});

// ─── GET /users ────────────────────────────────────────────────────────────────

describe("GET /users", () => {
  it("возвращает страницу пользователей с метаданными пагинации", async () => {
    const res = await http.get("/users", { headers: auth(aliceToken) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data).toHaveProperty("page");
    expect(res.data).toHaveProperty("hasMore");
  });

  it("у каждого пользователя нет поля passwordHash", async () => {
    const res = await http.get("/users", { headers: auth(aliceToken) });
    res.data.items.forEach((u: any) => expect(u).not.toHaveProperty("passwordHash"));
  });

  it("уважает параметр limit", async () => {
    const res = await http.get("/users?limit=1", { headers: auth(aliceToken) });
    expect(res.status).toBe(200);
    expect(res.data.limit).toBe(1);
    expect(res.data.items.length).toBeLessThanOrEqual(1);
  });
});

// ─── GET /users/me & PATCH /users/me ───────────────────────────────────────────

describe("GET /users/me", () => {
  it("возвращает профиль текущего пользователя", async () => {
    const res = await http.get("/users/me", { headers: auth(aliceToken) });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(aliceId);
    expect(res.data).not.toHaveProperty("passwordHash");
  });
});

describe("PATCH /users/me", () => {
  it("обновляет поля профиля", async () => {
    const res = await http.patch(
      "/users/me",
      { bio: "Тест обновления", city: "Москва" },
      {
        headers: auth(aliceToken),
      },
    );
    expect(res.status).toBe(200);
    expect(res.data.bio).toBe("Тест обновления");
    expect(res.data.city).toBe("Москва");
  });
});

// ─── Дружба ────────────────────────────────────────────────────────────────────

describe("Friendship flow", () => {
  it("Alice отправляет запрос на дружбу Bob'у", async () => {
    const res = await http.post(
      `/users/${bobId}/friends`,
      {},
      { headers: auth(aliceToken) },
    );
    expect([200, 201]).toContain(res.status);
  });

  it("повторный запрос не создаёт дубликат", async () => {
    const res = await http.post(
      `/users/${bobId}/friends`,
      {},
      { headers: auth(aliceToken) },
    );
    // Сервер либо возвращает 409, либо идемпотентно 200/201
    expect([200, 201, 409]).toContain(res.status);

    // Главное — в БД не должно быть дубликата (проверяем через список запросов Bob'а)
    const reqsRes = await http.get("/users/friend-requests/incoming", {
      headers: auth(bobToken),
    });
    const requestsFromAlice = reqsRes.data.filter(
      (r: any) => r.user?.id === aliceId || r.requester?.id === aliceId,
    );
    expect(requestsFromAlice.length).toBeLessThanOrEqual(1);
  });

  it("Bob видит входящий запрос", async () => {
    const res = await http.get("/users/friend-requests/incoming", {
      headers: auth(bobToken),
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    const req = res.data.find(
      (r: any) => r.user?.id === aliceId || r.requester?.id === aliceId,
    );
    expect(req).toBeDefined();
  });

  it("Bob принимает запрос", async () => {
    const reqsRes = await http.get("/users/friend-requests/incoming", {
      headers: auth(bobToken),
    });
    const requestId = reqsRes.data[0]?.id;
    expect(requestId).toBeDefined();

    const res = await http.post(
      `/users/friend-requests/${requestId}/accept`,
      {},
      {
        headers: auth(bobToken),
      },
    );
    expect(res.status).toBe(200);
  });

  it("Alice теперь видит Bob'а в списке друзей", async () => {
    const res = await http.get("/users/friends", { headers: auth(aliceToken) });
    expect(res.status).toBe(200);
    const found = res.data.some((u: any) => u.id === bobId);
    expect(found).toBe(true);
  });
});

// ─── Chats ─────────────────────────────────────────────────────────────────────

describe("GET /chats", () => {
  it("возвращает чаты текущего пользователя", async () => {
    const res = await http.get("/chats", { headers: auth(aliceToken) });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    const found = res.data.some((c: any) => c.id === chatId);
    expect(found).toBe(true);
  });
});

describe("GET /chats/:id", () => {
  it("возвращает чат с участниками", async () => {
    const res = await http.get(`/chats/${chatId}`, {
      headers: auth(aliceToken),
    });
    expect(res.status).toBe(200);
    expect(res.data.id).toBe(chatId);
    expect(Array.isArray(res.data.participants)).toBe(true);
  });

  it("ошибка 403 если пользователь не участник чата", async () => {
    // Создаём третьего пользователя, который не участник встречи
    const { token: outsiderToken } = await registerAndGetToken("outsider");
    const res = await http.get(`/chats/${chatId}`, {
      headers: auth(outsiderToken),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST & GET /chats/:id/messages", () => {
  it("Alice отправляет сообщение в чат", async () => {
    const res = await http.post(
      `/chats/${chatId}/messages`,
      { text: "Привет, это тест!" },
      {
        headers: auth(aliceToken),
      },
    );
    expect(res.status).toBe(201);
    expect(res.data.text).toBe("Привет, это тест!");
    expect(res.data.sender).toBeDefined();
  });

  it("Bob видит сообщение Alice", async () => {
    const res = await http.get(`/chats/${chatId}/messages`, {
      headers: auth(bobToken),
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    const msg = res.data.find((m: any) => m.text === "Привет, это тест!");
    expect(msg).toBeDefined();
  });

  it("нельзя отправить пустое сообщение", async () => {
    const res = await http.post(
      `/chats/${chatId}/messages`,
      { text: "" },
      {
        headers: auth(aliceToken),
      },
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /chats (создание группового чата)", () => {
  it("можно создать групповой чат", async () => {
    const res = await http.post(
      "/chats",
      {
        title: "Тестовая группа",
        participantIds: [bobId],
      },
      { headers: auth(aliceToken) },
    );
    expect(res.status).toBe(201);
    expect(res.data.title).toBe("Тестовая группа");
    expect(res.data.type).toBe("GROUP");
  });
});
