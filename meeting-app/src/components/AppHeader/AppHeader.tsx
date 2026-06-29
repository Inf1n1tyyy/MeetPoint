import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider/AuthContext";

import styles from "./AppHeader.module.scss";

const getInitials = (firstName?: string, lastName?: string) => `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

export const AppHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navClassName = ({ isActive }: { isActive: boolean }) => `${styles.link} ${isActive ? styles.active : ""}`;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/meetings" className={styles.logo}>
          <span className={styles.logoIcon}>🤝</span>
          <span>MeetPoint</span>
        </NavLink>

        <nav className={styles.nav} aria-label="Основная навигация">
          <NavLink to="/meetings" className={navClassName}>Встречи</NavLink>
          <NavLink to="/chats" className={navClassName}>Чаты</NavLink>
          <NavLink to="/profile" className={navClassName}>
            <span className={styles.miniAvatar}>
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getInitials(user?.firstName, user?.lastName)}
            </span>
            <span className={styles.profileText}>{user?.firstName} {user?.lastName}</span>
          </NavLink>
          <button className={styles.logoutButton} onClick={handleLogout}>Выйти</button>
        </nav>
      </div>
    </header>
  );
};
