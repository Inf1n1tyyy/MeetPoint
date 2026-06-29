import axios from "axios";

export const getApiErrorMessage = (error: unknown, fallback = "Произошла ошибка") => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
};
