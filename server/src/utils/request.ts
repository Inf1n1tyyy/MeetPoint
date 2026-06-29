import { Response } from "express";
import { HttpError } from "./http-error";

export const handleControllerError = (res: Response, error: unknown, context: string) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(`${context}:`, error);
  return res.status(500).json({ message: "Внутренняя ошибка сервера" });
};

export const requiredString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `Поле ${fieldName} обязательно`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new HttpError(400, `Поле ${fieldName} обязательно`);
  }

  return trimmed;
};

export const optionalString = (value: unknown) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed || null;
};

export const parsePositiveInt = (value: unknown, fieldName: string) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, `Поле ${fieldName} должно быть целым числом больше 0`);
  }

  return parsed;
};
