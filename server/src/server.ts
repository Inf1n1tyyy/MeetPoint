import http from "http";
import app from "./app";
import { setupChatWebSocket } from "./realtime/chat.ws";
import { chatsService } from "./modules/chats/chats.service";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupChatWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

setInterval(() => {
  chatsService.cleanupExpiredMeetingChats().catch((error) => {
    console.error("CHAT_CLEANUP_ERROR:", error);
  });
}, 60 * 60 * 1000);
