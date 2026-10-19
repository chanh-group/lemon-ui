import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  createGroup,
  declineFriendRequest,
  findUserByEmail,
  findUserByUsername,
  getFriendRequests,
  removeFriend,
  sendFriendRequest,
} from '../api/chat.api'

const FRIEND_REQUESTS_KEY = ['chat', 'friend-requests'] as const

/** Lời mời kết bạn:incoming chờ xử lý + outgoing đang chờ đối phương. */
export function useFriendRequests() {
  return useQuery({ queryKey: FRIEND_REQUESTS_KEY, queryFn: getFriendRequests, staleTime: 30_000 })
}

function useInvalidateFriendRequests() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: FRIEND_REQUESTS_KEY })
}

export function useSendFriendRequest() {
  const invalidate = useInvalidateFriendRequests()
  return useMutation({ mutationFn: sendFriendRequest, onSuccess: invalidate })
}

export function useAcceptFriendRequest() {
  const invalidate = useInvalidateFriendRequests()
  return useMutation({ mutationFn: acceptFriendRequest, onSuccess: invalidate })
}

export function useDeclineFriendRequest() {
  const invalidate = useInvalidateFriendRequests()
  return useMutation({ mutationFn: declineFriendRequest, onSuccess: invalidate })
}

export function useCancelFriendRequest() {
  const invalidate = useInvalidateFriendRequests()
  return useMutation({ mutationFn: cancelFriendRequest, onSuccess: invalidate })
}

export function useRemoveFriend() {
  return useMutation({ mutationFn: removeFriend })
}

export function useBlockUser() {
  return useMutation({ mutationFn: blockUser })
}

export function useCreateGroup() {
  return useMutation({ mutationFn: createGroup })
}

export function useFindUserByUsername(query: string) {
  return useQuery({
    queryKey: ['chat', 'user-search', 'username', query],
    queryFn: () => findUserByUsername(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}

export function useFindUserByEmail(query: string) {
  return useQuery({
    queryKey: ['chat', 'user-search', 'email', query],
    queryFn: () => findUserByEmail(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
