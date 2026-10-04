import { useEffect, useRef } from 'react'

/* Tham số chuyển động — chỉnh tập trung tại đây, không rải magic number */
const GLIDE = 0.16 // độ bám chuột (0–1): cao hơn = bám sát hơn
const STRETCH_MAX = 0.45 // kéo giãn tối đa khi di chuyển (tỷ lệ)
const STRETCH_FULL_SPEED = 180 // tốc độ đạt giãn tối đa (px mỗi frame)
const STOP_EPSILON = 0.5 // dưới ngưỡng này coi như đã dừng
const ROTATE_EPSILON = 0.6 // chỉ đổi góc khi di chuyển thật sự
const BAR_OVERLAP = 0.02 // thanh giữa dài hơn một chút để mối nối kín (không hở AA)

interface CursorGlowProps {
  /** Override kích thước/màu cho 3 mảnh (vd: 'size-40 bg-primary') */
  className?: string
}

/**``
 * Vết loang vàng chanh bám theo con trỏ — dạng "mực chìm".
 *
 * Hình con nhộng THẬT (không phải elip): 2 hình tròn ở hai đầu +
 * 1 hình chữ nhật ở giữa tạo cạnh song song. Đứng yên = hai tròn chồng
 * nhau (thành hình tròn), di chuyển = tách ra theo hướng đi.
 *
 * Tối ưu render: cả 3 mảnh chỉ nhận transform (GPU, không layout),
 * không setState, rAF tự tắt khi đứng yên, listener passive,
 * tắt trên touch/reduced-motion.
 */
export function CursorGlow({ className = 'size-64 bg-lemon-400' }: CursorGlowProps) {
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

      if (speed > ROTATE_EPSILON) {
        angle = (Math.atan2(dy, dx) * 180) / Math.PI
      }

      // Gốc: di chuyển + xoay theo hướng đi
      root.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) rotate(${angle}deg)`

      // Nửa khoảng tách giữa 2 đầu tròn (quy đổi theo % bề rộng của tròn)
      const halfGap = ((stretch - 1) / 2) * 100

      if (stretch <= 1 + 0.001) {
        // Đứng yên: ẩn hẳn thanh giữa, 2 tròn chồng khít thành hình tròn hoàn hảo
        bar.style.transform = `translate(-50%, -50%) scaleX(0)`
        capStart.style.transform = `translate(-50%, -50%)`
        capEnd.style.transform = `translate(-50%, -50%)`
      } else {
        // Di chuyển: hiện thanh giữa + tách 2 đầu tròn
        bar.style.transform = `translate(-50%, -50%) scaleX(${stretch - 1 + BAR_OVERLAP})`
        // 2 tròn đầu: chỉ translate — không scale nên không bao giờ thành elip
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
        // Về lại hình tròn chuẩn khi dừng hẳn
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
        root.dataset.state = 'on'
      }

      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    const onLeave = () => {
      root.dataset.state = 'off'
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
      className="pointer-events-none fixed top-0 left-0 z-40 opacity-0 mix-blend-multiply transition-opacity duration-300 will-change-transform data-[state=on]:opacity-50"
    >
      {/* Thanh chữ nhật giữa — tạo cạnh song song của con nhộng */}
      <div ref={barRef} className={`absolute top-0 left-0 ${className}`} />

      {/* Hai đầu tròn — luôn giữ nguyên hình tròn (chỉ translate) */}
      <div ref={capStartRef} className={`absolute top-0 left-0 rounded-full ${className}`} />
      <div ref={capEndRef} className={`absolute top-0 left-0 rounded-full ${className}`} />
    </div>
  )
}
