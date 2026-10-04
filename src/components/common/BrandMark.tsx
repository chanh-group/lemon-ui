import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
  /** Bật animation trôi nổi + typing dots */
  animated?: boolean
}

/**
 * Logo LemonChat: quả chanh cách điệu thành bong bóng chat
 * (thân chanh có núm hai bên + đuôi bong bóng, trong lòng là 3 chấm đang gõ).
 */
export function BrandMark({ className, animated = true }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="LemonChat"
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id="lemonBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="lemonShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g transform="rotate(-8 48 48)">
        {/* Thân chanh — hình bầu dục hơi bẹp như quả chanh */}
        <ellipse cx="48" cy="46" rx="34" ry="27" fill="url(#lemonBody)" />

        {/* Núm chanh hai bên */}
        <path d="M14 46 L6 42 L7 46 L6 50 Z" fill="#eab308" />
        <path d="M82 46 L90 42 L89 46 L90 50 Z" fill="#eab308" />

        {/* Đuôi bong bóng chat phía dưới */}
        <path d="M34 68 Q32 82 22 86 Q36 84 42 72 Z" fill="#eab308" />

        {/* Bóng sáng trên vỏ chanh */}
        <ellipse cx="36" cy="33" rx="14" ry="8" fill="url(#lemonShine)" transform="rotate(-18 36 33)" />

        {/* 3 chấm "đang gõ" trong lòng bong bóng */}
        <circle
          cx="36"
          cy="47"
          r="4.2"
          fill="#1c1917"
          className={animated ? 'animate-typing-dot' : undefined}
          style={animated ? { animationDelay: '0ms' } : undefined}
        />
        <circle
          cx="48"
          cy="47"
          r="4.2"
          fill="#1c1917"
          className={animated ? 'animate-typing-dot' : undefined}
          style={animated ? { animationDelay: '180ms' } : undefined}
        />
        <circle
          cx="60"
          cy="47"
          r="4.2"
          fill="#1c1917"
          className={animated ? 'animate-typing-dot' : undefined}
          style={animated ? { animationDelay: '360ms' } : undefined}
        />
      </g>
    </svg>
  )
}
