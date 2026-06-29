import { IncomingMessage, Server as HttpServer } from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

type Client = {
  userId: string;
  socket: any;
};

const clients = new Set<Client>();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
};

const parseToken = (req: IncomingMessage) => {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "", `http://${host}`);
  const queryToken = url.searchParams.get("token");
  const authHeader = req.headers.authorization;

  if (queryToken) return queryToken;
  if (authHeader?.startsWith("Bearer ")) return authHeader.replace("Bearer ", "").trim();

  return null;
};

const getUserIdFromRequest = (req: IncomingMessage) => {
  const token = parseToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
};

const sendFrame = (socket: any, data: string) => {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header: Buffer;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  header[0] = 0x81;
  socket.write(Buffer.concat([header, payload]));
};

const closeSocket = (client: Client) => {
  clients.delete(client);
  try {
    client.socket.end();
  } catch {
    // ignore
  }
};

const isWebSocketPath = (req: IncomingMessage) => {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "", `http://${host}`);
  return url.pathname === "/ws";
};

export const setupChatWebSocket = (server: HttpServer) => {
  server.on("upgrade", (req, socket) => {
    if (!isWebSocketPath(req)) {
      socket.destroy();
      return;
    }

    const userId = getUserIdFromRequest(req);
    const key = req.headers["sec-websocket-key"];

    if (!userId || typeof key !== "string") {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const acceptKey = crypto.createHash("sha1").update(key + WS_GUID).digest("base64");

    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ].join("\r\n"));

    const client: Client = { userId, socket };
    clients.add(client);

    socket.on("data", (buffer: Buffer) => {
      const opcode = buffer[0] & 0x0f;
      if (opcode === 0x8) closeSocket(client);
      if (opcode === 0x9) socket.write(Buffer.from([0x8a, 0x00]));
    });

    socket.on("close", () => clients.delete(client));
    socket.on("end", () => clients.delete(client));
    socket.on("error", () => clients.delete(client));
  });
};

export const broadcastChatMessage = async (chatId: string, payload: unknown) => {
  const participants = await prisma.chatParticipant.findMany({
    where: { chatId },
    select: { userId: true },
  });

  const participantIds = new Set(participants.map((participant: any) => participant.userId));
  const message = JSON.stringify(payload);

  for (const client of clients) {
    if (!participantIds.has(client.userId)) continue;

    try {
      sendFrame(client.socket, message);
    } catch {
      clients.delete(client);
    }
  }
};
