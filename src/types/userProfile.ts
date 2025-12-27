export type UserProfile = {
  username: string;
  bio: string;
  avatarUrl: string;
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  username: 'Painter',
  bio: 'Miniature painter & hobbyist',
  avatarUrl: '',
};
