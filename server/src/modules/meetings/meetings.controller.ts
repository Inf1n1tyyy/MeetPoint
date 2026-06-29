import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { handleControllerError } from "../../utils/request";
import { meetingsService } from "./meetings.service";

export const meetingsController = {
  async categories(_req: AuthRequest, res: Response) {
    return res.json(meetingsService.categories());
  },

  async getAll(req: AuthRequest, res: Response) {
    try {
      const meetings = await meetingsService.getAll(req.user!.id, req.query);
      return res.json(meetings);
    } catch (error) {
      return handleControllerError(res, error, "GET_MEETINGS_ERROR");
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const meeting = await meetingsService.getById(String(req.params.id), req.user!.id);
      return res.json(meeting);
    } catch (error) {
      return handleControllerError(res, error, "GET_MEETING_ERROR");
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const meeting = await meetingsService.create(req.body, req.user!.id);
      return res.status(201).json(meeting);
    } catch (error) {
      return handleControllerError(res, error, "CREATE_MEETING_ERROR");
    }
  },

  async join(req: AuthRequest, res: Response) {
    try {
      const meeting = await meetingsService.join(String(req.params.id), req.user!.id);
      return res.json(meeting);
    } catch (error) {
      return handleControllerError(res, error, "JOIN_MEETING_ERROR");
    }
  },
};
