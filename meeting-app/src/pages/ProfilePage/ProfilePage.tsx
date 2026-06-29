import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider/AuthContext";
import { updateMe, uploadAvatar } from "@/shared/api/auth.api";
import type {
  FriendRequest,
  UpdateProfilePayload,
  User,
} from "@/shared/api/auth.api";
import { getApiErrorMessage } from "@/shared/api/error";
import { useAddFriend } from "@/features/users/hooks/useAddFriend";
import { useFriendRequests } from "@/features/users/hooks/useFriendRequests";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
} from "@/features/users/hooks/useRespondFriendRequest";
import { useFriends } from "@/features/users/hooks/useFriends";
import { useUserProfile } from "@/features/users/hooks/useUserProfile";
import { useUsers } from "@/features/users/hooks/useUsers";

import styles from "./ProfilePage.module.scss";

const getInitials = (user: Pick<User, "firstName" | "lastName">) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

const getFriendButtonLabel = (status: User["friendStatus"]) => {
  if (status === "outgoing_request") return "Заявка отправлена";
  if (status === "incoming_request") return "Принять заявку";
  return "Добавить в друзья";
};

const UserAvatar = ({
  user,
  className,
}: {
  user: Pick<User, "firstName" | "lastName" | "avatarUrl">;
  className?: string;
}) =>
  user.avatarUrl ? (
    <img
      className={className}
      src={user.avatarUrl}
      alt={`${user.firstName} ${user.lastName}`}
    />
  ) : (
    <div className={className ?? styles.avatar}>{getInitials(user)}</div>
  );

const UserCard = ({
  user,
  onAddFriend,
}: {
  user: User;
  onAddFriend?: (id: string) => void;
}) => {
  const canAdd =
    user.friendStatus === "none" || user.friendStatus === "incoming_request";
  const isDisabled = user.friendStatus === "outgoing_request";

  return (
    <div className={styles.userCard}>
      <Link to={`/users/${user.id}`} className={styles.userMain}>
        <UserAvatar user={user} className={styles.avatar} />
        <div>
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          <span>{user.city || user.email}</span>
        </div>
      </Link>

      {user.friendStatus === "friends" ? (
        <span className={styles.friendBadge}>В друзьях</span>
      ) : onAddFriend ? (
        <button
          disabled={!canAdd || isDisabled}
          onClick={() => canAdd && onAddFriend(user.id)}
        >
          {getFriendButtonLabel(user.friendStatus)}
        </button>
      ) : null}
    </div>
  );
};

const FriendRequestCard = ({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) => (
  <div className={styles.requestCard}>
    <Link to={`/users/${request.user.id}`} className={styles.userMain}>
      <UserAvatar user={request.user} className={styles.avatar} />
      <div>
        <strong>
          {request.user.firstName} {request.user.lastName}
        </strong>
        <span>Хочет добавить вас в друзья</span>
      </div>
    </Link>

    <div className={styles.requestActions}>
      <button onClick={() => onAccept(request.id)}>Принять</button>
      <button
        className={styles.ghostButton}
        onClick={() => onDecline(request.id)}
      >
        Отклонить
      </button>
    </div>
  </div>
);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });

