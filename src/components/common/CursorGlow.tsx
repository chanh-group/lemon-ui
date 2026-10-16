import { useEffect, useRef } from 'react'

const GLIDE = 0.16
const STRETCH_MAX = 0.45
const STRETCH_FULL_SPEED = 180
const STOP_EPSILON = 0.5
const ROTATE_EPSILON = 0.6
const BAR_OVERLAP = 0.02

const GREEN = '#00e676'

interface CursorGlowProps {
  className?: string
}

export function CursorGlow({ className = 'size-56' }: CursorGlowProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const capStartRef = useRef<HTMLDivElement>(null)
  const capEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const bar = barRef.current
    const capStart = capStartRef.current
    const capEnd = capEndRef.current
    if (!root || !bar || !capStart || !capEnd) return

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!finePointer.matches || reduceMotion.matches) return

    let rafId = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let angle = 0
    let started = false

    const render = (dx: number, dy: number) => {
      const speed = Math.hypot(dx, dy)
      const stretch = 1 + Math.min(speed / STRETCH_FULL_SPEED, 1) * STRETCH_MAX
      if (speed > ROTATE_EPSILON) angle = (Math.atan2(dy, dx) * 180) / Math.PI

      root.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${angle}deg)`
      const halfGap = ((stretch - 1) / 2) * 100

      if (stretch <= 1 + 0.001) {
        bar.style.transform = `translate(-50%, -50%) scaleX(0)`
        capStart.style.transform = `translate(-50%, -50%)`
        capEnd.style.transform = `translate(-50%, -50%)`
      } else {
        bar.style.transform = `translate(-50%, -50%) scaleX(${stretch - 1 + BAR_OVERLAP})`
        capStart.style.transform = `translate(-50%, -50%) translateX(-${halfGap}%)`
        capEnd.style.transform = `translate(-50%, -50%) translateX(${halfGap}%)`
      }
    }

    const tick = () => {
      const dx = targetX - currentX
      const dy = targetY - currentY
      currentX += dx * GLIDE
      currentY += dy * GLIDE
      render(dx, dy)

      if (Math.abs(dx) > STOP_EPSILON || Math.abs(dy) > STOP_EPSILON) {
        rafId = requestAnimationFrame(tick)
      } else {
        currentX = targetX
        currentY = targetY
        render(0, 0)
        rafId = 0
      }
    }

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY
      if (!started) {
        started = true
        currentX = targetX
        currentY = targetY
        render(0, 0)
        root.dataset.state = "on"
        root.style.opacity = "0.5"
      }
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    const onLeave = () => {
      root.dataset.state = "off"
      root.style.opacity = "0"
      started = false
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      data-slot="cursor-glow"
      data-state="off"
      className="pointer-events-none fixed top-0 left-0 z-40 opacity-0 transition-opacity duration-300 will-change-transform"
      style={{ opacity: 0 }}
    >
      <div ref={barRef} className={`absolute top-0 left-0 ${className}`} style={{ backgroundColor: GREEN }} />
      <div ref={capStartRef} className={`absolute top-0 left-0 rounded-full ${className}`} style={{ backgroundColor: GREEN }} />
      <div ref={capEndRef} className={`absolute top-0 left-0 rounded-full ${className}`} style={{ backgroundColor: GREEN }} />
    </div>
  )
}
