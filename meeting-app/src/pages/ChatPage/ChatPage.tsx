import { Link, useParams } from "react-router-dom";

import { Chat } from "@/components/Chat/Chat";
import { useChatInfo } from "@/features/chat/hooks/useChatInfo";

import styles from "./ChatPage.module.scss";

export const ChatPage = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { data: chat, isLoading } = useChatInfo(id);

  if (isLoading) return <p className={styles.state}>Загрузка...</p>;
  if (!chat) return <p className={styles.state}>Чат не найден</p>;

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/chats">← Ко всем чатам</Link>

      <div className={styles.header}>
        <div>
          <span>{chat.type === "GROUP" ? "Групповой чат" : "Чат встречи"}</span>
          <h1>{chat.title}</h1>
          <p>Участников: {chat.participants.length}</p>
        </div>
      </div>

      <Chat chatId={chat.id} />
    </div>
  );
};
