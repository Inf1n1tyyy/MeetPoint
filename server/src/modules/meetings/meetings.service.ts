import { prisma } from "../../prisma";
import { HttpError } from "../../utils/http-error";
import { parsePositiveInt, requiredString } from "../../utils/request";
import { participantUserSelect } from "../../utils/public-selects";

export const MEETING_CATEGORIES = [
  "Спорт",
  "IT",
  "Образование",
  "Искусство",
  "Настольные игры",
  "Прогулки",
  "Кино",
  "Другое",
];

type CreateMeetingInput = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  address?: unknown;
  dateTime?: unknown;
  participantsLimit?: unknown;
};

type GetMeetingsParams = {
  search?: unknown;
  category?: unknown;
  status?: unknown;
  page?: unknown;
  limit?: unknown;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const parsePage = (value: unknown) => {
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PAGE;
};

const parseLimit = (value: unknown) => {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
};

const validateDateTime = (value: unknown) => {
  const raw = requiredString(value, "dateTime");
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Некорректные дата и время встречи");
  }

  return date;
};

const validateCreateInput = (input: CreateMeetingInput) => {
  const title = requiredString(input.title, "title");
  const description = requiredString(input.description, "description");
  const category = requiredString(input.category, "category");
  const address = requiredString(input.address, "address");
  const dateTime = validateDateTime(input.dateTime);
  const participantsLimit = parsePositiveInt(input.participantsLimit ?? 1, "participantsLimit");

  if (title.length < 3) throw new HttpError(400, "Название должно содержать минимум 3 символа");
  if (description.length < 10) throw new HttpError(400, "Описание должно содержать минимум 10 символов");
  if (address.length < 3) throw new HttpError(400, "Укажите место встречи");
  if (dateTime.getTime() <= Date.now()) throw new HttpError(400, "Дата встречи должна быть в будущем");
  if (participantsLimit < 1) throw new HttpError(400, "Лимит участников должен быть не меньше 1");

  return { title, description, category, address, dateTime, participantsLimit };
};

const meetingInclude = {
  creator: { select: participantUserSelect },
  participants: {
    orderBy: { joinedAt: "asc" as const },
    include: { user: { select: participantUserSelect } },
  },
  chat: { select: { id: true } },
};

// Лёгкий select для СПИСКА встреч: без полного массива участников и без
// объекта создателя. Счётчик участников НЕ берём через _count: Prisma
// разворачивает его в агрегат по ВСЕЙ таблице MeetingParticipant на каждый
// запрос (WHERE 1=1 GROUP BY ...), что и тормозит список на больших данных.
// Вместо этого считаем участников отдельным запросом только по выбранным
// встречам (см. getAll). Участие текущего пользователя — 1 строка, дёшево.
const meetingListSelect = (userId: string) => ({
  id: true,
  title: true,
  description: true,
  category: true,
  address: true,
  dateTime: true,
  participantsLimit: true,
  creatorId: true,
  chat: { select: { id: true } },
  participants: {
    where: { userId },
    select: { userId: true },
    take: 1,
  },
});

const mapMeetingListItem = (meeting: any, countByMeeting: Map<string, number>) => ({
  id: meeting.id,
  title: meeting.title,
  description: meeting.description,
  category: meeting.category,
  address: meeting.address,
  dateTime: meeting.dateTime,
  participantsLimit: meeting.participantsLimit,
  participantsCount: countByMeeting.get(meeting.id) ?? 0,
  creatorId: meeting.creatorId,
  chatId: meeting.chat?.id ?? null,
  isParticipant: meeting.participants.length > 0,
});

const mapMeeting = (meeting: any, currentUserId?: string) => {
  const participants = meeting.participants.map((participant: any) => ({
    id: participant.user.id,
    firstName: participant.user.firstName,
    lastName: participant.user.lastName,
    avatarUrl: participant.user.avatarUrl,
    joinedAt: participant.joinedAt,
  }));

  return {
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    category: meeting.category,
    address: meeting.address,
    dateTime: meeting.dateTime,
    participantsLimit: meeting.participantsLimit,
    participantsCount: participants.length,
    creatorId: meeting.creatorId,
    creator: meeting.creator,
    participants,
    chatId: meeting.chat?.id ?? null,
    isParticipant: currentUserId ? participants.some((p: any) => p.id === currentUserId) : false,
  };
};

