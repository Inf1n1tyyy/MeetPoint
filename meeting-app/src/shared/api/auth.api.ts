import { api } from "./api";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  interests?: string | null;
  createdAt?: string;
  updatedAt?: string;
  friendStatus?: "self" | "friends" | "none" | "incoming_request" | "outgoing_request";
};

export type FriendRequest = {
  id: string;
  createdAt: string;
  user: User;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UpdateProfilePayload = Partial<Pick<User, "firstName" | "lastName" | "avatarUrl" | "bio" | "city" | "interests">>;

export type UploadAvatarPayload = {
  dataUrl: string;
  fileName?: string;
};

export const registerRequest = async (data: RegisterPayload): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/register", data);
  return res.data;
};

export const loginRequest = async (data: LoginPayload): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/login", data);
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await api.get<User>("/users/me");
  return res.data;
};

export const updateMe = async (data: UpdateProfilePayload): Promise<User> => {
  const res = await api.patch<User>("/users/me", data);
  return res.data;
};

export const uploadAvatar = async (data: UploadAvatarPayload): Promise<User> => {
  const res = await api.post<User>("/users/me/avatar", data);
  return res.data;
};
