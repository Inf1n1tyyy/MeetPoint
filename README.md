# Веб-приложение для организации оффлайн встреч с поддержкой реалтайм чатов
# React, React Router, TanStack Query, React-Hook-Form, Axios, Zod, SCSS, Node.JS, Express, PostgreSQL, Prisma ORM, JWT, WebSocket

Работа была сделана в качестве ВКР по специальности 09.03.01, до продакшен уровня еще как до луны пешком, конечно :) 
Ну хотя мб не так уж и плохо всё

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
