export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  bio: true,
  city: true,
  interests: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const participantUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;
