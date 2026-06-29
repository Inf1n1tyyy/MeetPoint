import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { chatsController } from "./chats.controller";

export const chatsRoutes = Router();

chatsRoutes.use(authMiddleware);
chatsRoutes.get("/", chatsController.getMyChats);
chatsRoutes.post("/", chatsController.createGroup);
chatsRoutes.get("/:id", chatsController.getById);
chatsRoutes.get("/:id/messages", chatsController.getMessages);
chatsRoutes.post("/:id/messages", chatsController.sendMessage);
