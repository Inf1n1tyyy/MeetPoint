import { Link, useParams } from "react-router-dom";

import { useMeeting } from "@/features/meetings/hooks/useMeeting";
import { useJoinMeeting } from "@/features/meetings/hooks/useJoinMeeting";
import { Chat } from "@/components/Chat/Chat";

import styles from "./MeetingDetailsPage.module.scss";

const formatDateTime = (value: string) => new Date(value).toLocaleString("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const getInitials = (firstName: string, lastName: string) => `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

export const MeetingDetailsPage = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { data: meeting, isLoading, error } = useMeeting(id);
  const { mutate: joinMeeting, isPending } = useJoinMeeting();

  if (!id) return <p className={styles.state}>Неверный ID встречи</p>;
  if (isLoading) return <p className={styles.state}>Загрузка...</p>;
  if (error) return <p className={styles.state}>Не удалось загрузить встречу</p>;
  if (!meeting) return <p className={styles.state}>Встреча не найдена</p>;

  const isPast = new Date(meeting.dateTime).getTime() < Date.now();
  const isFull = meeting.participantsCount >= meeting.participantsLimit;

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/meetings">← Ко всем встречам</Link>

      <section className={styles.hero}>
        <div>
          <span className={styles.category}>{meeting.category}</span>
          <h1>{meeting.title}</h1>
          <p>{meeting.description}</p>
        </div>

        <div className={styles.joinCard}>
          <strong>{meeting.participantsCount}/{meeting.participantsLimit}</strong>
          <span>участников</span>

          {meeting.isParticipant ? (
            <p className={styles.success}>Вы участвуете</p>
          ) : isPast ? (
            <p className={styles.muted}>Встреча завершена</p>
          ) : isFull ? (
            <p className={styles.muted}>Мест нет</p>
          ) : (
            <button disabled={isPending} onClick={() => joinMeeting(meeting.id)}>
              Участвовать
            </button>
          )}
        </div>
      </section>

      <section className={styles.infoGrid}>
        <div>
          <span>Дата и время</span>
          <strong>{formatDateTime(meeting.dateTime)}</strong>
        </div>
        <div>
          <span>Место встречи</span>
          <strong>{meeting.address}</strong>
        </div>
        <div>
          <span>Организатор</span>
          <strong>{meeting.creator ? `${meeting.creator.firstName} ${meeting.creator.lastName}` : "Не указан"}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Участники</h2>

        <div className={styles.participants}>
          {meeting.participants.map((participant) => (
            <Link to={`/users/${participant.id}`} key={participant.id} className={styles.userCard}>
              {participant.avatarUrl ? (
                <img src={participant.avatarUrl} alt={`${participant.firstName} ${participant.lastName}`} />
              ) : (
                <div className={styles.avatar}>{getInitials(participant.firstName, participant.lastName)}</div>
              )}
              <span>{participant.firstName} {participant.lastName}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Чат встречи</h2>

        {meeting.isParticipant && meeting.chatId ? (
          <Chat chatId={meeting.chatId} />
        ) : (
          <div className={styles.closedChat}>Чтобы войти в чат, вы должны стать участником встречи.</div>
        )}
      </section>
    </div>
  );
};
