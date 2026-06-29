можно войти под демонстрационным аккаунтом:

```txt
demo@meetpoint.test
123456
```

## Запуск

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
