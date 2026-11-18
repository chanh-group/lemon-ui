import { describe, expect, it } from 'vitest'
import { ApiError } from '@/infrastructure/api/errors'
import { isFriendRequestNotFoundError } from './useFriends'
import {
  applyFriendRequestCreated,
  applyFriendRequestCancelled,
  applyFriendRequestAccepted,
  applyFriendRequestDeclined,
  applyFriendRemoved,
  type FriendRequestCreatedEvent,
  type FriendRequestCancelledEvent,
  type FriendRequestAcceptedEvent,
  type FriendRequestDeclinedEvent,
  type SocketReadyEvent,
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
  it('removes the cancelled request from incoming list and outgoing list', () => {
    const outgoingRequest: FriendRequest = {
      ...baseFriendRequest,
      id: 'req-outgoing-1',
      direction: 'outgoing',
    }
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [outgoingRequest],
    }

    const event: FriendRequestCancelledEvent = {
      requestId: 'req-1',
      requesterId: 'user-1',
    }

    const result = applyFriendRequestCancelled(current, event)
    expect(result).toBeDefined()
    expect(result.incoming).toHaveLength(0)
    expect(result.outgoing).toHaveLength(1)

    const result2 = applyFriendRequestCancelled(current, {
      requestId: 'req-outgoing-1',
      requesterId: 'user-1',
    })
    expect(result2.outgoing).toHaveLength(0)
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

describe('applyFriendRequestAccepted', () => {
  it('removes the recipient from outgoing list by requestId or addresseeId', () => {
    const outgoingRequest: FriendRequest = {
      id: 'req-out-1',
      user: {
        id: 'user-bob',
        name: 'Bob',
        username: 'bob.01',
      },
      direction: 'outgoing',
      createdAt: '2026-11-18T10:00:00.000Z',
    }
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [outgoingRequest],
    }

    const event: FriendRequestAcceptedEvent = {
      requestId: 'req-out-1',
      addresseeId: 'user-bob',
    }

    const result = applyFriendRequestAccepted(current, event)
    expect(result.outgoing).toHaveLength(0)
    // Incoming list is untouched if requestId is different
    expect(result.incoming).toHaveLength(1)
  })

  it('cleans incoming request and badge if accepted request was in incoming', () => {
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [],
    }

    const event: FriendRequestAcceptedEvent = {
      requestId: 'req-1',
      addresseeId: 'user-other',
    }

    const result = applyFriendRequestAccepted(current, event)
    expect(result.incoming).toHaveLength(0)
  })

  it('handles undefined cache gracefully', () => {
    const event: FriendRequestAcceptedEvent = {
      requestId: 'req-1',
      addresseeId: 'user-bob',
    }

    const result = applyFriendRequestAccepted(undefined, event)
    expect(result).toEqual({ incoming: [], outgoing: [] })
  })
})

describe('applyFriendRequestDeclined', () => {
  it('removes the recipient from outgoing list by requestId or addresseeId', () => {
    const outgoingRequest: FriendRequest = {
      id: 'req-out-1',
      user: {
        id: 'user-bob',
        name: 'Bob',
        username: 'bob.01',
      },
      direction: 'outgoing',
      createdAt: '2026-11-18T10:00:00.000Z',
    }
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [outgoingRequest],
    }

    const event: FriendRequestDeclinedEvent = {
      requestId: 'req-out-1',
      addresseeId: 'user-bob',
    }

    const result = applyFriendRequestDeclined(current, event)
    expect(result.outgoing).toHaveLength(0)
  })

  it('cleans incoming request if declined request was in incoming', () => {
    const current = {
      incoming: [baseFriendRequest],
      outgoing: [],
    }

    const event: FriendRequestDeclinedEvent = {
      requestId: 'req-1',
      addresseeId: 'user-other',
    }

    const result = applyFriendRequestDeclined(current, event)
    expect(result.incoming).toHaveLength(0)
  })

  it('handles undefined cache gracefully', () => {
    const event: FriendRequestDeclinedEvent = {
      requestId: 'req-1',
      addresseeId: 'user-bob',
    }

    const result = applyFriendRequestDeclined(undefined, event)
    expect(result).toEqual({ incoming: [], outgoing: [] })
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

describe('SocketReadyEvent', () => {
  it('defines the expected shape for ready event payload', () => {
    const event: SocketReadyEvent = { userId: 'user-1' }
    expect(event.userId).toBe('user-1')
  })
})

describe('isFriendRequestNotFoundError', () => {
  it('returns true for ApiError with FRIEND_REQUEST_NOT_FOUND code or 404 status', () => {
    const errByCode = new ApiError('FRIEND_REQUEST_NOT_FOUND', 400, 'Not found')
    expect(isFriendRequestNotFoundError(errByCode)).toBe(true)

    const errByStatus = new ApiError('NOT_FOUND', 404, 'Not found')
    expect(isFriendRequestNotFoundError(errByStatus)).toBe(true)
  })

  it('returns true for axios error object with 404 or FRIEND_REQUEST_NOT_FOUND', () => {
    expect(isFriendRequestNotFoundError({ response: { status: 404 } })).toBe(true)
    expect(
      isFriendRequestNotFoundError({
        response: { data: { code: 'FRIEND_REQUEST_NOT_FOUND' } },
      }),
    ).toBe(true)
  })

  it('returns false for unrelated errors, null, or undefined', () => {
    expect(isFriendRequestNotFoundError(null)).toBe(false)
    expect(isFriendRequestNotFoundError(undefined)).toBe(false)
    expect(isFriendRequestNotFoundError(new Error('Network error'))).toBe(false)
    expect(isFriendRequestNotFoundError(new ApiError('UNAUTHORIZED', 401, 'Unauthorized'))).toBe(
      false,
    )
  })
})
