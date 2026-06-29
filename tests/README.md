# 🧪 MeetPoint — Набор тестов

Полный набор тестов для бэкенда и фронтенда проекта MeetPoint.

---

## Структура

```
tests/
├── unit/
│   └── validation.test.ts        # Юнит-тесты: валидация, утилиты (без БД)
├── integration/
│   ├── auth.test.ts              # Интеграционные: Auth API
│   ├── meetings.test.ts          # Интеграционные: Meetings API
│   └── chats-users.test.ts      # Интеграционные: Chats & Users API
├── frontend/
│   └── components.test.tsx      # Тесты компонентов, хуков, схем Zod
├── load/
│   ├── load.mjs                 # Нагрузочное тестирование HTTP (autocannon)
│   └── ws-load.mjs              # Нагрузочное тестирование WebSocket
├── e2e/
│   └── app.spec.ts              # E2E тесты (Playwright)
├── package.json                 # Зависимости и скрипты
└── playwright.config.ts         # Конфигурация Playwright
```

---

## Быстрый старт

### 1. Установка зависимостей

```bash
cd tests
npm install
npx playwright install chromium  # только для E2E
```

### 2. Запуск серверов (в отдельных терминалах)

```bash
# Бэкенд
cd server && npm run dev        # http://localhost:5000

# Фронтенд
cd meeting-app && npm run dev   # http://localhost:5173
```

---

## Виды тестов

### Юнит-тесты (без БД, мгновенно)

Проверяют чистую бизнес-логику: валидацию полей, утилиты, парсинг.

```bash
cd tests && npx jest tests/unit/ --testPathPattern=unit
```

**Покрытие:**

- `loginSchema` / `registerSchema` (Zod)
- `parsePositiveInt`, `requiredString`
- `validateMeetingInput` (дата, лимиты, длины полей)
- `parseAvatarDataUrl` (MIME, размер)
- `getMeetingChatExpiresAt`
- Нормализация и валидация email

---

### Интеграционные тесты (нужна БД и сервер)

Гоняют реальные HTTP-запросы к запущенному серверу.

```bash
cd tests && npx jest tests/integration/ --runInBand
```

**Переменные:**

```
API_URL=http://localhost:5000  # (по умолчанию)
```

**Покрытие:**

| Файл                  | Маршруты                                                                           |
| --------------------- | ---------------------------------------------------------------------------------- |
| `auth.test.ts`        | `POST /auth/register`, `POST /auth/login`, Bearer-токен                            |
| `meetings.test.ts`    | `GET/POST /meetings`, `GET /meetings/:id`, `POST /meetings/:id/join`               |
| `chats-users.test.ts` | `GET/PATCH /users/me`, `GET /users`, Friendship flow, `GET/POST /chats`, сообщения |

**Сценарии:**

- Позитивные (201, 200) + негативные (400, 401, 403, 404, 409)
- Дублирование участников, лимит участников
- Создатель автоматически становится участником встречи и чата
- Посторонний получает 403 на чат

---

### Фронтенд-тесты (Vitest + Testing Library)

```bash
cd tests && npx vitest run tests/frontend/
```

Для работы нужно добавить в `meeting-app/vite.config.ts`:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
}
```

`src/test/setup.ts`:

```ts
import "@testing-library/jest-dom";
```

**Покрытие:**

- `loginSchema` / `registerSchema` (Zod) — 10+ кейсов
- `Button` — рендер, клик, disabled, type
- `ProtectedRoute` — авторизованный / неавторизованный
- `getWsUrl` — http→ws, https→wss, токен в query
- Форматирование дат встреч, статус upcoming/past

---

### Нагрузочное тестирование HTTP

```bash
npm install autocannon -g  # или в tests/: npm install

cd tests && node tests/load/load.mjs
```

**Переменные:**

```
API_URL=http://localhost:5000
DURATION=15                 # секунд на каждую ступень
CONNS_STEPS=10,20,40,80,160 # ступени нагрузки по возрастанию (ramp-up)
CONNS=20                    # одиночный прогон на N соединений
                            #   (перекрывает CONNS_STEPS, для обратной совместимости)
```

> Каждый сценарий прогоняется на всех ступенях `CONNS_STEPS` по
> возрастанию. В конце выводится сводная таблица — как меняются
> req/sec и задержки (p95/p99) при росте нагрузки, чтобы найти
> точку насыщения сервера.

Примеры:

```bash
# Стандартный ramp-up: 10 → 20 → 40 → 80 → 160 соединений
node tests/load/load.mjs

# Свой набор ступеней
CONNS_STEPS=25,50,100,200 node tests/load/load.mjs

# Один прогон на 50 соединениях (старое поведение)
CONNS=50 node tests/load/load.mjs
```

**Сценарии** (каждый — на всех ступенях `CONNS_STEPS`):

1. `POST /auth/login` — auth stress
2. `GET /meetings` — read-heavy
3. `POST /meetings` — write stress
4. `GET /users` — read users

**Метрики:**

- Req/sec (avg, max)
- Latency p50 / p95 / p99
- Error rate (алерт при > 5%)
- Throughput KB/s

---

### Нагрузочное тестирование WebSocket

```bash
npm install ws  # в tests/

cd tests && node tests/load/ws-load.mjs
```

**Переменные:**

```
API_URL=http://localhost:5000
WS_CLIENTS=30        # одновременных WS-подключений
MESSAGES_EACH=10     # сообщений на каждого клиента
```

**Сценарий:**

1. Создаёт 1 встречу + чат
2. Регистрирует `WS_CLIENTS` пользователей, присоединяет к встрече
3. Подключает всех через WebSocket
4. Каждый отправляет `MESSAGES_EACH` сообщений через REST
5. Считает broadcast-сообщения, вычисляет delivery rate

**Метрики:**

- % успешных подключений
- Avg/max connect time
- Delivery rate (ожидаемые vs полученные broadcast)

---

### E2E тесты (Playwright)

```bash
cd tests && npx playwright test tests/e2e/
npx playwright show-report  # HTML-отчёт
```

**Переменные:**

```
BASE_URL=http://localhost:5173
API_URL=http://localhost:5000
```

**Сценарии:**

- Landing: ссылки, редирект неавторизованного на /login
- Регистрация: успех → /meetings, дубликат email, пустая форма
- Логин: успех, неверный пароль, JWT в localStorage
- Список встреч: рендер, поиск
- Создание встречи: заполнение формы
- Выход: очистка localStorage, редирект

---

## Рекомендации по CI

```yaml
# .github/workflows/test.yml (пример)
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd tests && npm ci && npx jest tests/unit/

  integration:
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: meetpoint
    steps:
      - uses: actions/checkout@v4
      - run: cd server && npm ci && npx prisma migrate deploy && npm run dev &
      - run: cd tests && npm ci && npx jest tests/integration/ --runInBand

  e2e:
    steps:
      - uses: actions/checkout@v4
      - run: cd tests && npm ci && npx playwright install --with-deps chromium
      - run: cd tests && npx playwright test
```
