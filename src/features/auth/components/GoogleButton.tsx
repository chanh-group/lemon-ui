import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.9z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l3.99-3.09z" />
      <path fill="#EA4335" d="M12 4.74c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.28 6.63l3.99 3.09C6.22 6.87 8.87 4.74 12 4.74z" />
    </svg>
  )
}

export function GoogleButton() {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t('auth.or')}</span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full cursor-pointer"
        onClick={() =>
          toast.info(t('auth.comingSoon'), {
            description: t('auth.googleComingSoon'),
          })
        }
      >
        <GoogleIcon className="size-4" />
        {t('auth.continueWithGoogle')}
      </Button>
    </>
  )
}
