import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft01Icon as BackData, ChevronRightIcon as ChevronRightData, Settings01Icon as GearData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Back = createIcon(BackData)
const Gear = createIcon(GearData)
const ChevronRight = createIcon(ChevronRightData)
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import { avatarColor, initials } from '../../data/mockData'
import type { StoryEntry } from '../../types/chat.types'
import type { CreateMediaStoryPayload, CreateTextStoryPayload } from '../../api/stories.api'
import { useCreateMediaStory, useCreateTextStory, useStoriesList } from '../../hooks/useStories'
import { StoryViewer } from '../StoryViewer'
import { SideNav } from '../SideNav'
import { ChooseStoryType } from './ChooseStoryType'
import { TextStoryEditor } from './TextStoryEditor'
import { MediaStoryEditor } from './MediaStoryEditor'
import { StorySettingsModal } from './StorySettingsModal'
import { storyDisplayName, storyTime } from '../../data/storiesData'

type StoryStep = 'choose' | 'media' | 'text'

/** Màn đăng tin (/stories/create) — kiểu Facebook: panel trái "Tin của bạn", view to bên phải. */
export function StoriesCreateView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<StoryStep>('choose')
  const [viewingOwn, setViewingOwn] = useState<StoryEntry | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const createText = useCreateTextStory()
  const createMedia = useCreateMediaStory()

  const userName = user?.fullName ?? 'Nguyên Đào Trọng'
  const backToStories = () => navigate(ROUTES.messages, { state: { tab: 'stories' } })
  const stories = useStoriesList().data ?? []
  const myStories = stories.filter((s) => s.mine)
  const showingEditor = step !== 'choose'

  const shareText = (payload: CreateTextStoryPayload) => {
    createText.mutate(payload, {
      onSuccess: () => {
        toast.success(t('chat.storyCreated'))
        backToStories()
      },
    })
  }

  const shareMedia = (payload: CreateMediaStoryPayload) => {
    createMedia.mutate(payload, {
      onSuccess: () => {
        toast.success(t('chat.storyCreated'))
        backToStories()
      },
    })
  }

  const shareMediaPayload = (mediaKind: 'photo' | 'gif' | 'sticker' | 'video', label: string, captionText: string) =>
    shareMedia({ mediaKind, label, captionText })
  return (
    <main className="flex h-dvh w-full overflow-hidden bg-background pb-16 text-foreground md:pb-0">
      <SideNav active="stories" onOpenSettings={() => navigate(ROUTES.settings)} mobileBarVisible={true} />

      {/* Panel trái — "Tin của bạn" (kiểu Facebook) */}
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col border-r border-border bg-card md:w-88 md:flex-none">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 pt-3">
          <button
            type="button"
            onClick={backToStories}
            aria-label={t('chat.backToList')}
            className="grid size-10 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Back className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{t('chat.yourStory')}</h1>
          <button
            type="button"
            aria-label={t('chat.settingsTitle')}
            onClick={() => setIsSettingsOpen(true)}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <Gear className="size-4.5" aria-hidden="true" />
          </button>
        </header>

        {/* Tài khoản đích */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Avatar className="ring-none size-14">
            <AvatarFallback
              className="text-base font-bold text-foreground"
              style={{ backgroundColor: avatarColor(userName) }}
            >
              {initials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{t('chat.addToStoryHint')}</p>
          </div>
        </div>

        {/* Trên mobile, panel lựa chọn nằm dưới thông tin tài khoản; panel desktop bị ẩn ở breakpoint md. */}
        {step === 'choose' && (
          <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
            <ChooseStoryType onPickMedia={() => setStep('media')} onPickText={() => setStep('text')} />
          </div>
        )}

        {/* Tin đã chia sẻ của mình (nếu có) */}
        {myStories.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <p className="px-4 pb-1 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t('chat.sharedStories')}
            </p>
            <ul className="flex flex-col gap-0.5 px-2">
              {myStories.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setViewingOwn(s)}
                    aria-label={`${t('chat.yourStory')}, ${storyTime(s, t('chat.now'))}`}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-full text-[13px] font-bold text-foreground ring-1 ring-border"
                      style={{ backgroundColor: avatarColor(s.name || userName) }}
                    >
                      {initials(s.name || userName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{storyDisplayName(s, t)}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{storyTime(s, t('chat.now'))}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* View lớn bên phải — nội dung bước đang chọn (kiểu Facebook) */}
      <section
        aria-label={step === 'choose' ? t('chat.createStoryTitle') : t('chat.storyEditor')}
        className="hidden h-full min-h-0 min-w-0 flex-1 overflow-y-auto md:block"
      >
        <div className="mx-auto h-full w-full max-w-2xl">
          {step === 'choose' && <ChooseStoryType onPickMedia={() => setStep('media')} onPickText={() => setStep('text')} />}
          {step === 'text' && (
            <TextStoryEditor onDiscard={() => setStep('choose')} onShare={shareText} isSharing={createText.isPending} />
          )}
          {step === 'media' && <MediaStoryEditor onDiscard={() => setStep('choose')} onShare={shareMediaPayload} isSharing={createMedia.isPending} />}
        </div>
      </section>

      {/* Mobile (<md): editor mở overlay toàn màn */}
      {showingEditor && (
        <div className="fixed inset-x-0 bottom-16 top-0 z-40 overflow-y-auto bg-background md:hidden">
          {step === 'text' ? (
            <TextStoryEditor onDiscard={() => setStep('choose')} onShare={shareText} isSharing={createText.isPending} />
          ) : (
            <MediaStoryEditor onDiscard={() => setStep('choose')} onShare={shareMediaPayload} isSharing={createMedia.isPending} />
          )}
        </div>
      )}

      {/* Xem lại tin của mình từ panel trái */}
      {viewingOwn && <StoryViewer story={viewingOwn} onClose={() => setViewingOwn(null)} />}
      <StorySettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </main>
  )
}
