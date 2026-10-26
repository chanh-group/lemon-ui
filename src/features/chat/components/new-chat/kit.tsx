import { ArrowLeft01Icon as ArrowLeftData, Search01Icon as SearchData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ArrowLeft = createIcon(ArrowLeftData)
const Search = createIcon(SearchData)
import { UserAvatar } from '@/components/common/UserAvatar'

export function Avatar({ name, src, square = false }: { name: string; src?: string | null; square?: boolean }) {
  return <UserAvatar name={name} src={src} square={square} className="size-11" />
}

export function PaneHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-center px-4 pt-3 pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-3 grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </button>
      <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
    </header>
  )
}

export function SearchBox({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint: string }) {
  return (
    <label className="chat-search group flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
      <Search className="size-4.5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-brand-ink" aria-hidden="true" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        aria-label={hint}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-3 pt-4 pb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase" role="heading" aria-level={2}>
      {children}
    </h2>
  )
}
