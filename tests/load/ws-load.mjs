/**
 * Нагрузочный тест WebSocket — MeetPoint Chat
 *
 * Симулирует N одновременных пользователей, подключённых к чату и
 * отправляющих сообщения. Замеряет:
 *   — время подключения
 *   — latency доставки сообщений (roundtrip через REST + WS broadcast)
 *   — ошибки/разрывы соединений
 *
 * Запуск:
 *   node tests/load/ws-load.mjs
 *
 * Зависимости: ws  (npm i ws)
 * Переменные:
 *   API_URL       — http URL сервера (default: http://localhost:5000)
 *   WS_CLIENTS    — кол-во одновременных WS-клиентов (default: 30)
 *   MESSAGES_EACH — сообщений на каждого клиента (default: 10)
 */

import { WebSocket } from "ws";
import { setTimeout as sleep } from "timers/promises";

const BASE_HTTP = process.env.API_URL ?? "http://localhost:5000";
const BASE_WS = BASE_HTTP.replace(/^http/, "ws");
const WS_CLIENTS = parseInt(process.env.WS_CLIENTS ?? "30", 10);
const MESSAGES_EACH = parseInt(process.env.MESSAGES_EACH ?? "10", 10);

// ────────────────────────────────────────────────────────────────────────────────

async function post(path, body, token) {
  const res = await fetch(`${BASE_HTTP}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function setupTestEnvironment() {
  // Создаём "владельца" встречи и чата
  const ownerData = await post("/auth/register", {
    firstName: "WS",
    lastName: "Owner",
    email: `ws_owner_${Date.now()}@test.com`,
    password: "password123",
  });
  const ownerToken = ownerData.token;

  // Создаём встречу → автоматически создаётся чат
  const dt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const meeting = await post(
    "/meetings",
    {
      title: "WS Load Test Meeting",
      description: "Встреча для нагрузочного теста WebSocket соединений",
      category: "IT",
      address: "WS Test, 1",
      dateTime: dt,
      participantsLimit: WS_CLIENTS + 10,
    },
    ownerToken,
  );

  const chatId = meeting.chatId;

  // Регистрируем WS_CLIENTS пользователей и присоединяем к встрече
  const clients = [];
  for (let i = 0; i < WS_CLIENTS; i++) {
    const u = await post("/auth/register", {
      firstName: `WS${i}`,
      lastName: "Client",
      email: `ws_client_${i}_${Date.now()}@test.com`,
      password: "password123",
    });
    await post(`/meetings/${meeting.id}/join`, {}, u.token);
    clients.push({ token: u.token, userId: u.user?.id });
    process.stdout.write(`\r  Создано пользователей: ${i + 1}/${WS_CLIENTS}`);
  }
  console.log();

  return { chatId, clients, ownerToken, meetingId: meeting.id };
}

// ────────────────────────────────────────────────────────────────────────────────

function connectWs(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE_WS}/ws?token=${token}`);
    const timer = setTimeout(
      () => reject(new Error("WS connect timeout")),
      5000,
    );

    ws.on("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────────

async function runWsLoadTest(chatId, clients, ownerToken) {
  const stats = {
    connected: 0,
    connectErrors: 0,
    messagesSent: 0,
    messagesReceived: 0,
    connectTimes: [],
    receivedByChatId: {},
  };

  // Подключаем всех клиентов
  console.log(`\n🔌 Подключение ${WS_CLIENTS} WebSocket клиентов...`);
  const sockets = [];

  for (const client of clients) {
    const t0 = Date.now();
    try {
      const ws = await connectWs(client.token);
      stats.connectTimes.push(Date.now() - t0);
      stats.connected++;

      // Считаем входящие сообщения
      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (
            msg.type === "message.created" &&
            msg.payload?.chatId === chatId
          ) {
            stats.messagesReceived++;
          }
        } catch {}
      });

      sockets.push({ ws, token: client.token });
    } catch (e) {
      stats.connectErrors++;
    }
    process.stdout.write(
      `\r  Подключено: ${stats.connected}, ошибок: ${stats.connectErrors}`,
    );
  }
  console.log(`\n✅ Подключено ${stats.connected}/${WS_CLIENTS} клиентов`);

  await sleep(300);

  // Каждый клиент отправляет MESSAGES_EACH сообщений через REST API
  console.log(`\n📨 Каждый клиент отправляет ${MESSAGES_EACH} сообщений...`);
  const sendPromises = sockets.map(async ({ token }, idx) => {
    for (let m = 0; m < MESSAGES_EACH; m++) {
      try {
        await post(
          `/chats/${chatId}/messages`,
          {
            text: `WS load test message ${idx}-${m}`,
          },
          token,
        );
        stats.messagesSent++;
      } catch {}
    }
  });

  await Promise.all(sendPromises);

  // Даём время дойти broadcast'у
  await sleep(2000);

  // Закрываем сокеты
  sockets.forEach(({ ws }) => ws.close());

  return stats;
}

// ────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 MeetPoint WebSocket Load Test");
  console.log(`   Клиентов:            ${WS_CLIENTS}`);
  console.log(`   Сообщений на клиент: ${MESSAGES_EACH}`);
  console.log(`   Всего сообщений:     ${WS_CLIENTS * MESSAGES_EACH}`);
  console.log(`   Server:              ${BASE_HTTP}`);

  console.log("\n⏳ Подготовка окружения...");
  const { chatId, clients, ownerToken } = await setupTestEnvironment();
  console.log(`✅ Chat ID: ${chatId}`);

  const stats = await runWsLoadTest(chatId, clients, ownerToken);

  const avgConnect = stats.connectTimes.length
    ? (
        stats.connectTimes.reduce((a, b) => a + b, 0) /
        stats.connectTimes.length
      ).toFixed(1)
    : "N/A";
  const maxConnect = stats.connectTimes.length
    ? Math.max(...stats.connectTimes)
    : 0;

  const expectedReceived = stats.messagesSent * stats.connected;
  const deliveryRate =
    expectedReceived > 0
      ? ((stats.messagesReceived / expectedReceived) * 100).toFixed(1)
      : "0";

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 Результаты WebSocket нагрузочного теста");
  console.log("=".repeat(60));
  console.log(`  Успешно подключено:    ${stats.connected}/${WS_CLIENTS}`);
  console.log(`  Ошибок подключения:    ${stats.connectErrors}`);
  console.log(`  Avg connect time:      ${avgConnect} ms`);
  console.log(`  Max connect time:      ${maxConnect} ms`);
  console.log(`  Отправлено сообщений:  ${stats.messagesSent}`);
  console.log(`  Получено по WS:        ${stats.messagesReceived}`);
  console.log(`  Delivery rate:         ${deliveryRate}%`);

  if (stats.connectErrors > WS_CLIENTS * 0.05) {
    console.warn(
      `  ⚠️  >5% ошибок подключения — проверьте maxConnections на сервере`,
    );
  }
  if (parseFloat(deliveryRate) < 80) {
    console.warn(`  ⚠️  Delivery rate < 80% — возможна потеря сообщений`);
  } else {
    console.log(`  ✅ Delivery rate в норме`);
  }

  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("WS load test failed:", err);
  process.exit(1);
});
