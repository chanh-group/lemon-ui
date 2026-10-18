/** Băm email thành username gợi ý: local-part, thường hóa, chỉ [a-z0-9._-]. */
export function usernameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const cleaned = local
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+/, '')
    .slice(0, 30)
  return cleaned || 'user'
}
