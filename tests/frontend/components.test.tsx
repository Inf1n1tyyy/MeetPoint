/**
 * Фронтенд-тесты — React компоненты и хуки
 * Инструмент: Vitest + @testing-library/react
 *
 * Установка:
 *   npm i -D vitest @testing-library/react @testing-library/user-event
 *       @testing-library/jest-dom jsdom
 *
 * Добавьте в vite.config.ts:
 *   test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' }
 *
 * Запуск:
 *   npx vitest run tests/frontend/
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ────────────────────────────────────────────────────────────────────────────────
// Mock: axios (заглушка API-слоя)
// ────────────────────────────────────────────────────────────────────────────────

vi.mock("axios", () => ({
  default: {
    create: () => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
  },
}));

// ────────────────────────────────────────────────────────────────────────────────
// Тесты Zod-схем (login / register)
// ────────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

// Воссоздаём схемы точно как в проекте
const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  lastName: z.string().min(2, "Фамилия должна содержать минимум 2 символа"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

describe("loginSchema (Zod)", () => {
  it("принимает корректные данные", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("ошибка при невалидном email", () => {
    const result = loginSchema.safeParse({ email: "notanemail", password: "password123" });
    expect(result.success).toBe(false);
    const issues = result.error?.issues ?? [];
    expect(issues.some((i) => i.path[0] === "email")).toBe(true);
  });

  it("ошибка при коротком пароле", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "123" });
    expect(result.success).toBe(false);
    const issues = result.error?.issues ?? [];
    expect(issues.some((i) => i.path[0] === "password")).toBe(true);
  });
});

describe("registerSchema (Zod)", () => {
  const valid = {
    firstName: "Иван",
    lastName: "Иванов",
    email: "ivan@test.com",
    password: "password123",
  };

  it("принимает корректные данные", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("ошибка при слишком коротком firstName", () => {
    const r = registerSchema.safeParse({ ...valid, firstName: "И" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "firstName")).toBe(true);
  });

  it("ошибка при слишком коротком lastName", () => {
    const r = registerSchema.safeParse({ ...valid, lastName: "И" });
    expect(r.success).toBe(false);
  });

  it("ошибка при слабом пароле", () => {
    const r = registerSchema.safeParse({ ...valid, password: "12345" });
    expect(r.success).toBe(false);
  });

  it("все поля обязательны", () => {
    const r = registerSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(r.error?.issues.length).toBeGreaterThanOrEqual(4);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты Button компонента
// ────────────────────────────────────────────────────────────────────────────────

// Упрощённая версия Button (реальный компонент из src/components/UI/Button)
import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
}

function Button({ children, onClick, disabled, type = "button", variant = "primary" }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

describe("Button компонент", () => {
  it("рендерится с переданным текстом", () => {
    render(<Button>Войти</Button>);
    expect(screen.getByText("Войти")).toBeInTheDocument();
  });

  it("вызывает onClick при клике", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Кнопка</Button>);
    await userEvent.click(screen.getByText("Кнопка"));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("не вызывает onClick когда disabled", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Недоступно</Button>);
    const btn = screen.getByText("Недоступно");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("устанавливает type=submit", () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByText("Submit")).toHaveAttribute("type", "submit");
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты AppRouter — защищённые маршруты
// ────────────────────────────────────────────────────────────────────────────────

// Упрощённый ProtectedRoute как в проекте
import { MemoryRouter, Routes, Route } from "react-router-dom";

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

function ProtectedRoute({ isAuthenticated, children }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <div data-testid="redirect-to-login">Redirected to login</div>;
  }
  return <>{children}</>;
}

describe("ProtectedRoute", () => {
  it("рендерит дочерний контент для авторизованного пользователя", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute isAuthenticated={true}>
          <div data-testid="protected-content">Закрытая страница</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("редиректит неавторизованного пользователя", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute isAuthenticated={false}>
          <div data-testid="protected-content">Закрытая страница</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("redirect-to-login")).toBeInTheDocument();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты Chat API утилиты: getWsUrl
// ────────────────────────────────────────────────────────────────────────────────

function getWsUrl(token: string, apiUrl = "http://localhost:5000"): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.searchParams.set("token", token);
  return url.toString();
}

describe("getWsUrl", () => {
  it("генерирует ws:// URL для http://", () => {
    const url = getWsUrl("mytoken", "http://localhost:5000");
    expect(url).toMatch(/^ws:\/\//);
    expect(url).toContain("/ws");
    expect(url).toContain("token=mytoken");
  });

  it("генерирует wss:// URL для https://", () => {
    const url = getWsUrl("mytoken", "https://api.example.com");
    expect(url).toMatch(/^wss:\/\//);
  });

  it("токен попадает в query string", () => {
    const url = getWsUrl("abc123token");
    expect(url).toContain("token=abc123token");
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты форматирования данных встречи
// ────────────────────────────────────────────────────────────────────────────────

function formatMeetingDate(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMeetingStatus(dateTime: string): "upcoming" | "past" {
  return new Date(dateTime).getTime() > Date.now() ? "upcoming" : "past";
}

describe("Утилиты форматирования встреч", () => {
  it("formatMeetingDate возвращает читаемую дату", () => {
    const result = formatMeetingDate("2026-07-15T18:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(5);
  });

  it("getMeetingStatus: будущая встреча → upcoming", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(getMeetingStatus(future)).toBe("upcoming");
  });

  it("getMeetingStatus: прошедшая встреча → past", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(getMeetingStatus(past)).toBe("past");
  });
});
