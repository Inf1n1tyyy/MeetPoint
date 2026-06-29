import { api, type Paginated } from "@/shared/api/api";
import type { FriendRequest, User } from "@/shared/api/auth.api";

export type ListUsersParams = {
  search?: string;
  page?: number;
  limit?: number;
};

export const usersApi = {
  async getAll(params: ListUsersParams = {}) {
    const res = await api.get<Paginated<User>>("/users", { params });
    return res.data;
  },

  async getFriends() {
    const res = await api.get<User[]>("/users/friends");
    return res.data;
  },

  async getIncomingFriendRequests() {
    const res = await api.get<FriendRequest[]>("/users/friend-requests/incoming");
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  },

  async addFriend(id: string) {
    const res = await api.post<User>(`/users/${id}/friends`);
    return res.data;
  },

  async acceptFriendRequest(id: string) {
    const res = await api.post<User>(`/users/friend-requests/${id}/accept`);
    return res.data;
  },

  async declineFriendRequest(id: string) {
    const res = await api.delete<{ success: boolean }>(`/users/friend-requests/${id}`);
    return res.data;
  },
};
