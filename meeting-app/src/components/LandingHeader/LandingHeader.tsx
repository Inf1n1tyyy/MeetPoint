import { Link } from "react-router-dom";

import styles from "./LandingHeader.module.scss";

import { Button } from "@/components/UI/Button/Button";

export const LandingHeader = () => {
  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.logo}>🤝 MeetPoint</div>

        <div className={styles.actions}>
          <Link to="/login">
            <Button variant="outline">Войти</Button>
          </Link>

          <Link to="/register">
            <Button>Регистрация</Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
