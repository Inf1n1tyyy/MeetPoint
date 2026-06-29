/**
 * Нагрузочное тестирование — MeetPoint Backend
 * Инструмент: autocannon (npm i -g autocannon)
 *
 * Сценарии:
 *   1. Регистрация + логин (auth stress)
 *   2. Получение списка встреч (read stress)
 *   3. Создание встречи (write stress)
 *   4. Список пользователей (read users)
 *
 * Каждый сценарий прогоняется на НЕСКОЛЬКИХ уровнях параллельных
 * соединений по возрастанию (ramp-up / ступенчатая нагрузка), что
 * позволяет увидеть, как деградируют req/sec и задержки при росте
 * нагрузки и где находится точка насыщения сервера.
 *
 * Запуск:
 *   node tests/load/load.mjs
 *
 * Переменные окружения:
 *   API_URL     — базовый URL (default: http://localhost:5000)
 *   DURATION    — длительность каждой ступени, сек (default: 15)
 *   TIMEOUT     — таймаут одного запроса, сек (default: 30)
 *                 autocannon по умолчанию режет на 10с — для медленных
 *                 эндпоинтов это превращает реальную задержку в «таймаут».
 *   CONNS_STEPS — ступени нагрузки через запятую (default: "10,20,40,80,160")
 *   CONNS       — одиночный прогон на N соединений (перекрывает CONNS_STEPS;
 *                 оставлено для обратной совместимости)
 */

import autocannon from "autocannon";
import { setTimeout as sleep } from "timers/promises";

const BASE = process.env.API_URL ?? "http://localhost:5000";
const DURATION = parseInt(process.env.DURATION ?? "15", 10);
const TIMEOUT = parseInt(process.env.TIMEOUT ?? "30", 10);

// ────────────────────────────────────────────────────────────────────────────────
// Ступени нагрузки.
//   • Если задана CONNS — используем только это значение (обратная совместимость).
//   • Иначе берём список ступеней из CONNS_STEPS (по умолчанию 10→20→40→80→160).
// ────────────────────────────────────────────────────────────────────────────────
const CONNECTION_STEPS = (() => {
  if (process.env.CONNS) {
    const n = parseInt(process.env.CONNS, 10);
    return Number.isFinite(n) && n > 0 ? [n] : [20];
  }
  const raw = process.env.CONNS_STEPS ?? "10,20,40,80,160";
  const steps = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b); // гарантируем возрастание
  return steps.length ? steps : [10, 20, 40, 80, 160];
})();

// ────────────────────────────────────────────────────────────────────────────────
// Шаг 0: подготовка — создаём токен для сценариев, требующих авторизации
// ────────────────────────────────────────────────────────────────────────────────
async function getAuthToken() {
  const email = `load_${Date.now()}@test.com`;
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Load",
      lastName: "Test",
      email,
      password: "password123",
    }),
  });
  const data = await res.json();
  return data.token;
}

// ────────────────────────────────────────────────────────────────────────────────
// Утилита: считаем долю «плохих» запросов.
//   Учитываем и не-2xx, и таймауты; делим на ВСЕ попытки (ответы + таймауты),
//   чтобы не получать NaN при нулевом числе завершённых запросов.
// ────────────────────────────────────────────────────────────────────────────────
function failureRate(result) {
  const completed = result.requests.total ?? 0;
  const timeouts = result.timeouts ?? 0;
  const non2xx = result.non2xx ?? 0;
  const attempts = completed + timeouts;
  // Ни один запрос не завершился (сервер «лёг» / не успел ответить в окне теста)
  // — это не 0% неудач, а фактический коллапс. Считаем как 100%.
  if (attempts === 0) return 1;
  return (non2xx + timeouts) / attempts;
}

