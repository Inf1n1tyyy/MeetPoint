import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { prisma } from "../../prisma";
import { HttpError } from "../../utils/http-error";
import { optionalString, requiredString } from "../../utils/request";
import { publicUserSelect } from "../../utils/public-selects";

type UpdateProfileInput = {
  firstName?: unknown;
  lastName?: unknown;
  avatarUrl?: unknown;
  bio?: unknown;
  city?: unknown;
  interests?: unknown;
};

type UploadAvatarInput = {
  dataUrl?: unknown;
  fileName?: unknown;
};

const avatarMimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const publicUrl = () => (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, "");

const parseAvatarDataUrl = (value: unknown) => {
  if (typeof value !== "string") throw new HttpError(400, "Передайте изображение");

  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);

  if (!match) throw new HttpError(400, "Поддерживаются только изображения JPG, PNG, WEBP или GIF");

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  if (!buffer.length) throw new HttpError(400, "Файл изображения пустой");
  if (buffer.length > 2 * 1024 * 1024) throw new HttpError(400, "Размер аватара не должен превышать 2 МБ");

  return { mimeType, buffer };
};

const mapFriendStatus = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) return "self";

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: currentUserId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: currentUserId },
      ],
    },
    select: { requesterId: true, addresseeId: true, status: true },
  });

  if (!friendship) return "none";
  if (friendship.status === "ACCEPTED") return "friends";
  if (friendship.requesterId === currentUserId) return "outgoing_request";
  return "incoming_request";
};

const withFriendStatus = async (user: any, currentUserId: string) => ({
  ...user,
  friendStatus: await mapFriendStatus(currentUserId, user.id),
});

const friendshipInclude = {
  requester: { select: publicUserSelect },
  addressee: { select: publicUserSelect },
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

type ListUsersParams = {
  search?: unknown;
  page?: unknown;
  limit?: unknown;
};

export const usersService = {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) throw new HttpError(404, "Пользователь не найден");

    return user;
  },

  async updateMe(userId: string, input: UpdateProfileInput) {
    const firstName = input.firstName === undefined ? undefined : requiredString(input.firstName, "firstName");
    const lastName = input.lastName === undefined ? undefined : requiredString(input.lastName, "lastName");

    if (firstName !== undefined && firstName.length < 2) {
      throw new HttpError(400, "Имя должно содержать минимум 2 символа");
    }

    if (lastName !== undefined && lastName.length < 2) {
      throw new HttpError(400, "Фамилия должна содержать минимум 2 символа");
    }

    const data = {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: optionalString(input.avatarUrl) } : {}),
      ...(input.bio !== undefined ? { bio: optionalString(input.bio) } : {}),
      ...(input.city !== undefined ? { city: optionalString(input.city) } : {}),
      ...(input.interests !== undefined ? { interests: optionalString(input.interests) } : {}),
    };

    return prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserSelect,
    });
  },

  async uploadAvatar(userId: string, input: UploadAvatarInput) {
    const { mimeType, buffer } = parseAvatarDataUrl(input.dataUrl);
    const ext = avatarMimeToExt[mimeType];
    const safeName = typeof input.fileName === "string" ? input.fileName.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40) : "avatar";
    const fileName = `${userId}-${randomUUID()}-${safeName || "avatar"}.${ext}`;
    const avatarsDir = path.join(process.cwd(), "uploads", "avatars");

    await mkdir(avatarsDir, { recursive: true });
    await writeFile(path.join(avatarsDir, fileName), buffer);

    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: `${publicUrl()}/uploads/avatars/${fileName}` },
      select: publicUserSelect,
    });
  },

  async listUsers(currentUserId: string, params: ListUsersParams) {
    const search = typeof params.search === "string" ? params.search.trim() : "";
    const page = parsePage(params.page);
    const limit = parseLimit(params.limit);

    const where: any = {
      id: { not: currentUserId },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // limit + 1, чтобы понять о наличии следующей страницы без COUNT.
    const rows = await prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const users = hasMore ? rows.slice(0, limit) : rows;

    // Раньше здесь был N+1: для каждого пользователя отдельный запрос
    // friendship.findFirst. Теперь — ОДИН запрос на всю страницу.
    const ids = users.map((u: any) => u.id);
    const friendships = ids.length
      ? await prisma.friendship.findMany({
          where: {
            OR: [
              { requesterId: currentUserId, addresseeId: { in: ids } },
              { addresseeId: currentUserId, requesterId: { in: ids } },
            ],
          },
          select: { requesterId: true, addresseeId: true, status: true },
        })
      : [];

    const statusByUserId = new Map<string, string>();
    for (const f of friendships as any[]) {
      const otherId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
      let status: string;
      if (f.status === "ACCEPTED") status = "friends";
      else if (f.requesterId === currentUserId) status = "outgoing_request";
      else status = "incoming_request";
      statusByUserId.set(otherId, status);
    }

    const items = users.map((user: any) => ({
      ...user,
      friendStatus: statusByUserId.get(user.id) ?? "none",
    }));

    return {
      items,
      page,
      limit,
      hasMore,
    };
  },

  async getById(id: string, currentUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) throw new HttpError(404, "Пользователь не найден");

    return withFriendStatus(user, currentUserId);
  },

  async getFriends(userId: string) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: friendshipInclude,
      orderBy: { createdAt: "desc" },
    });

    return friendships.map((friendship: any) => {
      const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;
      return { ...friend, friendStatus: "friends" };
    });
  },

  async getIncomingFriendRequests(userId: string) {
    const requests = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: friendshipInclude,
      orderBy: { createdAt: "desc" },
    });

    return requests.map((request: any) => ({
      id: request.id,
      createdAt: request.createdAt,
      user: { ...request.requester, friendStatus: "incoming_request" },
    }));
  },

  async addFriend(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new HttpError(400, "Нельзя добавить самого себя в друзья");

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!target) throw new HttpError(404, "Пользователь не найден");

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
      select: { id: true, requesterId: true, addresseeId: true, status: true },
    });

    if (existing?.status === "ACCEPTED") return this.getById(targetUserId, userId);

    if (existing?.status === "PENDING" && existing.addresseeId === userId) {
      await prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
      return this.getById(targetUserId, userId);
    }

    if (!existing) {
      await prisma.friendship.create({
        data: {
          requesterId: userId,
          addresseeId: targetUserId,
          status: "PENDING",
        },
      });
    }

    return this.getById(targetUserId, userId);
  },

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendship.findUnique({
      where: { id: requestId },
      include: friendshipInclude,
    });

    if (!request || request.addresseeId !== userId || request.status !== "PENDING") {
      throw new HttpError(404, "Входящая заявка не найдена");
    }

    const accepted = await prisma.friendship.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
      include: friendshipInclude,
    });

    return { ...accepted.requester, friendStatus: "friends" };
  },

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendship.findUnique({
      where: { id: requestId },
      select: { id: true, addresseeId: true, status: true },
    });

    if (!request || request.addresseeId !== userId || request.status !== "PENDING") {
      throw new HttpError(404, "Входящая заявка не найдена");
    }

    await prisma.friendship.delete({ where: { id: requestId } });
    return { success: true };
  },
};
