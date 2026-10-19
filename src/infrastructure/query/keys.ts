/** Query key factory — mọi key tập trung, cấm string lẻ trong features. */
export const queryKeys = {
  me: ['me'] as const,
  stories: ['stories'] as const,
  friendRequests: ['friend-requests'] as const,
  userByUsername: (username: string) => ['user', 'username', username] as const,
  userByEmail: (email: string) => ['user', 'email', email] as const,
}
