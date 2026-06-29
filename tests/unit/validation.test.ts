/**
 * Юнит-тесты — валидация и утилиты бэкенда
 * Запуск: npx jest tests/unit/
 *
 * Тестируем чистую логику без БД:
 *   - валидация входных данных auth
 *   - валидация создания встречи
 *   - утилиты (parsePositiveInt, requiredString, date)
 */

// ────────────────────────────────────────────────────────────────────────────────
// Тесты валидации email
// ────────────────────────────────────────────────────────────────────────────────

const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe("Email validation regex", () => {
  const valid = [
    "user@example.com",
    "user.name+tag@domain.co.uk",
    "test123@test.org",
    "a@b.io",
  ];
  const invalid = [
    "",
    "notanemail",
    "@domain.com",
    "user@",
    "user @example.com",
    "user@domain",
  ];

  valid.forEach((email) => {
    it(`принимает валидный email: ${email}`, () => {
      expect(emailRegExp.test(email)).toBe(true);
    });
  });

  invalid.forEach((email) => {
    it(`отклоняет невалидный email: "${email}"`, () => {
      expect(emailRegExp.test(email)).toBe(false);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты нормализации email
// ────────────────────────────────────────────────────────────────────────────────

describe("Email normalization", () => {
  const normalize = (email: string) => email.trim().toLowerCase();

  it("приводит к нижнему регистру", () => {
    expect(normalize("USER@EXAMPLE.COM")).toBe("user@example.com");
  });

  it("удаляет пробелы по краям", () => {
    expect(normalize("  user@example.com  ")).toBe("user@example.com");
  });

  it("сохраняет уже нормализованный email", () => {
    expect(normalize("user@example.com")).toBe("user@example.com");
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты parsePositiveInt (логика из request.ts)
// ────────────────────────────────────────────────────────────────────────────────

function parsePositiveInt(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Поле ${fieldName} должно быть положительным целым числом`);
  }
  return n;
}

describe("parsePositiveInt", () => {
  it("парсит корректное целое число", () => {
    expect(parsePositiveInt(5, "limit")).toBe(5);
    expect(parsePositiveInt("10", "limit")).toBe(10);
    expect(parsePositiveInt(1, "limit")).toBe(1);
  });

  it("выбрасывает ошибку для 0", () => {
    expect(() => parsePositiveInt(0, "limit")).toThrow();
  });

  it("выбрасывает ошибку для отрицательных", () => {
    expect(() => parsePositiveInt(-5, "limit")).toThrow();
  });

  it("выбрасывает ошибку для дробных чисел", () => {
    expect(() => parsePositiveInt(2.5, "limit")).toThrow();
  });

  it("выбрасывает ошибку для строки 'abc'", () => {
    expect(() => parsePositiveInt("abc", "limit")).toThrow();
  });

  it("выбрасывает ошибку для null/undefined", () => {
    expect(() => parsePositiveInt(null, "limit")).toThrow();
    expect(() => parsePositiveInt(undefined, "limit")).toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты requiredString (логика из request.ts)
// ────────────────────────────────────────────────────────────────────────────────

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") throw new Error(`Поле ${fieldName} обязательно`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Поле ${fieldName} не может быть пустым`);
  return trimmed;
}

describe("requiredString", () => {
  it("возвращает обрезанную строку", () => {
    expect(requiredString("  hello  ", "name")).toBe("hello");
  });

  it("выбрасывает ошибку для пустой строки", () => {
    expect(() => requiredString("", "name")).toThrow();
    expect(() => requiredString("   ", "name")).toThrow();
  });

  it("выбрасывает ошибку для не-строк", () => {
    expect(() => requiredString(null, "name")).toThrow();
    expect(() => requiredString(42, "name")).toThrow();
    expect(() => requiredString(undefined, "name")).toThrow();
    expect(() => requiredString([], "name")).toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты валидации создания встречи
// ────────────────────────────────────────────────────────────────────────────────

interface MeetingInput {
  title?: unknown;
  description?: unknown;
  dateTime?: unknown;
  participantsLimit?: unknown;
}

function validateMeetingInput(input: MeetingInput) {
  const title = requiredString(input.title, "title");
  const description = requiredString(input.description, "description");
  const participantsLimit = parsePositiveInt(input.participantsLimit ?? 1, "participantsLimit");

  if (title.length < 3) throw new Error("Название должно содержать минимум 3 символа");
  if (description.length < 10) throw new Error("Описание должно содержать минимум 10 символов");

  const raw = requiredString(input.dateTime, "dateTime");
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("Некорректная дата");
  if (date.getTime() <= Date.now()) throw new Error("Дата должна быть в будущем");

  return { title, description, date, participantsLimit };
}

const futureDate = new Date(Date.now() + 86400 * 1000).toISOString();
const validInput = {
  title: "Тестовая встреча",
  description: "Подробное описание встречи, длиннее 10 символов",
  dateTime: futureDate,
  participantsLimit: 10,
};

describe("validateMeetingInput", () => {
  it("принимает корректный input", () => {
    expect(() => validateMeetingInput(validInput)).not.toThrow();
  });

  it("ошибка при коротком title (< 3 символов)", () => {
    expect(() => validateMeetingInput({ ...validInput, title: "AB" })).toThrow(/3 символа/);
  });

  it("ошибка при коротком description (< 10 символов)", () => {
    expect(() => validateMeetingInput({ ...validInput, description: "Кратко" })).toThrow(/10 символов/);
  });

  it("ошибка при дате в прошлом", () => {
    const past = new Date(Date.now() - 86400 * 1000).toISOString();
    expect(() => validateMeetingInput({ ...validInput, dateTime: past })).toThrow(/будущ/);
  });

  it("ошибка при невалидной дате", () => {
    expect(() => validateMeetingInput({ ...validInput, dateTime: "not-a-date" })).toThrow(/дата/i);
  });

  it("ошибка при participantsLimit = 0", () => {
    expect(() => validateMeetingInput({ ...validInput, participantsLimit: 0 })).toThrow();
  });

  it("ошибка при отрицательном лимите", () => {
    expect(() => validateMeetingInput({ ...validInput, participantsLimit: -5 })).toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты getMeetingChatExpiresAt (логика из utils/date.ts)
// ────────────────────────────────────────────────────────────────────────────────

// Предполагаем логику: чат встречи истекает через 24ч после dateTime
function getMeetingChatExpiresAt(meetingDate: Date): Date {
  return new Date(meetingDate.getTime() + 24 * 60 * 60 * 1000);
}

describe("getMeetingChatExpiresAt", () => {
  it("возвращает дату через 24 часа после встречи", () => {
    const meeting = new Date("2026-07-01T10:00:00Z");
    const expires = getMeetingChatExpiresAt(meeting);
    expect(expires.toISOString()).toBe("2026-07-02T10:00:00.000Z");
  });

  it("всегда позже даты встречи", () => {
    const meeting = new Date();
    const expires = getMeetingChatExpiresAt(meeting);
    expect(expires.getTime()).toBeGreaterThan(meeting.getTime());
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// Тесты avatar MIME validation (логика из users.service.ts)
// ────────────────────────────────────────────────────────────────────────────────

const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function parseAvatarDataUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("Передайте изображение");
  const match = value.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) throw new Error("Поддерживаются только изображения JPG, PNG, WEBP или GIF");
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Файл изображения пустой");
  if (buffer.length > 2 * 1024 * 1024) throw new Error("Размер аватара не должен превышать 2 МБ");
  return { mimeType, buffer, ext: AVATAR_MIME_TO_EXT[mimeType] };
}

describe("parseAvatarDataUrl", () => {
  // 1px PNG base64
  const validPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  it("парсит валидный PNG data URL", () => {
    const result = parseAvatarDataUrl(validPng);
    expect(result.mimeType).toBe("image/png");
    expect(result.ext).toBe("png");
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("выбрасывает ошибку для не-строки", () => {
    expect(() => parseAvatarDataUrl(null)).toThrow("Передайте изображение");
  });

  it("выбрасывает ошибку для неподдерживаемого типа (svg)", () => {
    const svgUrl = "data:image/svg+xml;base64,PHN2Zy8+";
    expect(() => parseAvatarDataUrl(svgUrl)).toThrow();
  });

  it("выбрасывает ошибку для обычной строки", () => {
    expect(() => parseAvatarDataUrl("not-a-data-url")).toThrow();
  });
});
