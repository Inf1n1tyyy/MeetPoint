export type ChatMessage = {
  id: string;
  chatId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  text: string;
  createdAt: string;
};

export type Chat = {
  id: string;
  meetingId?: string | null;
  meetingTitle?: string | null;
  meetingDateTime?: string | null;
  expiresAt?: string | null;
  title: string;
  type: "MEETING" | "GROUP";
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }>;
  messagesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateChatPayload = {
  title: string;
  participantIds: string[];
};
