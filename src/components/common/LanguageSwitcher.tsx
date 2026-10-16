import { useLanguage } from '@/app/providers/LanguageProvider'
import { Button } from '@/components/ui/button'

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, toggleLanguage } = useLanguage()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      aria-label={language === 'vi' ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
      className={className}
    >
      {language.toUpperCase()}
    </Button>
  )
}
