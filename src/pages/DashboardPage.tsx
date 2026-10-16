import { ChatShell } from '@/features/chat/components/ChatShell'

/**
 * Màn hình chat chính (route /messages).
 * Render ChatShell 3-pane: SideNav | Danh sách | Hội thoại.
 * Auth / routing / OTP giữ nguyên — file này chỉ thay placeholder cũ.
 */
export function DashboardPage() {
  return <ChatShell />
}
