import { api } from "@/shared/api/api";
import type {
  CreateMeetingPayload,
  Meeting,
  MeetingFilters,
  MeetingListItem,
  Paginated,
} from "../types/meetingTypes";

export const meetingsApi = {
  async getAll(filters: MeetingFilters = {}) {
    const res = await api.get<Paginated<MeetingListItem>>("/meetings", {
      params: filters,
    });
    return res.data;
  },

  async getCategories() {
    const res = await api.get<string[]>("/meetings/categories");
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get<Meeting>(`/meetings/${id}`);
    return res.data;
  },

  async create(data: CreateMeetingPayload) {
    const res = await api.post<Meeting>("/meetings", data);
    return res.data;
  },

  async joinMeeting(meetingId: string) {
    const res = await api.post<Meeting>(`/meetings/${meetingId}/join`);
    return res.data;
  },
};
