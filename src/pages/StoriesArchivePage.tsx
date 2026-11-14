import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArchiveIcon, ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { ROUTES } from '@/config/constants'
import { StoryViewer } from '@/features/chat/components/StoryViewer'
import { SideNav } from '@/features/chat/components/SideNav'
import { useArchivedStories, useStoryMedia } from '@/features/chat/hooks/useStories'
import type { StoryEntry } from '@/features/chat/types/chat.types'
import { TEXT_STORY_BG } from '@/features/chat/data/storiesData'
import { cn } from '@/lib/utils'

const ArrowLeft = createIcon(ArrowLeft01Icon)
const Archive = createIcon(ArchiveIcon)

export function StoriesArchivePage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useArchivedStories()
  const [selectedStory, setSelectedStory] = useState<StoryEntry | null>(null)

  const formatDate = (value?: string) => {
    if (!value || Number.isNaN(Date.parse(value))) return t('chat.archivedStory')
    return new Intl.DateTimeFormat(i18n.resolvedLanguage === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: 'medium',
    }).format(new Date(value))
  }
  const items =
    data?.pages
      .flatMap((page) => page.items)
      .map((item) => ({ ...item, time: formatDate(item.createdAt) })) ?? []

  const backToStories = () => {
    navigate(ROUTES.messages, { state: { tab: 'stories' } })
  }

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <SideNav
        active="stories"
        onOpenSettings={() => navigate(ROUTES.settings)}
        mobileBarVisible={true}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backToStories}
              aria-label={t('chat.archiveBack')}
              className="grid size-10 place-items-center rounded-full bg-muted hover:bg-accent text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <Archive className="size-5 text-primary" />
              <h1 className="text-lg font-bold">{t('chat.storyArchive')}</h1>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">{t('chat.archiveDescription')}</p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[9/16] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : isError && !data ? (
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-lg bg-muted hover:bg-accent px-4 py-2 text-sm"
              >
                {t('chat.archiveLoadError')}
              </button>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
                  <Archive className="size-8" />
                </div>
                <p className="text-base font-semibold text-foreground">{t('chat.archiveEmpty')}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {t('chat.archiveEmptyHint')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStory(item)}
                    className="group relative flex aspect-[9/16] flex-col justify-between overflow-hidden rounded-xl bg-neutral-900 border border-white/10 shadow-md text-left transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    {/* Media or Text Background */}
                    <div className="absolute inset-0">
                      {item.kind === 'MEDIA' ? (
                        <ArchiveMedia story={item} />
                      ) : (
                        <div
                          className={cn(
                            'h-full w-full flex items-center justify-center p-3 text-center text-xs font-bold text-white bg-linear-to-br',
                            item.background || TEXT_STORY_BG,
                          )}
                        >
                          <span className="line-clamp-4">
                            {item.caption || t('chat.archiveTextStory')}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                    </div>

                    {/* Top date badge */}
                    <div className="relative z-10 p-2.5">
                      <span className="text-[11px] font-semibold text-white/90 drop-shadow-md">
                        {item.time}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {hasNextPage && (
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-4 rounded-lg bg-muted hover:bg-accent px-4 py-2 text-sm"
              >
                {t('chat.loadMore')}
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedStory && (
        <StoryViewer
          key={selectedStory.id}
          story={selectedStory}
          stories={items}
          onSelectStory={setSelectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </main>
  )
}

function ArchiveMedia({ story }: { story: StoryEntry }) {
  const media = useStoryMedia(story)
  const url = story.mediaUrl || media.data
  if (!url) return <div className="h-full w-full bg-neutral-800" />
  return story.mediaType === 'video' ? (
    <video src={url} muted preload="metadata" className="h-full w-full object-cover" />
  ) : (
    <img src={url} alt={story.caption || ''} className="h-full w-full object-cover" />
  )
}
