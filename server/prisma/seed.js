const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const addDays = (days, hours = 18, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const publicAvatar = (name) => {
  const initials = String(name)
    .split(/[-\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#010e6b"/><stop offset="0.58" stop-color="#703b94"/><stop offset="1" stop-color="#be74be"/></linearGradient></defs>
    <rect width="160" height="160" rx="42" fill="url(#g)"/>
    <circle cx="130" cy="28" r="44" fill="#d481d2" opacity="0.35"/>
    <text x="80" y="96" text-anchor="middle" font-size="50" font-family="Arial, sans-serif" font-weight="700" fill="white">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

async function upsertUser(data) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      city: data.city,
      interests: data.interests,
    },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      city: data.city,
      interests: data.interests,
    },
  });
}

async function upsertFriendship(requesterId, addresseeId, status) {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    return prisma.friendship.update({
      where: { id: existing.id },
      data: { requesterId, addresseeId, status },
    });
  }

  return prisma.friendship.create({
    data: { requesterId, addresseeId, status },
  });
}

async function upsertMeeting({
  title,
  description,
  category,
  address,
  dateTime,
  participantsLimit,
  creatorId,
  participantIds = [],
  messages = [],
}) {
  let meeting = await prisma.meeting.findFirst({ where: { title, creatorId } });

  if (!meeting) {
    meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        category,
        address,
        dateTime,
        participantsLimit,
        creatorId,
        participants: {
          create: [
            { userId: creatorId },
            ...participantIds
              .filter((id) => id !== creatorId)
              .map((userId) => ({ userId })),
          ],
        },
        chat: {
          create: {
            title,
            type: "MEETING",
            createdById: creatorId,
            participants: {
              create: [
                { userId: creatorId },
                ...participantIds
                  .filter((id) => id !== creatorId)
                  .map((userId) => ({ userId })),
              ],
            },
          },
        },
      },
      include: { chat: true },
    });
  } else {
    meeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { description, category, address, dateTime, participantsLimit },
      include: { chat: true },
    });

    await prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId: meeting.id, userId: creatorId } },
      update: {},
      create: { meetingId: meeting.id, userId: creatorId },
    });
  }

  const chat =
    meeting.chat ||
    (await prisma.chat.create({
      data: {
        title,
        type: "MEETING",
        meetingId: meeting.id,
        createdById: creatorId,
      },
    }));

  for (const userId of [
    creatorId,
    ...participantIds.filter((id) => id !== creatorId),
  ]) {
    await prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId: meeting.id, userId } },
      update: {},
      create: { meetingId: meeting.id, userId },
    });
    await prisma.chatParticipant.upsert({
      where: { chatId_userId: { chatId: chat.id, userId } },
      update: {},
      create: { chatId: chat.id, userId },
    });
  }

  const existingMessages = await prisma.message.count({
    where: { chatId: chat.id },
  });
  if (existingMessages === 0) {
    for (const message of messages) {
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: message.senderId,
          text: message.text,
        },
      });
    }
  }

  return meeting;
}

async function main() {
  const demo = await upsertUser({
    firstName: "Демо",
    lastName: "Пользователь",
    email: "demo@meetpoint.test",
    password: "123456",
    avatarUrl: publicAvatar("demo-user"),
    bio: "Демонстрационный аккаунт для проверки встреч, заявок в друзья, профиля и чатов.",
    city: "Томск",
    interests: "IT, настольные игры, прогулки",
  });

  const max = await upsertUser({
    firstName: "Максим",
    lastName: "Орлов",
    email: "max.orlov@meetpoint.test",
    password: "123456",
    avatarUrl: publicAvatar("max-orlov"),
    bio: "Люблю городские прогулки, кофе и небольшие локальные события.",
    city: "Томск",
    interests: "Прогулки, кофе, кино",
  });

  const alina = await upsertUser({
    firstName: "Алина",
    lastName: "Смирнова",
    email: "alina.smirnova@meetpoint.test",
    password: "123456",
    avatarUrl: publicAvatar("alina-smirnova"),
    bio: "Фотографирую город, ищу компанию для прогулок и выставок.",
    city: "Томск",
    interests: "Искусство, фото, прогулки",
  });

  const ilya = await upsertUser({
    firstName: "Илья",
    lastName: "Петров",
    email: "ilya.petrov@meetpoint.test",
    password: "123456",
    avatarUrl: publicAvatar("ilya-petrov"),
    bio: "Frontend-разработчик, провожу мини-встречи по React и архитектуре.",
    city: "Томск",
    interests: "IT, образование",
  });

  const maria = await upsertUser({
    firstName: "Мария",
    lastName: "Кузнецова",
    email: "maria.kuznetsova@meetpoint.test",
    password: "123456",
    avatarUrl: publicAvatar("maria-kuznetsova"),
    bio: "Организую разговорные клубы и встречи для обмена идеями.",
    city: "Томск",
    interests: "Образование, кино, искусство",
  });

  await upsertFriendship(demo.id, max.id, "ACCEPTED");
  await upsertFriendship(alina.id, demo.id, "PENDING");

  await upsertMeeting({
    title: "React-пикник для начинающих",
    description:
      "Неформальная встреча в парке: обсудим компоненты, хуки, дипломные проекты и идеи для pet-проектов.",
    category: "IT",
    address: "Томск, Лагерный сад",
    dateTime: addDays(3, 18, 30),
    participantsLimit: 8,
    creatorId: ilya.id,
    participantIds: [max.id],
    messages: [
      {
        senderId: ilya.id,
        text: "Привет! Берите ноутбуки по желанию, но формат будет скорее разговорный.",
      },
      {
        senderId: max.id,
        text: "Я присоединюсь, хочу обсудить авторизацию и realtime.",
      },
    ],
  });

  await upsertMeeting({
    title: "Киновечер и обсуждение фильма",
    description:
      "Смотрим авторское кино, после сеанса обсуждаем сюжет, визуальный стиль и любимые сцены за кофе.",
    category: "Кино",
    address: "Томск, ул. Ленина 51",
    dateTime: addDays(5, 19, 0),
    participantsLimit: 6,
    creatorId: maria.id,
    participantIds: [alina.id],
    messages: [
      {
        senderId: maria.id,
        text: "После встречи можно выбрать следующий фильм для клуба.",
      },
    ],
  });

  await upsertMeeting({
    title: "Фотопрогулка по центру города",
    description:
      "Пройдёмся по красивым местам, поищем необычные ракурсы и сделаем серию городских снимков.",
    category: "Искусство",
    address: "Томск, Новособорная площадь",
    dateTime: addDays(8, 16, 0),
    participantsLimit: 10,
    creatorId: alina.id,
    participantIds: [],
    messages: [
      {
        senderId: alina.id,
        text: "Можно приходить даже с телефоном, главное — желание фотографировать.",
      },
    ],
  });

  console.log("Seed completed. Demo login: demo@meetpoint.test / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
