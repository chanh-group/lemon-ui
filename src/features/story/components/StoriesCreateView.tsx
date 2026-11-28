import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft01Icon as BackData,
  ArchiveIcon as ArchiveData,
  ChevronRightIcon as ChevronRightData,
  Settings01Icon as GearData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Back = createIcon(BackData)
const Archive = createIcon(ArchiveData)
const Gear = createIcon(GearData)
const ChevronRight = createIcon(ChevronRightData)
import { UserAvatar } from '@/components/common/UserAvatar'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import type { StoryEntry } from '@/features/story/types/story.types'
import type {
  CreateMediaStoryPayload,
  CreateTextStoryPayload,
} from '@/features/story/api/stories.api'
import {
  useCreateMediaStory,
  useCreateTextStory,
  useStoriesList,
} from '@/features/story/hooks/useStories'
import { SideNav } from '@/features/shell/components/SideNav'
import { StoryViewer } from '@/features/story/components/StoryViewer'
import { ChooseStoryType } from './ChooseStoryType'
import { TextStoryEditor } from './TextStoryEditor'
import { MediaStoryEditor } from './MediaStoryEditor'
import { StorySettingsModal } from './StorySettingsModal'
import { StoryAudienceSelector, type StoryAudienceMode } from './StoryAudienceSelector'
import { useQuery } from '@tanstack/react-query'
import { getAllStoryAudienceFriends } from '@/features/friend/api/friend.api'
import { storyDisplayName, storyTime } from '@/features/story/data/storiesData'
import { groupStories } from '@/features/story/utils/storyGroups'

type StoryStep = 'choose' | 'media' | 'text'

