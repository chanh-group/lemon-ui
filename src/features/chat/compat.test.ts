import { describe, expect, it } from 'bun:test'
import { findUserByUsername, presignFile } from './api/chat.api'
import { listStories } from './api/stories.api'
import { ChatShell } from './components/ChatShell'
import { ConversationView } from './components/conversation'
import { MainPane } from './components/new-chat/MainPane'
import { NewChatView } from './components/new-chat'
import { useChatRealtime } from './hooks/useChatRealtime'
import { useConversationsQuery, useSendMessageMutation } from './hooks/useChatQueries'
describe('legacy chat imports', () => {
  it('re-exports the former API, hook, and component entry points', () => {
    const legacyExports = [
      findUserByUsername,
      presignFile,
      listStories,
      ChatShell,
      ConversationView,
      MainPane,
      NewChatView,
      useChatRealtime,
      useConversationsQuery,
      useSendMessageMutation,
    ]

    expect(legacyExports.every((value) => typeof value === 'function')).toBe(true)
  })
})
