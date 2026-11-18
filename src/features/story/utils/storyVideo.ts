import {
  STORY_MAX_MEDIA_BYTES,
  STORY_MAX_TRIM_SECONDS,
  STORY_MAX_VIDEO_SECONDS,
} from '../constants'

export type StoryVideoPlan = 'share' | 'trim' | 'process'

export function isVideoDurationKnown(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function planStoryVideo(input: {
  sizeBytes: number
  durationSeconds: number | null
}): StoryVideoPlan {
  if (!isVideoDurationKnown(input.durationSeconds)) return 'process'
  // duration before size: 'trim' opens the slider, both paths encode anyway.
  if (input.durationSeconds > STORY_MAX_VIDEO_SECONDS) return 'trim'
  if (input.sizeBytes > STORY_MAX_MEDIA_BYTES) return 'process'
  return 'share'
}

export function maxTrimStartSeconds(durationSeconds: number): number {
  // 60 - 59.9 floats to 0.1, so clamp at the limit instead of subtracting.
  if (durationSeconds <= STORY_MAX_VIDEO_SECONDS) return 0
  return Math.round((durationSeconds - STORY_MAX_TRIM_SECONDS) * 10) / 10
}

export function clampTrimStart(durationSeconds: number, startSeconds: number): number {
  const rounded = Math.round(Math.max(0, startSeconds) * 10) / 10
  return Math.min(maxTrimStartSeconds(durationSeconds), rounded)
}

export function toStoryDurationMs(durationSeconds: number): number {
  return Math.max(1, Math.min(Math.ceil(durationSeconds * 1000), STORY_MAX_VIDEO_SECONDS * 1000))
}
