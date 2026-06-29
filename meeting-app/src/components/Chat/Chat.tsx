import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/app/providers/AuthProvider/AuthContext";
import { useChat } from "@/features/chat/hooks/useChat";
import { useSendMessage } from "@/features/chat/hooks/useSendMessage";

import styles from "./Chat.module.scss";

type Props = {
  chatId: string;
};

const getInitials = (firstName: string, lastName: string) => `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

export const Chat = ({ chatId }: Props) => {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useChat(chatId);
  const { mutate: sendMessage, isPending } = useSendMessage(chatId);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!user) return null;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    sendMessage(trimmed);
    setText("");
  };

  return (
    <div className={styles.chat}>
      <div className={styles.messages}>
        {isLoading && <p className={styles.empty}>Загрузка сообщений...</p>}

        {!isLoading && messages.length === 0 && (
          <p className={styles.empty}>Пока сообщений нет. Начните общение первым.</p>
        )}

        {messages.map((message) => {
          const isMine = message.sender.id === user.id;

          return (
            <div key={message.id} className={`${styles.messageRow} ${isMine ? styles.mineRow : ""}`}>
              {!isMine && (
                message.sender.avatarUrl ? (
                  <img className={styles.messageAvatar} src={message.sender.avatarUrl} alt="" />
                ) : (
                  <div className={styles.messageAvatar}>{getInitials(message.sender.firstName, message.sender.lastName)}</div>
                )
              )}

              <div className={`${styles.message} ${isMine ? styles.mine : ""}`}>
                <div className={styles.messageHeader}>
                  <b>{isMine ? "Вы" : `${message.sender.firstName} ${message.sender.lastName}`}</b>
                  <span>{new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p>{message.text}</p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className={styles.input}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Написать сообщение..."
        />

        <button onClick={handleSend} disabled={isPending || !text.trim()}>
          Отправить
        </button>
      </div>
    </div>
  );
};
