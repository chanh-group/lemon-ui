import { describe, expect, it } from 'vitest'
import {
  STORY_MAX_MEDIA_BYTES,
  STORY_MAX_VIDEO_SECONDS,
  STORY_MAX_VIDEO_INPUT_BYTES,
  STORY_MAX_TRIM_SECONDS,
} from '../constants'
import {
  buildStoryVideoArgs,
  clampTrimStart,
  isVideoDurationKnown,
  maxTrimStartSeconds,
  planStoryVideo,
  toStoryDurationMs,
} from './storyVideo'

const MIB = 1024 * 1024

describe('constants', () => {
  it('exposes the story media limits', () => {
    expect(STORY_MAX_MEDIA_BYTES).toBe(25 * MIB)
    expect(STORY_MAX_VIDEO_INPUT_BYTES).toBe(100 * MIB)
    expect(STORY_MAX_VIDEO_SECONDS).toBe(60)
    expect(STORY_MAX_TRIM_SECONDS).toBe(59.9)
  })
})

describe('planStoryVideo', () => {
  it('shares a small, short video', () => {
    expect(planStoryVideo({ sizeBytes: 10 * MIB, durationSeconds: 30 })).toBe('share')
  })

  it('shares a video exactly at both limits', () => {
    expect(planStoryVideo({ sizeBytes: 25 * MIB, durationSeconds: 60 })).toBe('share')
  })

  it('processes a video one byte over the size limit', () => {
    expect(planStoryVideo({ sizeBytes: 25 * MIB + 1, durationSeconds: 30 })).toBe('process')
  })

  it('trims a video slightly over the duration limit', () => {
    expect(planStoryVideo({ sizeBytes: 10 * MIB, durationSeconds: 60.1 })).toBe('trim')
  })

  it('processes a video with unknown duration', () => {
    expect(planStoryVideo({ sizeBytes: 10 * MIB, durationSeconds: null })).toBe('process')
  })
})

describe('isVideoDurationKnown', () => {
  it.each([null, undefined, 0, -1, NaN, Infinity])('rejects %p', (value) => {
    expect(isVideoDurationKnown(value)).toBe(false)
  })

  it.each([0.1, 60])('accepts %p', (value) => {
    expect(isVideoDurationKnown(value)).toBe(true)
  })
})

describe('maxTrimStartSeconds', () => {
  it('is zero when the video fits without trimming', () => {
    expect(maxTrimStartSeconds(60)).toBe(0)
  })

  it('leaves the tail of a 61 second video trimmable', () => {
    expect(maxTrimStartSeconds(61)).toBeCloseTo(1.1)
  })

  it('handles longer videos', () => {
    expect(maxTrimStartSeconds(120.5)).toBeCloseTo(60.6)
  })
})

describe('clampTrimStart', () => {
  it('never goes negative', () => {
    expect(clampTrimStart(120, -3)).toBe(0)
  })

  it('never goes past the maximum start', () => {
    expect(clampTrimStart(120.5, 999)).toBe(maxTrimStartSeconds(120.5))
  })

  it('rounds to the slider step of 0.1 seconds', () => {
    expect(clampTrimStart(120, 1.234)).toBe(1.2)
  })
})

describe('toStoryDurationMs', () => {
  it('rounds up to whole milliseconds', () => {
    expect(toStoryDurationMs(0.12)).toBe(120)
  })

  it('converts larger values', () => {
    expect(toStoryDurationMs(59.5)).toBe(59500)
  })

  it('keeps exactly 60 seconds', () => {
    expect(toStoryDurationMs(60)).toBe(60000)
  })

  it('clamps above 60 seconds', () => {
    expect(toStoryDurationMs(60.4)).toBe(60000)
  })
})

describe('buildStoryVideoArgs', () => {
  it('builds the deterministic ffmpeg argument list', () => {
    expect(buildStoryVideoArgs(0)).toEqual([
      '-ss',
      '0',
      '-i',
      'input',
      '-t',
      '59.9',
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-vf',
      "scale='trunc(min(1080,iw)/2)*2':-2",
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-b:v',
      '2400k',
      '-maxrate',
      '2800k',
      '-bufsize',
      '5600k',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      'output.mp4',
    ])
  })
})
