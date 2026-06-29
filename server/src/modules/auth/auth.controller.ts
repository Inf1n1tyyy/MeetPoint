import { Request, Response } from "express";
import { authService } from "./auth.service";
import { HttpError } from "../../utils/http-error";

const sendError = (res: Response, e: unknown) => {
  if (e instanceof HttpError) {
    return res.status(e.statusCode).json({ message: e.message });
  }

  console.error("AUTH ERROR:", e);
  return res.status(500).json({ message: "Внутренняя ошибка сервера" });
};

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (e) {
      return sendError(res, e);
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      return res.json(result);
    } catch (e) {
      return sendError(res, e);
    }
  },
};
