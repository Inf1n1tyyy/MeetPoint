import { Link } from "react-router-dom";

import styles from "./Hero.module.scss";

import { Button } from "@/components/UI/Button/Button";

export const Hero = () => {
  return (
    <section className={styles.hero}>
      <h1>Находите людей по интересам и организовывайте встречи</h1>

      <p>
        Создавайте мероприятия, общайтесь в реальном времени и находите
        единомышленников рядом.
      </p>

      <div className={styles.buttons}>
        <Link to="/register">
          <Button>Начать</Button>
        </Link>

        <Link to="/login">
          <Button>Войти</Button>
        </Link>
      </div>
    </section>
  );
};
