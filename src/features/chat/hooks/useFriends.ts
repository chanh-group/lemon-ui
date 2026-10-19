import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  createGroup,
  declineFriendRequest,
  findUserByEmail,
  findUserByUsername,
  getFriends,
  getFriendRequests,
  removeFriend,
  sendFriendRequest,
} from '../api/chat.api'

const FRIEND_REQUESTS_KEY = queryKeys.chat.friendRequests
const FRIENDS_KEY = queryKeys.chat.friends

/** Lời mời kết bạn:incoming chờ xử lý + outgoing đang chờ đối phương. */
export function useFriendRequests() {
  return useQuery({ queryKey: FRIEND_REQUESTS_KEY, queryFn: getFriendRequests, staleTime: 30_000 })
}

export function useFriends() {
  return useQuery({ queryKey: FRIENDS_KEY, queryFn: getFriends, staleTime: 30_000 })
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

export function useAcceptFriendRequest() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: acceptFriendRequest, onSuccess: invalidate })
}

export function useDeclineFriendRequest() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: declineFriendRequest, onSuccess: invalidate })
}

export function useCancelFriendRequest() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: cancelFriendRequest, onSuccess: invalidate })
}

export function useRemoveFriend() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: removeFriend, onSuccess: invalidate })
}

export function useBlockUser() {
  const invalidate = useInvalidateFriendData()
  return useMutation({ mutationFn: blockUser, onSuccess: invalidate })
}

export function useCreateGroup() {
  return useMutation({ mutationFn: createGroup })
}

export function useFindUserByUsername(query: string) {
  return useQuery({
    queryKey: queryKeys.chat.userSearch('username', query),
    queryFn: () => findUserByUsername(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}

export function useFindUserByEmail(query: string) {
  return useQuery({
    queryKey: queryKeys.chat.userSearch('email', query),
    queryFn: () => findUserByEmail(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })
}
