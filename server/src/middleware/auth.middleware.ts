import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
};

export type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Токен не передан" });
    }

    const token = header.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ message: "Некорректный формат токена" });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      email: string;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    return next();
  } catch (e) {
    console.error("AUTH MIDDLEWARE ERROR:", e);
    return res.status(401).json({ message: "Не авторизован" });
  }
};
