import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider/AuthContext";
import { registerRequest } from "@/shared/api/auth.api";
import { registerSchema } from "@/features/auth/schemas/register.schema";
import type { RegisterFormValues } from "@/features/auth/schemas/register.schema";
import { Button } from "@/components/UI/Button/Button";

import styles from "./RegisterPage.module.scss";

const getApiErrorMessage = (e: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(e)) {
    return e.response?.data?.message ?? "Ошибка регистрации";
  }

  return "Ошибка регистрации";
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError("");

    try {
      const { confirmPassword, ...payload } = data;
      const res = await registerRequest(payload);
      await login(res.token);
      navigate("/meetings");
    } catch (e) {
      const message = getApiErrorMessage(e);
      setServerError(message);
      console.error("REGISTER ERROR:", e);
    }
  };

  return (
    <main className={styles.wrapper}>
      <Link className={styles.backLink} to="/">← На главную</Link>

      <section className={styles.card}>
        <div className={styles.heading}>
          <span>Новый аккаунт</span>
          <h1>Регистрация</h1>
          <p>Создайте профиль, чтобы участвовать во встречах и общаться в чатах.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.twoColumns}>
            <label>
              Имя
              <input className={styles.input} placeholder="Иван" {...register("firstName")} />
              {errors.firstName && <p className={styles.error}>{errors.firstName.message}</p>}
            </label>

            <label>
              Фамилия
              <input className={styles.input} placeholder="Иванов" {...register("lastName")} />
              {errors.lastName && <p className={styles.error}>{errors.lastName.message}</p>}
            </label>
          </div>

          <label>
            Email
            <input className={styles.input} placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className={styles.error}>{errors.email.message}</p>}
          </label>

          <label>
            Пароль
            <input className={styles.input} type="password" placeholder="Минимум 6 символов" {...register("password")} />
            {errors.password && <p className={styles.error}>{errors.password.message}</p>}
          </label>

          <label>
            Повторите пароль
            <input className={styles.input} type="password" placeholder="Повторите пароль" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword.message}</p>}
          </label>

          {serverError && <p className={styles.errorBox}>{serverError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Регистрация..." : "Создать аккаунт"}
          </Button>
        </form>

        <p className={styles.footerText}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </section>
    </main>
  );
};
