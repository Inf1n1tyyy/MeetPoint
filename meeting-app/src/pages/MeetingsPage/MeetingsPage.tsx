import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateMeeting } from "@/features/meetings/hooks/useCreateMeeting";
import { useJoinMeeting } from "@/features/meetings/hooks/useJoinMeeting";
import { useMeetingCategories } from "@/features/meetings/hooks/useMeetingCategories";
import { useMeetings } from "@/features/meetings/hooks/useMeetings";
import type {
  CreateMeetingPayload,
  MeetingStatus,
} from "@/features/meetings/types/meetingTypes";
import { getApiErrorMessage } from "@/shared/api/error";

import styles from "./MeetingsPage.module.scss";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getTodayInputValue = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  title: "",
  description: "",
  category: "Другое",
  address: "",
  date: "",
  time: "",
  participantsLimit: 1,
};

export const MeetingsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<MeetingStatus>("upcoming");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const PAGE_SIZE = 12;

  // При смене фильтров возвращаемся на первую страницу
  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  const filters = useMemo(
    () => ({ search, category, status, page, limit: PAGE_SIZE }),
    [search, category, status, page],
  );
  const { data, isLoading } = useMeetings(filters);
  const meetings = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const { data: categories = [] } = useMeetingCategories();
  const { mutate: joinMeeting, isPending: isJoining } = useJoinMeeting();
  const { mutateAsync: createMeeting, isPending: isCreating } =
    useCreateMeeting();

  const handleJoin = (meetingId: string) => {
    joinMeeting(meetingId);
  };

  const handleCreate = async () => {
    setFormError("");

    if (!form.date || !form.time) {
      setFormError("Укажите дату и время встречи");
      return;
    }

    try {
      const payload: CreateMeetingPayload = {
        title: form.title,
        description: form.description,
        category: form.category,
        address: form.address,
        dateTime: new Date(`${form.date}T${form.time}`).toISOString(),
        participantsLimit: Number(form.participantsLimit),
      };

      await createMeeting(payload);
      setIsModalOpen(false);
      setForm(emptyForm);
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Не удалось создать встречу"));
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MeetPoint</p>
          <h1>Встречи рядом с вами</h1>
          <p>
            Выбирайте событие по интересам, присоединяйтесь к участникам и
            заранее обсуждайте детали в чате.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          onClick={() => setIsModalOpen(true)}
        >
          + Создать встречу
        </button>
      </section>

      <section className={styles.toolbar} aria-label="Фильтры встреч">
        <label className={styles.searchField}>
          <span>Поиск</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Название, описание или адрес"
          />
        </label>

        <label>
          <span>Категория</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Все категории</option>
            {categories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.tabs} role="tablist" aria-label="Статус встреч">
          <button
            className={status === "upcoming" ? styles.activeTab : ""}
            onClick={() => setStatus("upcoming")}
          >
            Предстоящие
          </button>
          <button
            className={status === "past" ? styles.activeTab : ""}
            onClick={() => setStatus("past")}
          >
            Завершённые
          </button>
        </div>
      </section>

      {isLoading ? (
        <p className={styles.state}>Загрузка встреч...</p>
      ) : meetings.length === 0 ? (
        <p className={styles.state}>
          Подходящих встреч пока нет. Создайте первую или измените фильтры.
        </p>
      ) : (
        <div className={styles.list}>
          {meetings.map((meeting) => (
            <article
              key={meeting.id}
              className={styles.card}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
            >
              <div className={styles.cardTop}>
                <span>{meeting.category}</span>
                <strong>
                  {meeting.participantsCount}/{meeting.participantsLimit}
                </strong>
              </div>

              <h3>{meeting.title}</h3>
              <p>{meeting.description}</p>

              <div className={styles.meta}>
                <span>📅 {formatDate(meeting.dateTime)}</span>
                <span>🕒 {formatTime(meeting.dateTime)}</span>
                <span>📍 {meeting.address}</span>
              </div>

              <div className={styles.cardActions}>
                {meeting.isParticipant ? (
                  <span className={styles.participating}>Вы участвуете</span>
                ) : status === "past" ? (
                  <span className={styles.muted}>Встреча завершена</span>
                ) : meeting.participantsCount >= meeting.participantsLimit ? (
                  <span className={styles.muted}>Мест нет</span>
                ) : (
                  <button
                    disabled={isJoining}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleJoin(meeting.id);
                    }}
                  >
                    Присоединиться
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && (page > 1 || hasMore) && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            ← Назад
          </button>
          <span className={styles.pageInfo}>Страница {page}</span>
          <button
            className={styles.pageButton}
            disabled={!hasMore}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Вперёд →
          </button>
        </div>
      )}

      {isModalOpen && (
        <div
          className={styles.overlay}
          onMouseDown={() => setIsModalOpen(false)}
        >
          <div
            className={styles.modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Новая встреча</p>
                <h2>Создать встречу</h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <p className={styles.modalHint}>
              Создатель автоматически становится первым участником.
            </p>

            <label>
              Название
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Например: Вечер настольных игр"
              />
            </label>

            <label>
              Краткое описание
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Что планируете делать и кому будет интересно"
              />
            </label>

            <div className={styles.twoColumns}>
              <label>
                Категория
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {categories.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Максимум участников
                <input
                  type="number"
                  min={1}
                  value={form.participantsLimit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      participantsLimit: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>

            <label>
              Место встречи / адрес
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Например: Томск, Ленина 40"
              />
            </label>

            <div className={styles.mapPreview}>
              <span>🗺️</span>
              <div>
                <strong>Здесь могла бы быть карта :(</strong>
              </div>
            </div>

            <div className={styles.twoColumns}>
              <label>
                Дата
                <input
                  type="date"
                  min={getTodayInputValue()}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>

              <label>
                Время
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </label>
            </div>

            {formError && <p className={styles.error}>{formError}</p>}

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setIsModalOpen(false)}
              >
                Отмена
              </button>
              <button
                className={styles.primaryButton}
                disabled={isCreating}
                onClick={handleCreate}
              >
                Создать встречу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
