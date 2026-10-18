import { CircleCheckIcon as CircleCheckIconData, InformationCircleIcon as InfoIconData, LoaderCircleIcon as Loader2IconData, CancelCircleIcon as OctagonXIconData, TriangleAlertIcon as TriangleAlertIconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const CircleCheckIcon = createIcon(CircleCheckIconData)
const InfoIcon = createIcon(InfoIconData)
const Loader2Icon = createIcon(Loader2IconData)
const OctagonXIcon = createIcon(OctagonXIconData)
const TriangleAlertIcon = createIcon(TriangleAlertIconData)
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
