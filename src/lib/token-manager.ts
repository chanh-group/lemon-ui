/**
 * Access token chỉ sống trong memory (RAM) — không ghi localStorage/sessionStorage.
 * Mất khi F5/đóng tab → khôi phục bằng silent refresh (cookie httpOnly chứa refresh token).
 */
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
