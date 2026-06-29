import { prisma } from "../../prisma";
import { HttpError } from "../../utils/http-error";
import { getMeetingChatExpiresAt } from "../../utils/date";
import { participantUserSelect } from "../../utils/public-selects";
import { requiredString } from "../../utils/request";
import { broadcastChatMessage } from "../../realtime/chat.ws";

const chatInclude = {
  meeting: true,
  participants: {
    include: { user: { select: participantUserSelect } },
    orderBy: { joinedAt: "asc" as const },
  },
  _count: { select: { messages: true } },
};

const messageInclude = {
  sender: { select: participantUserSelect },
};

const mapMessage = (message: any) => ({
  id: message.id,
  chatId: message.chatId,
  text: message.text,
  createdAt: message.createdAt,
  sender: message.sender,
});

const mapChat = (chat: any) => ({
  id: chat.id,
  title: chat.title,
  type: chat.type,
  meetingId: chat.meetingId,
  meetingTitle: chat.meeting?.title ?? null,
  meetingDateTime: chat.meeting?.dateTime ?? null,
  expiresAt: chat.meeting ? getMeetingChatExpiresAt(chat.meeting.dateTime) : null,
  participants: chat.participants.map((participant: any) => ({
    id: participant.user.id,
    firstName: participant.user.firstName,
    lastName: participant.user.lastName,
    avatarUrl: participant.user.avatarUrl,
  })),
  messagesCount: chat._count?.messages ?? 0,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

const ensureChatParticipant = async (chatId: string, userId: string) => {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId } },
    include: { chat: { include: { meeting: true } } },
  });

  if (!participant) throw new HttpError(403, "У вас нет доступа к этому чату");

  return participant.chat;
};

const isFriend = async (userId: string, targetUserId: string) => {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: userId },
      ],
    },
    select: { id: true },
  });

  return Boolean(friendship);
};

export const chatsService = {
  async cleanupExpiredMeetingChats() {
    const threshold = new Date(Date.now() - Number(process.env.MEETING_CHAT_LIFETIME_HOURS ?? 4) * 60 * 60 * 1000);

    await prisma.chat.deleteMany({
      where: {
        type: "MEETING",
        meeting: { dateTime: { lt: threshold } },
      },
    });
  },

  async getMyChats(userId: string) {
    await this.cleanupExpiredMeetingChats();

    const chatParticipants = await prisma.chatParticipant.findMany({
      where: { userId },
      include: { chat: { include: chatInclude } },
      orderBy: { joinedAt: "desc" },
    });

    return chatParticipants.map((participant: any) => mapChat(participant.chat));
  },

  async getById(chatId: string, userId: string) {
    await ensureChatParticipant(chatId, userId);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: chatInclude,
    });

    if (!chat) throw new HttpError(404, "Чат не найден");

    return mapChat(chat);
  },

  async createGroup(input: { title?: unknown; participantIds?: unknown }, userId: string) {
    const title = requiredString(input.title, "title");

    if (title.length < 3) throw new HttpError(400, "Название чата должно содержать минимум 3 символа");
    if (!Array.isArray(input.participantIds)) throw new HttpError(400, "Передайте список участников");

    const uniqueParticipantIds = [...new Set(input.participantIds.filter((id): id is string => typeof id === "string" && id !== userId))];

    for (const participantId of uniqueParticipantIds) {
      const userExists = await prisma.user.findUnique({ where: { id: participantId }, select: { id: true } });
      if (!userExists) throw new HttpError(404, "Один из выбранных пользователей не найден");

      const friend = await isFriend(userId, participantId);
      if (!friend) throw new HttpError(403, "В отдельный чат можно добавлять только друзей");
    }

    const chat = await prisma.chat.create({
      data: {
        title,
        type: "GROUP",
        createdById: userId,
        participants: {
          create: [userId, ...uniqueParticipantIds].map((participantId) => ({ userId: participantId })),
        },
      },
      include: chatInclude,
    });

    return mapChat(chat);
  },

  async getMessages(chatId: string, userId: string) {
    await ensureChatParticipant(chatId, userId);

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return messages.map(mapMessage);
  },

  async sendMessage(chatId: string, userId: string, input: { text?: unknown }) {
    const text = requiredString(input.text, "text");

    if (text.length > 1000) throw new HttpError(400, "Сообщение не должно быть длиннее 1000 символов");

    const chat = await ensureChatParticipant(chatId, userId);

    if (chat.type === "MEETING" && chat.meetingId) {
      const meetingParticipant = await prisma.meetingParticipant.findUnique({
        where: { meetingId_userId: { meetingId: chat.meetingId, userId } },
        select: { id: true },
      });

      if (!meetingParticipant) throw new HttpError(403, "Чтобы писать в чат встречи, нужно быть участником встречи");
    }

    const message = await prisma.message.create({
      data: { chatId, senderId: userId, text },
      include: messageInclude,
    });

    const dto = mapMessage(message);

    await broadcastChatMessage(chatId, {
      type: "message.created",
      payload: dto,
    });

    return dto;
  },
};
