import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { handleControllerError } from "../../utils/request";
import { chatsService } from "./chats.service";

export const chatsController = {
  async getMyChats(req: AuthRequest, res: Response) {
    try {
      const chats = await chatsService.getMyChats(req.user!.id);
      return res.json(chats);
    } catch (error) {
      return handleControllerError(res, error, "GET_CHATS_ERROR");
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const chat = await chatsService.getById(String(req.params.id), req.user!.id);
      return res.json(chat);
    } catch (error) {
      return handleControllerError(res, error, "GET_CHAT_ERROR");
    }
  },

  async createGroup(req: AuthRequest, res: Response) {
    try {
      const chat = await chatsService.createGroup(req.body, req.user!.id);
      return res.status(201).json(chat);
    } catch (error) {
      return handleControllerError(res, error, "CREATE_CHAT_ERROR");
    }
  },

  async getMessages(req: AuthRequest, res: Response) {
    try {
      const messages = await chatsService.getMessages(String(req.params.id), req.user!.id);
      return res.json(messages);
    } catch (error) {
      return handleControllerError(res, error, "GET_MESSAGES_ERROR");
    }
  },

  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const message = await chatsService.sendMessage(String(req.params.id), req.user!.id, req.body);
      return res.status(201).json(message);
    } catch (error) {
      return handleControllerError(res, error, "SEND_MESSAGE_ERROR");
    }
  },
};
