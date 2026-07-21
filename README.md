# Веб-приложение для организации оффлайн встреч с поддержкой реалтайм чатов
# React, React Router, TanStack Query, React-Hook-Form, Axios, Zod, SCSS, Node.JS, Express, PostgreSQL, Prisma ORM, JWT, WebSocket

можно войти под демонстрационным аккаунтом:

```txt
demo@meetpoint.test
123456
```

## Запуск

Понадобится Docker

```bash
cd server
npm install
npx prisma migrate dev
npx prisma generate
npm run seed
npm run dev
```

```bash
cd meeting-app
npm install
npm run dev
```

```bash
для тестов есть отдельный README внутри проекта
```
