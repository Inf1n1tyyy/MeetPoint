import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { meetingsController } from "./meetings.controller";

export const meetingsRoutes = Router();

meetingsRoutes.use(authMiddleware);
meetingsRoutes.get("/categories", meetingsController.categories);
meetingsRoutes.get("/", meetingsController.getAll);
meetingsRoutes.post("/", meetingsController.create);
meetingsRoutes.get("/:id", meetingsController.getById);
meetingsRoutes.post("/:id/join", meetingsController.join);
