import type { StoryEntry } from '../types/chat.types'

/** Hồ sơ tối thiểu cần để dựng nhãn tác giả (khớp với AuthUser). */
export interface StoryAuthorProfile {
  id: string
  fullName?: string | null
  username?: string | null
  avatarUrl?: string | null
}

/**
 * Tên/avatar hiển thị cho một story trong kho lưu trữ.
 *
 * Kho lưu trữ chỉ chứa story của chính người dùng (API đánh dấu `mine: true`),
 * nên ưu tiên hồ sơ đang đăng nhập. Nếu session chưa sẵn sàng hoặc story thuộc
 * tác giả khác thì giữ nguyên giá trị từ API để không mất thông tin.
 */
export function resolveArchiveAuthor(
  story: StoryEntry,
  user: StoryAuthorProfile | null | undefined,
): { name: string; authorAvatar?: string | null } {
  if (!user) {
    return { name: story.name, authorAvatar: story.authorAvatar }
  }
  const isOwnStory = story.mine === true || story.authorId === user.id
  if (!isOwnStory) {
    return { name: story.name, authorAvatar: story.authorAvatar }
  }
  return {
    name: user.fullName || user.username || story.name,
    authorAvatar: user.avatarUrl ?? story.authorAvatar,
  }
}
