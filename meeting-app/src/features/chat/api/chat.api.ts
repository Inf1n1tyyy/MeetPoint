import { api, TOKEN_STORAGE_KEY } from "@/shared/api/api";
import type { Chat, ChatMessage, CreateChatPayload } from "../types/chatTypes";

const listeners = new Set<(msg: ChatMessage) => void>();
let socket: WebSocket | null = null;
let socketToken: string | null = null;
let reconnectTimer: number | null = null;

const getWsUrl = (token: string) => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.searchParams.set("token", token);
  return url.toString();
};

const scheduleReconnect = () => {
  if (reconnectTimer || !socketToken || listeners.size === 0) return;

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectSocket(socketToken!);
  }, 1500);
};

const connectSocket = (token: string) => {
  if (socket && socket.readyState !== WebSocket.CLOSED && socketToken === token) return;

  socket?.close();
  socketToken = token;
  socket = new WebSocket(getWsUrl(token));

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type !== "message.created") return;

      listeners.forEach((listener) => listener(data.payload));
    } catch {
      // ignore invalid ws packet
    }
  };

  socket.onclose = scheduleReconnect;
  socket.onerror = () => socket?.close();
};

export const chatApi = {
  async getChats() {
    const res = await api.get<Chat[]>("/chats");
    return res.data;
  },

  async getChat(chatId: string) {
    const res = await api.get<Chat>(`/chats/${chatId}`);
    return res.data;
  },

  async createChat(data: CreateChatPayload) {
    const res = await api.post<Chat>("/chats", data);
    return res.data;
  },

  async getMessages(chatId: string) {
    const res = await api.get<ChatMessage[]>(`/chats/${chatId}/messages`);
    return res.data;
  },

  async sendMessage(chatId: string, text: string) {
    const res = await api.post<ChatMessage>(`/chats/${chatId}/messages`, { text });
    return res.data;
  },

  subscribe(cb: (msg: ChatMessage) => void) {
    listeners.add(cb);

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) connectSocket(token);

    return () => {
      listeners.delete(cb);
      if (listeners.size === 0) {
        socket?.close();
        socket = null;
      }
    };
  },
};