export const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, refreshUser } = useAuth();
  const isOwnProfile = !id || id === currentUser?.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: externalUser, isLoading: isExternalLoading } = useUserProfile(
    isOwnProfile ? "" : (id ?? ""),
  );
  const profileUser = isOwnProfile ? currentUser : externalUser;

  const [activeTab, setActiveTab] = useState<
    "info" | "friends" | "requests" | "discover"
  >("info");
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [form, setForm] = useState<UpdateProfilePayload>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { data: friends = [] } = useFriends();
  const { data: usersData } = useUsers(search, userPage);
  const users = usersData?.items ?? [];
  const usersHasMore = usersData?.hasMore ?? false;
  const { data: friendRequests = [] } = useFriendRequests();
  const { mutate: addFriend } = useAddFriend();
  const { mutate: acceptFriendRequest } = useAcceptFriendRequest();
  const { mutate: declineFriendRequest } = useDeclineFriendRequest();

  useEffect(() => {
    if (!profileUser) return;

    setForm({
      firstName: profileUser.firstName,
      lastName: profileUser.lastName,
      avatarUrl: profileUser.avatarUrl ?? "",
      bio: profileUser.bio ?? "",
      city: profileUser.city ?? "",
      interests: profileUser.interests ?? "",
    });
  }, [profileUser]);

  useEffect(() => {
    setUserPage(1);
  }, [search]);

  const discoverUsers = useMemo(
    () =>
      users.filter(
        (item) =>
          item.friendStatus !== "friends" && item.friendStatus !== "self",
      ),
    [users],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateMe(form);
      await refreshUser();
      setIsEditing(false);
      setMessage("Профиль обновлён");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось обновить профиль"));
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Размер аватара не должен превышать 2 МБ");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const dataUrl = await readFileAsDataUrl(file);
      await uploadAvatar({ dataUrl, fileName: file.name });
      await refreshUser();
      setMessage("Аватар обновлён");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить аватар"));
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  if (!currentUser)
    return <p className={styles.state}>Пользователь не найден</p>;
  if (!isOwnProfile && isExternalLoading)
    return <p className={styles.state}>Загрузка...</p>;
  if (!profileUser) return <p className={styles.state}>Профиль не найден</p>;

  const renderExternalProfileAction = () => {
    if (profileUser.friendStatus === "friends")
      return <span className={styles.friendBadge}>У вас в друзьях</span>;

    const disabled = profileUser.friendStatus === "outgoing_request";
    return (
      <button disabled={disabled} onClick={() => addFriend(profileUser.id)}>
        {getFriendButtonLabel(profileUser.friendStatus)}
      </button>
    );
  };

  return (
    <div className={styles.page}>
      {!isOwnProfile && (
        <Link to="/meetings" className={styles.back}>
          ← Назад
        </Link>
      )}

      <section className={styles.profileHeader}>
        <div className={styles.avatarColumn}>
          <UserAvatar user={profileUser} className={styles.bigAvatar} />
          {isOwnProfile && (
            <>
              <input
                ref={fileInputRef}
                className={styles.hiddenFileInput}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <button
                className={styles.uploadButton}
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingAvatar ? "Загрузка..." : "Загрузить фото"}
              </button>
            </>
          )}
        </div>

        <div className={styles.profileInfo}>
          <p className={styles.eyebrow}>Профиль</p>
          <h1>
            {profileUser.firstName} {profileUser.lastName}
          </h1>
          <div className={styles.profileTags}>
            <span>{profileUser.city || "Город не указан"}</span>
            <span>{profileUser.interests || "Интересы пока не указаны"}</span>
          </div>
        </div>

        {isOwnProfile ? (
          <button
            className={styles.headerButton}
            onClick={() => setIsEditing((value) => !value)}
          >
            {isEditing ? "Закрыть форму" : "Редактировать профиль"}
          </button>
        ) : (
          renderExternalProfileAction()
        )}
      </section>

      {message && <p className={styles.success}>{message}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.about}>
        <h2>О пользователе</h2>
        <p>
          {profileUser.bio || "Пользователь пока ничего о себе не рассказал."}
        </p>
      </section>

      {isOwnProfile && isEditing && (
        <form className={styles.editForm} onSubmit={handleSubmit}>
          <label>
            Имя
            <input
              value={form.firstName ?? ""}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>

          <label>
            Фамилия
            <input
              value={form.lastName ?? ""}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>

          <label>
            Город
            <input
              value={form.city ?? ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>

          <label>
            Интересы
            <input
              value={form.interests ?? ""}
              onChange={(e) => setForm({ ...form, interests: e.target.value })}
            />
          </label>

          <label className={styles.fullWidth}>
            О себе
            <textarea
              value={form.bio ?? ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>

          <button>Сохранить</button>
        </form>
      )}

      {isOwnProfile && (
        <section className={styles.tabsSection}>
          <div className={styles.tabs}>
            <button
              className={activeTab === "info" ? styles.activeTab : ""}
              onClick={() => setActiveTab("info")}
            >
              Информация
            </button>
            <button
              className={activeTab === "friends" ? styles.activeTab : ""}
              onClick={() => setActiveTab("friends")}
            >
              Друзья
            </button>
            <button
              className={activeTab === "requests" ? styles.activeTab : ""}
              onClick={() => setActiveTab("requests")}
            >
              Заявки{" "}
              {friendRequests.length > 0 ? `(${friendRequests.length})` : ""}
            </button>
            <button
              className={activeTab === "discover" ? styles.activeTab : ""}
              onClick={() => setActiveTab("discover")}
            >
              Найти друзей
            </button>
          </div>

          {activeTab === "info" && (
            <div className={styles.infoBox}>
              <div>
                <span>Email</span>
                <strong>{profileUser.email}</strong>
              </div>
              <div>
                <span>Дата регистрации</span>
                <strong>
                  {profileUser.createdAt
                    ? new Date(profileUser.createdAt).toLocaleDateString(
                        "ru-RU",
                      )
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Друзей</span>
                <strong>{friends.length}</strong>
              </div>
            </div>
          )}

          {activeTab === "friends" && (
            <div className={styles.cardsList}>
              {friends.length === 0 ? (
                <p className={styles.state}>Друзей пока нет.</p>
              ) : (
                friends.map((friend) => (
                  <UserCard key={friend.id} user={friend} />
                ))
              )}
            </div>
          )}

          {activeTab === "requests" && (
            <div className={styles.cardsList}>
              {friendRequests.length === 0 ? (
                <p className={styles.state}>Входящих заявок пока нет.</p>
              ) : (
                friendRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    onAccept={(requestId) => acceptFriendRequest(requestId)}
                    onDecline={(requestId) => declineFriendRequest(requestId)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "discover" && (
            <div>
              <input
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени, email или городу"
              />
              <div className={styles.cardsList}>
                {discoverUsers.length === 0 ? (
                  <p className={styles.state}>
                    Нет пользователей для добавления.
                  </p>
                ) : (
                  discoverUsers.map((item) => (
                    <UserCard
                      key={item.id}
                      user={item}
                      onAddFriend={(friendId) => addFriend(friendId)}
                    />
                  ))
                )}
              </div>

              {(userPage > 1 || usersHasMore) && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageButton}
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                  >
                    ← Назад
                  </button>
                  <span className={styles.pageInfo}>Страница {userPage}</span>
                  <button
                    className={styles.pageButton}
                    disabled={!usersHasMore}
                    onClick={() => setUserPage((prev) => prev + 1)}
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
