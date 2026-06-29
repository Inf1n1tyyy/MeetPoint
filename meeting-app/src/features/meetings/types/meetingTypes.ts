export type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  joinedAt?: string;
};

export type Meeting = {
  id: string;
  title: string;
  description: string;
  category: string;
  address: string;
  dateTime: string;
  participantsCount: number;
  participantsLimit: number;
  creatorId: string;
  creator?: Participant;
  participants: Participant[];
  chatId?: string | null;
  isParticipant: boolean;
};

export type MeetingStatus = "upcoming" | "past" | "all";

// Облегчённый элемент СПИСКА встреч (сервер не присылает здесь
// полный массив участников и объект создателя — только счётчик).
export type MeetingListItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  address: string;
  dateTime: string;
  participantsCount: number;
  participantsLimit: number;
  creatorId: string;
  chatId?: string | null;
  isParticipant: boolean;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type MeetingFilters = {
  search?: string;
  category?: string;
  status?: MeetingStatus;
  page?: number;
  limit?: number;
};

export type CreateMeetingPayload = {
  title: string;
  description: string;
  category: string;
  address: string;
  dateTime: string;
  participantsLimit: number;
};
