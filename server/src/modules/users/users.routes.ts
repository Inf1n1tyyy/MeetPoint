import { Router } from "express";
import { usersController } from "./users.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

export const usersRoutes = Router();

usersRoutes.use(authMiddleware);
usersRoutes.get("/me", usersController.me);
usersRoutes.patch("/me", usersController.updateMe);
usersRoutes.post("/me/avatar", usersController.uploadAvatar);
usersRoutes.get("/friends", usersController.friends);
usersRoutes.get("/friend-requests/incoming", usersController.incomingFriendRequests);
usersRoutes.post("/friend-requests/:id/accept", usersController.acceptFriendRequest);
usersRoutes.delete("/friend-requests/:id", usersController.declineFriendRequest);
usersRoutes.get("/", usersController.list);
usersRoutes.get("/:id", usersController.getById);
usersRoutes.post("/:id/friends", usersController.addFriend);
