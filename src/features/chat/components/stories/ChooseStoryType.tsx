import { useTranslation } from 'react-i18next'
import { ImagePlusIcon as MediaGlyphData, TextCreationIcon as TextGlyphData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const MediaGlyph = createIcon(MediaGlyphData)
const TextGlyph = createIcon(TextGlyphData)

interface ChooseStoryTypeProps {
  onPickMedia: () => void
  onPickText: () => void
}

/** Bước 1 — 2 thẻ kiểu Facebook: ảnh/video (xanh) và văn bản (hồng). */
export function ChooseStoryType({ onPickMedia, onPickText }: ChooseStoryTypeProps) {
  const { t } = useTranslation()
  const cards = [
    {
      key: 'media',
      gradient: 'from-blue-500 via-cyan-500 to-sky-300',
      icon: MediaGlyph,
      label: t('chat.createStoryOptionMedia'),
      onClick: onPickMedia,
    },
    {
      key: 'text',
      gradient: 'from-fuchsia-500 via-purple-500 to-rose-500',
      icon: TextGlyph,
      label: t('chat.createStoryOptionText'),
      onClick: onPickText,
    },
  ] as const

  return (
    <div className="grid h-full place-items-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 sm:flex-row sm:justify-center">
        {cards.map(({ key, gradient, icon: Icon, label, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={`flex aspect-[3/4] w-full max-w-52 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl bg-linear-to-br ${gradient} p-6 text-center shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95`}
          >
            <span className="grid size-20 place-items-center rounded-full bg-white/90 text-foreground shadow-md lg:size-24">
              <Icon className="size-8 lg:size-9" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-bold text-white drop-shadow-sm lg:text-base">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
