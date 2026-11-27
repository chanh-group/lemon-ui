import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import { ApiError } from '@/infrastructure/api/errors'
import { FRIEND_STALE_MS, USER_SEARCH_MIN_LENGTH } from '@/config/constants'
import type { ConversationResponse } from '@/features/conversation/types/conversation.types'
import type { FriendRequest } from '../types/friend.types'
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  declineFriendRequest,
  findUserByEmail,
  findUserByUsername,
  getFriends,
  getFriendRequests,
  removeFriend,
  sendFriendRequest,
} from '@/features/friend/api/friend.api'

const FRIEND_REQUESTS_KEY = queryKeys.chat.friendRequests
const FRIENDS_KEY = queryKeys.chat.friends

/** Kiểm tra lỗi FRIEND_REQUEST_NOT_FOUND khi server hoặc pub/sub không tìm thấy lời mời. */
export function isFriendRequestNotFoundError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ApiError) {
    return error.code === 'FRIEND_REQUEST_NOT_FOUND' || error.status === 404
  }
  if (typeof error === 'object') {
    const err = error as {
      code?: string
      status?: number
      response?: { status?: number; data?: { code?: string } }
    }
    return (
      err.code === 'FRIEND_REQUEST_NOT_FOUND' ||
      err.status === 404 ||
      err.response?.status === 404 ||
      err.response?.data?.code === 'FRIEND_REQUEST_NOT_FOUND'
    )
  }
  return false
}

/** Lời mời kết bạn:incoming chờ xử lý + outgoing đang chờ đối phương. */
export function useFriendRequests() {
  return useQuery({
    queryKey: FRIEND_REQUESTS_KEY,
    queryFn: getFriendRequests,
    staleTime: FRIEND_STALE_MS,
  })
}

export function useFriends() {
  return useQuery({
    queryKey: FRIENDS_KEY,
    queryFn: getFriends,
    staleTime: FRIEND_STALE_MS,
  })
}

function useInvalidateFriendData() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: FRIEND_REQUESTS_KEY }),
      qc.invalidateQueries({ queryKey: FRIENDS_KEY }),
      qc.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
    ])
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: sendFriendRequest, onSuccess: invalidate })
}

function removeCachedRequest(qc: QueryClient, requestId: string) {
  qc.setQueryData<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
    FRIEND_REQUESTS_KEY,
    (old) => {
      if (!old) return old
      return {
        ...old,
        incoming: old.incoming.filter((request) => request.id !== requestId),
        outgoing: old.outgoing.filter((request) => request.id !== requestId),
      }
    },
  )
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  const invalidate = useInvalidateFriendData()
  return useMutation({
    mutationFn: acceptFriendRequest,
    onError: (error, requestId) => {
      if (isFriendRequestNotFoundError(error)) removeCachedRequest(qc, requestId)
    },
    onSuccess: (conversation, requestId) => {
      removeCachedRequest(qc, requestId)
      qc.setQueryData<ConversationResponse[]>(queryKeys.chat.conversations, (current) => {
        if (!current) return [conversation]
        if (current.some((item) => item.id === conversation.id)) {
          return current.map((item) => (item.id === conversation.id ? conversation : item))
        }
        return [conversation, ...current]
      })
    },
    onSettled: () => void invalidate(),
  })
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient()
  const invalidate = useInvalidateFriendData()
  return useMutation({
    mutationFn: declineFriendRequest,
    onError: (error, requestId) => {
      if (isFriendRequestNotFoundError(error)) removeCachedRequest(qc, requestId)
    },
    onSuccess: (_data, requestId) => removeCachedRequest(qc, requestId),
    onSettled: () => void invalidate(),
  })
}

export function useCancelFriendRequest() {
  const qc = useQueryClient()
  const invalidate = useInvalidateFriendData()
  return useMutation({
    mutationFn: cancelFriendRequest,
    onError: (error, requestId) => {
      if (isFriendRequestNotFoundError(error)) removeCachedRequest(qc, requestId)
    },
    onSuccess: (_data, requestId) => removeCachedRequest(qc, requestId),
    onSettled: () => void invalidate(),
  })
}

export function useRemoveFriend() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: removeFriend, onSuccess: invalidate })
}

export function useBlockUser() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: blockUser, onSuccess: invalidate })
}

export function useFindUserByUsername(query: string) {
  return useQuery({
    queryKey: queryKeys.chat.userSearch('username', query),
    queryFn: () => findUserByUsername(query),
    enabled: query.length >= USER_SEARCH_MIN_LENGTH,
    staleTime: FRIEND_STALE_MS,
  })
}

export function useFindUserByEmail(query: string) {
  return useQuery({
    queryKey: queryKeys.chat.userSearch('email', query),
    queryFn: () => findUserByEmail(query),
    enabled: query.length >= USER_SEARCH_MIN_LENGTH,
    staleTime: FRIEND_STALE_MS,
  })
}
