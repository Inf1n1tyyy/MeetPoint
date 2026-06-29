import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useChats } from "@/features/chat/hooks/useChats";
import { useCreateChat } from "@/features/chat/hooks/useCreateChat";
import { useFriends } from "@/features/users/hooks/useFriends";
import { getApiErrorMessage } from "@/shared/api/error";

import styles from "./ChatsPage.module.scss";

const formatDateTime = (value: string) => new Date(value).toLocaleString("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const ChatsPage = () => {
  const navigate = useNavigate();
  const { data: chats = [], isLoading } = useChats();
  const { data: friends = [] } = useFriends();
  const { mutateAsync: createChat, isPending } = useCreateChat();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleOpenChat = (chat: (typeof chats)[number]) => {
    if (chat.type === "MEETING" && chat.meetingId) {
      navigate(`/meetings/${chat.meetingId}`);
      return;
    }

    navigate(`/chats/${chat.id}`);
  };

  const toggleFriend = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleCreateChat = async () => {
    setError("");

    try {
      const chat = await createChat({ title, participantIds: selectedIds });
      setTitle("");
      setSelectedIds([]);
      setIsModalOpen(false);
      navigate(`/chats/${chat.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось создать чат"));
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Realtime</p>
          <h1>Чаты</h1>
          <p>Здесь собраны чаты встреч и отдельные групповые чаты с друзьями. Чаты встреч открываются на странице самой встречи.</p>
        </div>

        <button onClick={() => setIsModalOpen(true)}>+ Создать чат</button>
      </section>

      {isLoading ? (
        <p className={styles.state}>Загрузка чатов...</p>
      ) : chats.length === 0 ? (
        <p className={styles.state}>У вас пока нет доступных чатов. Присоединитесь к встрече или создайте групповой чат.</p>
      ) : (
        <div className={styles.list}>
          {chats.map((chat) => (
            <button key={chat.id} className={styles.chatCard} onClick={() => handleOpenChat(chat)}>
              <div className={styles.chatMain}>
                <span className={chat.type === "MEETING" ? styles.meetingBadge : styles.groupBadge}>
                  {chat.type === "MEETING" ? "Чат встречи" : "Групповой чат"}
                </span>
                <h3>{chat.title}</h3>
                {chat.meetingDateTime ? (
                  <p>Встреча: {formatDateTime(chat.meetingDateTime)}</p>
                ) : (
                  <p>Не привязан к встрече и не удаляется автоматически</p>
                )}
              </div>

              <div className={styles.chatMeta}>
                <span title="Участники">👥 {chat.participants.length}</span>
                <span title="Сообщения">💬 {chat.messagesCount}</span>
                <span className={styles.openArrow}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.overlay} onMouseDown={() => setIsModalOpen(false)}>
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Новый чат</p>
                <h2>Групповой чат</h2>
              </div>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)} aria-label="Закрыть">×</button>
            </div>

            <label>
              Название
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Команда по настолкам" />
            </label>

            <div className={styles.friendsBlock}>
              <strong>Добавить друзей</strong>

              {friends.length === 0 ? (
                <p>Сначала добавьте друзей на странице профиля. В seed-данных уже есть один друг для демонстрационного пользователя.</p>
              ) : (
                <div className={styles.friendsList}>
                  {friends.map((friend) => (
                    <label key={friend.id} className={styles.friendOption}>
                      <input type="checkbox" checked={selectedIds.includes(friend.id)} onChange={() => toggleFriend(friend.id)} />
                      <span>{friend.firstName} {friend.lastName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setIsModalOpen(false)}>Отмена</button>
              <button disabled={isPending || !title.trim()} onClick={handleCreateChat}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