/** Màn đăng tin (/stories/create) — kiểu Facebook: panel trái "Tin của bạn", view to bên phải. */
export function StoriesCreateView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<StoryStep>('choose')
  const [draftText, setDraftText] = useState('')
  const draftKey = user?.id ? `story-text-draft:${user.id}` : null
  useEffect(() => {
    try {
      setDraftText(draftKey ? (localStorage.getItem(draftKey) ?? '') : '')
    } catch {
      setDraftText('')
    }
  }, [draftKey])
  const changeDraft = (value: string) => {
    setDraftText(value)
    if (!draftKey) return
    try {
      if (value) localStorage.setItem(draftKey, value)
      else localStorage.removeItem(draftKey)
    } catch {
      /* Editing remains available when storage is blocked. */
    }
  }
  const [audienceMode, setAudienceMode] = useState<StoryAudienceMode>('ALL_FRIENDS')
  const [audienceIds, setAudienceIds] = useState<string[]>([])
  const createText = useCreateTextStory()
  const createMedia = useCreateMediaStory()
  const friends = useQuery({
    queryKey: ['story-audience-friends', user?.id],
    queryFn: getAllStoryAudienceFriends,
    enabled: Boolean(user?.id),
  })
  const audienceReady =
    audienceMode === 'ALL_FRIENDS' ||
    (!friends.isLoading &&
      !friends.isError &&
      audienceIds.length > 0 &&
      audienceIds.every((id) => friends.data?.some((friend) => friend.id === id)))
  const audience = {
    audienceMode,
    audienceUserIds: audienceMode === 'ALL_FRIENDS' ? undefined : audienceIds,
  }
  const selector = (
    <StoryAudienceSelector
      mode={audienceMode}
      selected={audienceIds}
      friends={friends.data ?? []}
      loading={friends.isLoading}
      error={friends.isError}
      disabled={createText.isPending || createMedia.isPending}
      onChange={(mode, ids) => {
        setAudienceMode(mode)
        setAudienceIds(ids)
      }}
    />
  )
  const [viewingOwn, setViewingOwn] = useState<StoryEntry | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mediaControls, setMediaControls] = useState<HTMLDivElement | null>(null)

  const userName = user?.fullName ?? user?.username ?? 'Lemon User'
  const backToStories = () => navigate(ROUTES.messages, { state: { tab: 'stories' } })
  const stories = useStoriesList(user?.id).data ?? []
  const myStories = stories.filter((s) => s.mine)
  const myGroup = groupStories(myStories)[0]
  const showingEditor = step !== 'choose'

  const shareText = (payload: CreateTextStoryPayload) => {
    if (!audienceReady) {
      toast.error(t('chat.storyAudienceRequired'))
      return
    }
    createText.mutate(
      { ...payload, ...audience },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => {
          changeDraft('')
          toast.success(t('chat.storyCreated'))
          backToStories()
        },
      },
    )
  }

  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null)

  const shareMedia = (payload: CreateMediaStoryPayload) => {
    if (!audienceReady) {
      toast.error(t('chat.storyAudienceRequired'))
      return
    }
    createMedia.mutate(
      { ...payload, ...audience },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => {
          toast.success(t('chat.storyCreated'))
          backToStories()
        },
        onSettled: () => setMediaUploadProgress(null),
      },
    )
  }

  const shareMediaPayload = (file: File, captionText: string, durationMs?: number) => {
    setMediaUploadProgress(null)
    shareMedia({ file, captionText, durationMs, onProgress: setMediaUploadProgress })
  }
  return (
    <main
      className={`flex h-dvh w-full bg-background pb-16 text-foreground md:overflow-hidden md:pb-0 ${step === 'media' ? 'flex-col overflow-y-auto md:flex-row' : 'overflow-hidden'}`}
    >
      <SideNav
        active="stories"
        onOpenSettings={() => navigate(ROUTES.settings)}
        mobileBarVisible={true}
      />

      {/* Panel trái — "Tin của bạn" (kiểu Facebook) */}
      <div
        className={`flex min-h-0 w-full min-w-0 flex-col border-r border-border bg-card md:h-full md:w-88 md:flex-none ${step === 'media' ? 'shrink-0' : 'h-full flex-1'}`}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 pt-3">
          <button
            type="button"
            onClick={backToStories}
            aria-label={t('chat.backToList')}
            className="grid size-10 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Back className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t('chat.yourStory')}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('chat.storyArchive')}
              title={t('chat.storyArchive')}
              onClick={() => navigate(ROUTES.storiesArchive)}
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Archive className="size-4.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t('chat.settingsTitle')}
              onClick={() => setIsSettingsOpen(true)}
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Gear className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Tài khoản đích */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            disabled={!myGroup}
            onClick={() => myGroup && setViewingOwn(myGroup.startStory)}
            aria-label={t('chat.yourStory')}
            className="rounded-full disabled:cursor-default"
          >
            <UserAvatar
              name={userName}
              src={user?.avatarUrl}
              className="size-14"
              fallbackClassName="text-base font-bold text-[#172b20]"
            />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{t('chat.addToStoryHint')}</p>
          </div>
        </div>

        {showingEditor && (
          <div className={step === 'text' ? 'hidden md:block' : ''}>{selector}</div>
        )}

        {/* Trên mobile, panel lựa chọn nằm dưới thông tin tài khoản; panel desktop bị ẩn ở breakpoint md. */}
        {step === 'choose' && (
          <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
            <ChooseStoryType
              onPickMedia={() => setStep('media')}
              onPickText={() => setStep('text')}
            />
          </div>
        )}

        {step === 'media' && (
          <div ref={setMediaControls} className="md:min-h-0 md:overflow-y-auto" />
        )}

        {/* Tin đã chia sẻ của mình (nếu có) */}
        {step !== 'media' && myGroup && (
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <p className="px-4 pb-1 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t('chat.sharedStories')}
            </p>
            <ul className="flex flex-col gap-0.5 px-2">
              <li key={myGroup.displayStory.id}>
                <button
                  type="button"
                  onClick={() => setViewingOwn(myGroup.startStory)}
                  aria-label={`${t('chat.yourStory')}, ${storyTime(myGroup.displayStory, t('chat.now'))}`}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <UserAvatar
                    name={myGroup.displayStory.name || userName}
                    src={myGroup.displayStory.authorAvatar ?? user?.avatarUrl}
                    className="size-11"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {storyDisplayName(myGroup.displayStory, t)}
                      </span>
                      {myGroup.count > 1 && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t('chat.storyCount', { count: myGroup.count })}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {storyTime(myGroup.displayStory, t('chat.now'))}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* View lớn bên phải — nội dung bước đang chọn (kiểu Facebook) */}
      <section
        aria-label={step === 'choose' ? t('chat.createStoryTitle') : t('chat.storyEditor')}
        className={`min-h-0 min-w-0 md:block md:h-full md:flex-1 md:overflow-y-auto ${step === 'media' ? 'block shrink-0' : 'hidden'}`}
      >
        <div
          className={
            showingEditor ? 'mx-auto h-full w-full max-w-5xl' : 'mx-auto h-full w-full max-w-2xl'
          }
        >
          {step === 'choose' && (
            <ChooseStoryType
              onPickMedia={() => setStep('media')}
              onPickText={() => setStep('text')}
            />
          )}
          {step === 'text' && (
            <TextStoryEditor
              onDiscard={() => {
                changeDraft('')
                setStep('choose')
              }}
              text={draftText}
              onTextChange={changeDraft}
              onShare={shareText}
              isSharing={createText.isPending}
            />
          )}
          {step === 'media' && mediaControls && (
            <MediaStoryEditor
              onDiscard={() => setStep('choose')}
              onShare={shareMediaPayload}
              isSharing={createMedia.isPending}
              uploadProgress={mediaUploadProgress}
              controlsTarget={mediaControls}
            />
          )}
        </div>
      </section>

      {/* Mobile (<md): editor mở overlay toàn màn */}
      {step === 'text' && (
        <div className="fixed inset-x-0 bottom-16 top-0 z-40 overflow-y-auto bg-background md:hidden">
          {selector}
          <TextStoryEditor
            onDiscard={() => {
              changeDraft('')
              setStep('choose')
            }}
            text={draftText}
            onTextChange={changeDraft}
            onShare={shareText}
            isSharing={createText.isPending}
          />
        </div>
      )}

      {viewingOwn && myGroup && (
        <StoryViewer
          key={viewingOwn.id}
          story={myGroup.stories.find((s) => s.id === viewingOwn.id) ?? viewingOwn}
          stories={myGroup.stories}
          onSelectStory={setViewingOwn}
          onClose={() => setViewingOwn(null)}
        />
      )}
      <StorySettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </main>
  )
}
