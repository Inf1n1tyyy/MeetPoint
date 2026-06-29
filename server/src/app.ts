import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { authRoutes } from "./modules/auth/auth.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { meetingsRoutes } from "./modules/meetings/meetings.routes";
import { chatsRoutes } from "./modules/chats/chats.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/meetings", meetingsRoutes);
app.use("/chats", chatsRoutes);

export default app;