export const meetingsService = {
  categories() {
    return MEETING_CATEGORIES;
  },

  async getAll(userId: string, params: GetMeetingsParams) {
    const now = new Date();
    const status = typeof params.status === "string" ? params.status : "upcoming";
    const search = typeof params.search === "string" ? params.search.trim() : "";
    const category = typeof params.category === "string" ? params.category.trim() : "";
    const page = parsePage(params.page);
    const limit = parseLimit(params.limit);

    const where: any = {};

    if (status === "past") {
      where.dateTime = { lt: now };
    } else if (status !== "all") {
      where.dateTime = { gte: now };
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    // Берём на одну запись больше лимита: если она есть — значит существует
    // следующая страница. Это избавляет от дорогого COUNT по всей
    // отфильтрованной таблице, который становится узким местом на больших
    // объёмах данных (время ответа перестаёт зависеть от размера таблицы).
    const rows = await prisma.meeting.findMany({
      where,
      select: meetingListSelect(userId),
      orderBy: status === "past" ? { dateTime: "desc" } : { dateTime: "asc" },
      skip: (page - 1) * limit,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Считаем участников ТОЛЬКО по встречам текущей страницы — один
    // отфильтрованный groupBy по индексу (meetingId), вместо агрегации
    // всей таблицы, которую генерировал _count.
    const ids = pageRows.map((m: any) => m.id);
    const grouped = ids.length
      ? await prisma.meetingParticipant.groupBy({
          by: ["meetingId"],
          where: { meetingId: { in: ids } },
          _count: { _all: true },
        })
      : [];

    const countByMeeting = new Map<string, number>();
    for (const g of grouped as any[]) {
      countByMeeting.set(g.meetingId, g._count._all);
    }

    return {
      items: pageRows.map((m: any) => mapMeetingListItem(m, countByMeeting)),
      page,
      limit,
      hasMore,
    };
  },

  async getById(id: string, userId: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: meetingInclude,
    });

    if (!meeting) throw new HttpError(404, "Встреча не найдена");

    return mapMeeting(meeting, userId);
  },

  async create(input: CreateMeetingInput, creatorId: string) {
    const data = validateCreateInput(input);

    const meeting = await prisma.$transaction(async (tx: any) => {
      const created = await tx.meeting.create({
        data: {
          ...data,
          creatorId,
          participants: {
            create: { userId: creatorId },
          },
          chat: {
            create: {
              title: data.title,
              type: "MEETING",
              createdById: creatorId,
              participants: {
                create: { userId: creatorId },
              },
            },
          },
        },
        include: meetingInclude,
      });

      return created;
    });

    return mapMeeting(meeting, creatorId);
  },

  async join(id: string, userId: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { participants: true, chat: true },
    });

    if (!meeting) throw new HttpError(404, "Встреча не найдена");
    if (meeting.dateTime.getTime() < Date.now()) throw new HttpError(400, "Нельзя присоединиться к уже прошедшей встрече");

    const alreadyParticipant = meeting.participants.some((participant: any) => participant.userId === userId);

    if (!alreadyParticipant && meeting.participants.length >= meeting.participantsLimit) {
      throw new HttpError(400, "Лимит участников уже достигнут");
    }

    await prisma.$transaction(async (tx: any) => {
      if (!alreadyParticipant) {
        await tx.meetingParticipant.create({ data: { meetingId: id, userId } });
      }

      const chat = meeting.chat ?? await tx.chat.create({
        data: {
          title: meeting.title,
          type: "MEETING",
          meetingId: meeting.id,
          createdById: meeting.creatorId,
        },
      });

      await tx.chatParticipant.upsert({
        where: { chatId_userId: { chatId: chat.id, userId } },
        update: {},
        create: { chatId: chat.id, userId },
      });
    });

    return this.getById(id, userId);
  },
};
