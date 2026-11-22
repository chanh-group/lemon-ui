export const STORY_MAX_MEDIA_BYTES = 25 * 1024 * 1024
export const STORY_MAX_VIDEO_INPUT_BYTES = 100 * 1024 * 1024
export const STORY_MAX_VIDEO_SECONDS = 60
export const STORY_MAX_TRIM_SECONDS = 59.9

/** UI-only text story limit, intentionally stricter than caption. */
export const TEXT_STORY_MAX_LENGTH = 140
/** Video bitrate khi encode story video (bps). */
export const STORY_VIDEO_BITRATE = 2400000
/** Audio bitrate khi encode story video (bps). */
export const STORY_AUDIO_BITRATE = 96000
/** Fallback hạn mức lưu trữ story khi backend không trả về (512 MiB). */
export const STORY_STORAGE_FALLBACK_BYTES = 512 * 1024 * 1024
/** Thời gian coi URL media story là tươi (ms). */
export const STORY_MEDIA_STALE_MS = 4 * 60_000
