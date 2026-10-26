/** Query key factory — mọi key tập trung, cấm string lẻ trong features. */
export const queryKeys = {
  me: ['me'] as const,
  stories: ['stories'] as const,
  friendRequests: ['friend-requests'] as const,
  userByUsername: (username: string) => ['user', 'username', username] as const,
  userByEmail: (email: string) => ['user', 'email', email] as const,
  chat: {
    conversations: ['chat', 'conversations'] as const,
    conversation: (conversationId: string) => ['chat', 'conversation', conversationId] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
    liveMessages: (conversationId: string) => ['chat', 'live-messages', conversationId] as const,
    stories: ['chat', 'stories'] as const,
    friendRequests: ['chat', 'friend-requests'] as const,
    friends: ['chat', 'friends'] as const,
    userSearch: (field: 'username' | 'email', query: string) => ['chat', 'user-search', field, query] as const,
  },
}
