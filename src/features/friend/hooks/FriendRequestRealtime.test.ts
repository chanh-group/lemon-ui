import { describe, expect, it } from 'vitest'
import {
  applyFriendRequestCreated,
  applyFriendRequestCancelled,
  applyFriendRemoved,
  type FriendRequestCreatedEvent,
  type FriendRequestCancelledEvent,
} from './FriendRequestRealtime'
import type { ChatUser, FriendRequest } from '../types/friend.types'

const baseFriendRequest: FriendRequest = {
  id: 'req-1',
  user: {
    id: 'user-1',
    name: 'Alice',
    username: 'alice.01',
  },
  direction: 'incoming',
  createdAt: '2026-11-18T10:00:00.000Z',
}

describe('applyFriendRequestCreated', () => {
  it('adds incoming friend request to the beginning of the list', () => {
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [],
    }

    const event: FriendRequestCreatedEvent = {
      id: 'req-2',
      user: {
        id: 'user-2',
        name: 'Bob',
        username: 'bob.02',
      },
    }

    const result = applyFriendRequestCreated(current, event)
    expect(result).toBeDefined()
    expect(result?.incoming).toHaveLength(2)
    expect(result?.incoming[0].id).toBe('req-2')
    expect(result?.incoming[0].user.name).toBe('Bob')
    expect(result?.incoming[0].direction).toBe('incoming')
  })

  it('deduplicates friend request if ID already exists in incoming', () => {
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [],
    }

    const event: FriendRequestCreatedEvent = {
      id: 'req-1',
      user: {
        id: 'user-1',
        name: 'Alice Updated',
        username: 'alice.01',
      },
    }

    const result = applyFriendRequestCreated(current, event)
    expect(result).toBe(current)
    expect(result?.incoming).toHaveLength(1)
  })

  it('initializes list with incoming request if current cache is undefined', () => {
    const event: FriendRequestCreatedEvent = {
      id: 'req-1',
      user: {
        id: 'user-1',
        name: 'Alice',
        username: 'alice.01',
      },
    }

    const result = applyFriendRequestCreated(undefined, event)
    expect(result.incoming).toHaveLength(1)
    expect(result.incoming[0].id).toBe('req-1')
    expect(result.outgoing).toEqual([])
  })
})

describe('applyFriendRequestCancelled', () => {
  it('removes the cancelled request from incoming list', () => {
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [],
    }

    const event: FriendRequestCancelledEvent = {
      requestId: 'req-1',
      requesterId: 'user-1',
    }

    const result = applyFriendRequestCancelled(current, event)
    expect(result).toBeDefined()
    expect(result?.incoming).toHaveLength(0)
  })

  it('keeps current list if requestId is not found', () => {
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [],
    }

    const event: FriendRequestCancelledEvent = {
      requestId: 'req-999',
      requesterId: 'user-999',
    }

    const result = applyFriendRequestCancelled(current, event)
    expect(result?.incoming).toHaveLength(1)
  })
})

describe('applyFriendRemoved', () => {
  it('removes friend from friends list by ID', () => {
    const friends: ChatUser[] = [
      { id: 'friend-1', name: 'Friend One', username: 'friend.1' },
      { id: 'friend-2', name: 'Friend Two', username: 'friend.2' },
    ]

    const result = applyFriendRemoved(friends, 'friend-1')
    expect(result).toHaveLength(1)
    expect(result?.[0].id).toBe('friend-2')
  })

  it('returns undefined if current friends list is undefined', () => {
    expect(applyFriendRemoved(undefined, 'friend-1')).toBeUndefined()
  })
})
