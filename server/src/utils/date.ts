export const MEETING_CHAT_LIFETIME_HOURS = Number(process.env.MEETING_CHAT_LIFETIME_HOURS ?? 4);

export const getMeetingChatExpiresAt = (dateTime: Date) => {
  return new Date(dateTime.getTime() + MEETING_CHAT_LIFETIME_HOURS * 60 * 60 * 1000);
};

export const isMeetingChatExpired = (dateTime: Date, now = new Date()) => {
  return getMeetingChatExpiresAt(dateTime).getTime() < now.getTime();
};
