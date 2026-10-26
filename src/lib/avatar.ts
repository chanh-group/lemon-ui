const AVATAR_BG = ['#F1E9A8', '#DDF4A7', '#EFEAD6', '#F6DFA8', '#E4EED2', '#FBF3C4']

/** Màu nền ổn định theo tên — cùng một người luôn cùng một màu. */
export function avatarColor(name?: string | null): string {
  const safeName = (name || 'User').trim()
  let hash = 0
  for (let i = 0; i < safeName.length; i++) hash = (hash * 31 + safeName.charCodeAt(i)) >>> 0
  return AVATAR_BG[hash % AVATAR_BG.length]
}

/** Chữ cái đầu của tên; tên một từ lấy hai ký tự đầu. */
export function initials(name?: string | null): string {
  const safeName = (name || 'U').trim()
  if (!safeName) return 'U'
  const parts = safeName.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
