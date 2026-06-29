import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../prisma";
import { HttpError } from "../../utils/http-error";
import { publicUserSelect } from "../../utils/public-selects";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
};

type RegisterInput = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  password?: unknown;
};

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

const assertString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `Поле ${fieldName} обязательно`);
  }

  return value.trim();
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const validateEmail = (email: string) => {
  const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegExp.test(email)) {
    throw new HttpError(400, "Некорректный email");
  }
};

const validateRegisterInput = (input: RegisterInput) => {
  const firstName = assertString(input.firstName, "firstName");
  const lastName = assertString(input.lastName, "lastName");
  const email = normalizeEmail(assertString(input.email, "email"));
  const password = assertString(input.password, "password");

  if (firstName.length < 2) {
    throw new HttpError(400, "Имя должно содержать минимум 2 символа");
  }

  if (lastName.length < 2) {
    throw new HttpError(400, "Фамилия должна содержать минимум 2 символа");
  }

  validateEmail(email);

  if (password.length < 6) {
    throw new HttpError(400, "Пароль должен содержать минимум 6 символов");
  }

  return { firstName, lastName, email, password };
};

const validateLoginInput = (input: LoginInput) => {
  const email = normalizeEmail(assertString(input.email, "email"));
  const password = assertString(input.password, "password");

  validateEmail(email);

  if (password.length < 6) {
    throw new HttpError(400, "Пароль должен содержать минимум 6 символов");
  }

  return { email, password };
};

const signAccessToken = (user: { id: string; email: string }) => {
  return jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: "7d",
  });
};

export const authService = {
  async register(input: RegisterInput) {
    const { firstName, lastName, email, password } = validateRegisterInput(input);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, "Пользователь с таким email уже существует");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash,
        },
        select: publicUserSelect,
      });

      const token = signAccessToken(user);

      return { user, token };
    } catch (e) {
      if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
        throw new HttpError(409, "Пользователь с таким email уже существует");
      }

      throw e;
    }
  },

  async login(input: LoginInput) {
    const { email, password } = validateLoginInput(input);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...publicUserSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new HttpError(401, "Неверный email или пароль");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new HttpError(401, "Неверный email или пароль");
    }

    const { passwordHash, ...publicUser } = user;
    const token = signAccessToken(publicUser);

    return { user: publicUser, token };
  },
};
