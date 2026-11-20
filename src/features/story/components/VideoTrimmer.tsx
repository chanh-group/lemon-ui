import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { STORY_MAX_TRIM_SECONDS, STORY_MAX_VIDEO_SECONDS } from '../constants'

interface Props {
  url: string
  duration: number
  start: number
  end: number
  disabled: boolean
  currentTime: number
  onSeek: (time: number) => void
  onChange: (start: number, end: number) => void
}

export function VideoTrimmer({
  url,
  duration,
  start,
  end,
  disabled,
  currentTime,
  onSeek,
  onChange,
}: Props) {
  const { t } = useTranslation()
  const [frames, setFrames] = useState<string[]>([])
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | 'playhead' | null>(null)
  const pointerTime = (event: PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || !rect.width) return 0
    return Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration))
  }
  const move = (kind: 'start' | 'end' | 'playhead', value: number) => {
    if (kind === 'playhead') return onSeek(Math.max(start, Math.min(end, value)))
    if (kind === 'start') {
      if (duration > STORY_MAX_VIDEO_SECONDS) {
        const next = Math.max(0, Math.min(duration - STORY_MAX_TRIM_SECONDS, value))
        onChange(next, next + STORY_MAX_TRIM_SECONDS)
      } else {
        const next = Math.max(0, Math.min(end - 1, value))
        onChange(next, Math.min(end, next + STORY_MAX_TRIM_SECONDS))
      }
    } else
      onChange(
        start,
        Math.min(duration, Math.max(start + 1, Math.min(start + STORY_MAX_TRIM_SECONDS, value))),
      )
  }
  const begin =
    (kind: 'start' | 'end' | 'playhead') => (event: PointerEvent<HTMLButtonElement>) => {
      if (disabled) return
      event.stopPropagation()
      dragging.current = kind
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  useEffect(() => {
    let cancelled = false
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = url
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 48
    const draw = async () => {
      const result: string[] = []
      for (let i = 0; i < 20 && !cancelled; i++) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 1500)
          video.onseeked = () => {
            window.clearTimeout(timer)
            resolve()
          }
          video.currentTime = Math.min(duration - 0.05, (duration * (i + 0.5)) / 20)
        })
        if (cancelled) break
        try {
          canvas.getContext('2d')?.drawImage(video, 0, 0, 64, 48)
          result.push(canvas.toDataURL('image/jpeg', 0.6))
        } catch {
          break
        }
      }
      if (!cancelled) setFrames(result)
    }
    video.onloadedmetadata = () => {
      void draw()
    }
    return () => {
      cancelled = true
      video.removeAttribute('src')
      video.load()
    }
  }, [url, duration])
  return (
    <div className="w-full space-y-2 text-sm text-foreground">
      <div
        ref={trackRef}
        className="relative h-12 touch-none rounded-lg bg-muted"
        onPointerDown={(event) => {
          if (!disabled) onSeek(Math.max(start, Math.min(end, pointerTime(event))))
        }}
      >
        <div className="flex h-full overflow-hidden rounded-lg" aria-hidden="true">
          {frames.map((frame, i) => (
            <img key={i} src={frame} alt="" className="h-full min-w-0 flex-1 object-cover" />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-black/60"
          style={{ width: `${(start / duration) * 100}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-black/60"
          style={{ width: `${(1 - end / duration) * 100}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-primary"
          style={{
            left: `${(start / duration) * 100}%`,
            width: `${((end - start) / duration) * 100}%`,
          }}
        />
        {(['start', 'end', 'playhead'] as const).map((kind) => {
          const value = kind === 'start' ? start : kind === 'end' ? end : currentTime
          const min =
            kind === 'end'
              ? start + 1
              : kind === 'playhead'
                ? start
                : duration > STORY_MAX_VIDEO_SECONDS
                  ? 0
                  : Math.max(0, end - STORY_MAX_TRIM_SECONDS)
          const max =
            kind === 'start'
              ? duration > STORY_MAX_VIDEO_SECONDS
                ? duration - STORY_MAX_TRIM_SECONDS
                : end - 1
              : kind === 'playhead'
                ? end
                : Math.min(duration, start + STORY_MAX_TRIM_SECONDS)
          return (
            <button
              key={kind}
              type="button"
              role="slider"
              aria-label={t(
                kind === 'start'
                  ? 'chat.storyTrimStart'
                  : kind === 'end'
                    ? 'chat.storyTrimEnd'
                    : 'chat.storyTrimPlayhead',
              )}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={Math.max(min, Math.min(max, value))}
              disabled={disabled}
              className={`absolute top-0 ${kind === 'playhead' ? 'z-10' : 'z-20'} flex h-12 w-11 -translate-x-1/2 touch-none items-center justify-center focus-visible:outline-2 focus-visible:outline-primary`}
              style={{ left: `${Math.max(0, Math.min(1, value / duration)) * 100}%` }}
              onPointerDown={begin(kind)}
              onPointerMove={(event) => {
                if (
                  dragging.current === kind &&
                  event.currentTarget.hasPointerCapture(event.pointerId)
                )
                  move(kind, pointerTime(event))
              }}
              onPointerUp={() => {
                dragging.current = null
              }}
              onPointerCancel={() => {
                dragging.current = null
              }}
              onKeyDown={(event) => {
                const delta =
                  event.key === 'ArrowLeft' || event.key === 'ArrowDown'
                    ? -0.1
                    : event.key === 'ArrowRight' || event.key === 'ArrowUp'
                      ? 0.1
                      : 0
                if (delta) {
                  event.preventDefault()
                  move(kind, Math.max(min, Math.min(max, value + delta)))
                }
              }}
            >
              <span
                className={
                  kind === 'playhead'
                    ? 'h-full w-0.5 bg-white shadow'
                    : 'h-full w-3 rounded-full bg-primary shadow'
                }
              />
            </button>
          )
        })}
      </div>
      <p>
        {t('chat.storyTrimRange', { start: start.toFixed(1), end: end.toFixed(1) })} ·{' '}
        {(end - start).toFixed(1)}s
      </p>
    </div>
  )
}
