import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";

import { loginSchema } from "@/features/auth/schemas/login.schema";
import type { LoginFormValues } from "@/features/auth/schemas/login.schema";
import { Button } from "@/components/UI/Button/Button";
import { useAuth } from "@/app/providers/AuthProvider/AuthContext";
import { loginRequest } from "@/shared/api/auth.api";

import styles from "./LoginPage.module.scss";

const getApiErrorMessage = (e: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(e)) {
    return e.response?.data?.message ?? "Ошибка входа";
  }

  return "Ошибка входа";
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError("");

    try {
      const res = await loginRequest(data);
      await login(res.token);
      navigate("/meetings");
    } catch (e) {
      const message = getApiErrorMessage(e);
      setServerError(message);
      console.error("LOGIN ERROR:", e);
    }
  };

  return (
    <main className={styles.wrapper}>
      <Link className={styles.backLink} to="/">← На главную</Link>

      <section className={styles.card}>
        <div className={styles.heading}>
          <span>MeetPoint</span>
          <h1>Вход</h1>
          <p>Введите email и пароль, чтобы перейти к встречам и чатам.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <label>
            Email
            <input className={styles.input} placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className={styles.error}>{errors.email.message}</p>}
          </label>

          <label>
            Пароль
            <input className={styles.input} type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && <p className={styles.error}>{errors.password.message}</p>}
          </label>

          {serverError && <p className={styles.errorBox}>{serverError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Вход..." : "Войти"}
          </Button>
        </form>

        <p className={styles.footerText}>
          Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
        </p>
      </section>
    </main>
  );
};
