import { Response } from "express";
import { usersService } from "./users.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { handleControllerError } from "../../utils/request";

export const usersController = {
  async me(req: AuthRequest, res: Response) {
    try {
      const user = await usersService.getMe(req.user!.id);
      return res.json(user);
    } catch (error) {
      return handleControllerError(res, error, "GET_ME_ERROR");
    }
  },

  async updateMe(req: AuthRequest, res: Response) {
    try {
      const user = await usersService.updateMe(req.user!.id, req.body);
      return res.json(user);
    } catch (error) {
      return handleControllerError(res, error, "UPDATE_ME_ERROR");
    }
  },

  async uploadAvatar(req: AuthRequest, res: Response) {
    try {
      const user = await usersService.uploadAvatar(req.user!.id, req.body);
      return res.json(user);
    } catch (error) {
      return handleControllerError(res, error, "UPLOAD_AVATAR_ERROR");
    }
  },

  async list(req: AuthRequest, res: Response) {
    try {
      const users = await usersService.listUsers(req.user!.id, req.query);
      return res.json(users);
    } catch (error) {
      return handleControllerError(res, error, "LIST_USERS_ERROR");
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const user = await usersService.getById(String(req.params.id), req.user!.id);
      return res.json(user);
    } catch (error) {
      return handleControllerError(res, error, "GET_USER_ERROR");
    }
  },

  async friends(req: AuthRequest, res: Response) {
    try {
      const friends = await usersService.getFriends(req.user!.id);
      return res.json(friends);
    } catch (error) {
      return handleControllerError(res, error, "GET_FRIENDS_ERROR");
    }
  },

  async incomingFriendRequests(req: AuthRequest, res: Response) {
    try {
      const requests = await usersService.getIncomingFriendRequests(req.user!.id);
      return res.json(requests);
    } catch (error) {
      return handleControllerError(res, error, "GET_FRIEND_REQUESTS_ERROR");
    }
  },

  async addFriend(req: AuthRequest, res: Response) {
    try {
      const friend = await usersService.addFriend(req.user!.id, String(req.params.id));
      return res.status(201).json(friend);
    } catch (error) {
      return handleControllerError(res, error, "ADD_FRIEND_ERROR");
    }
  },

  async acceptFriendRequest(req: AuthRequest, res: Response) {
    try {
      const friend = await usersService.acceptFriendRequest(req.user!.id, String(req.params.id));
      return res.json(friend);
    } catch (error) {
      return handleControllerError(res, error, "ACCEPT_FRIEND_REQUEST_ERROR");
    }
  },

  async declineFriendRequest(req: AuthRequest, res: Response) {
    try {
      const result = await usersService.declineFriendRequest(req.user!.id, String(req.params.id));
      return res.json(result);
    } catch (error) {
      return handleControllerError(res, error, "DECLINE_FRIEND_REQUEST_ERROR");
    }
  },
};