// ────────────────────────────────────────────────────────────────────────────────
// Утилита: печатаем результаты одной ступени в читаемом виде
// ────────────────────────────────────────────────────────────────────────────────
function printResult(label, connections, result) {
  // ВАЖНО: у autocannon НЕТ поля latency.p95 — есть p50, p75, p90, p97_5, p99...
  // Старый код печатал p95 → всегда undefined. Используем p97_5.
  const p975 = result.latency.p97_5 ?? result.latency.p99;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 Сценарий: ${label}  |  соединений: ${connections}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Запросов/сек (avg):   ${result.requests.average.toFixed(1)}`);
  console.log(`  Запросов/сек (max):   ${result.requests.max}`);
  console.log(`  Всего запросов:       ${result.requests.total}`);
  console.log(`  Latency p50:          ${result.latency.p50} ms`);
  console.log(`  Latency p97.5:        ${p975} ms`);
  console.log(`  Latency p99:          ${result.latency.p99} ms`);
  console.log(`  Ошибок (не 2xx):      ${result.non2xx}`);
  console.log(`  Таймауты:             ${result.timeouts}`);
  console.log(
    `  Throughput (avg KB/s): ${(result.throughput.average / 1024).toFixed(1)}`,
  );

  const rate = failureRate(result);
  if (rate > 0.05) {
    console.warn(
      `  ⚠️  Доля неудач (не2xx+таймауты) ${(rate * 100).toFixed(1)}% > 5% — нужно расследование!`,
    );
  } else {
    console.log(`  ✅ Доля неудач (не2xx+таймауты) ${(rate * 100).toFixed(1)}%`);
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Утилита: запуск одного autocannon-инстанса с заданным числом соединений
// ────────────────────────────────────────────────────────────────────────────────
function runAutocannon(opts, connections) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      { duration: DURATION, timeout: TIMEOUT, connections, ...opts },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
    autocannon.track(instance, { renderProgressBar: true });
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// Сценарии — теперь каждый принимает число соединений
// ────────────────────────────────────────────────────────────────────────────────

// Сценарий 1: Нагрузка на логин (auth stress)
async function scenarioAuthLogin(token, connections, loginEmail) {
  return runAutocannon(
    {
      url: `${BASE}/auth/login`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: "password123" }),
    },
    connections,
  );
}

// Сценарий 2: Нагрузка на чтение встреч (read-heavy)
async function scenarioReadMeetings(token, connections) {
  return runAutocannon(
    {
      url: `${BASE}/meetings`,
      headers: { Authorization: `Bearer ${token}` },
    },
    connections,
  );
}

// Сценарий 3: Нагрузка на запись (create meetings)
async function scenarioCreateMeetings(token, connections) {
  const dt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  return runAutocannon(
    {
      url: `${BASE}/meetings`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "Load Test Meeting",
        description:
          "Тестовая встреча для нагрузочного теста — достаточно длинное описание",
        category: "IT",
        address: "ул. Нагрузочная, 42",
        dateTime: dt,
        participantsLimit: 50,
      }),
    },
    connections,
  );
}

// Сценарий 4: Нагрузка на список пользователей
async function scenarioReadUsers(token, connections) {
  return runAutocannon(
    {
      url: `${BASE}/users`,
      headers: { Authorization: `Bearer ${token}` },
    },
    connections,
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Прогон одного сценария по всем ступеням нагрузки (ramp-up)
// ────────────────────────────────────────────────────────────────────────────────
async function runScenarioRamp(label, runOne) {
  const rows = [];
  for (const connections of CONNECTION_STEPS) {
    const result = await runOne(connections);
    printResult(label, connections, result);
    rows.push({
      connections,
      reqAvg: result.requests.average,
      p975: result.latency.p97_5 ?? result.latency.p99,
      p99: result.latency.p99,
      failRate: failureRate(result),
    });
    await sleep(1000); // пауза между ступенями — даём серверу «выдохнуть»
  }
  return { label, rows };
}

// ────────────────────────────────────────────────────────────────────────────────
// Сводная таблица: как меняются метрики при росте нагрузки
// ────────────────────────────────────────────────────────────────────────────────
function printRampSummary(summaries) {
  console.log(`\n${"#".repeat(72)}`);
  console.log("📈 СВОДКА: ступенчатая нагрузка (ramp-up)");
  console.log(`${"#".repeat(72)}`);

  for (const { label, rows } of summaries) {
    console.log(`\n▶ ${label}`);
    console.log("  conns │ req/sec (avg) │ p97.5 (ms) │ p99 (ms) │ неудачи");
    console.log("  ──────┼───────────────┼────────────┼──────────┼─────────");
    for (const r of rows) {
      const conns = String(r.connections).padStart(5);
      const req = r.reqAvg.toFixed(1).padStart(13);
      const p975 = String(r.p975).padStart(10);
      const p99 = String(r.p99).padStart(8);
      const fail = `${(r.failRate * 100).toFixed(1)}%`.padStart(7);
      console.log(`  ${conns} │ ${req} │ ${p975} │ ${p99} │ ${fail}`);
    }
  }
  console.log("");
}

// ────────────────────────────────────────────────────────────────────────────────
// Главный запуск
// ────────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 MeetPoint Load Tests`);
  console.log(`   URL: ${BASE}`);
  console.log(`   Ступени соединений:    ${CONNECTION_STEPS.join(" → ")}`);
  console.log(`   Длительность ступени:  ${DURATION}с`);
  console.log(`   Таймаут запроса:       ${TIMEOUT}с\n`);

  const token = await getAuthToken();
  console.log(`✅ Токен получен (${token.slice(0, 20)}...)\n`);

  // Устойчивый пользователь для сценария логина (регистрируем один раз)
  const loginEmail = `stress_login_${Date.now()}@test.com`;
  await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Stress",
      lastName: "User",
      email: loginEmail,
      password: "password123",
    }),
  });

  await sleep(500);

  const summaries = [];

  summaries.push(
    await runScenarioRamp("POST /auth/login  (auth stress)", (c) =>
      scenarioAuthLogin(token, c, loginEmail),
    ),
  );

  summaries.push(
    await runScenarioRamp("GET /meetings  (read-heavy)", (c) =>
      scenarioReadMeetings(token, c),
    ),
  );

  summaries.push(
    await runScenarioRamp("POST /meetings  (write stress)", (c) =>
      scenarioCreateMeetings(token, c),
    ),
  );

  summaries.push(
    await runScenarioRamp("GET /users  (read users)", (c) =>
      scenarioReadUsers(token, c),
    ),
  );

  printRampSummary(summaries);

  console.log(`${"=".repeat(60)}`);
  console.log("✅ Нагрузочное тестирование завершено");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
