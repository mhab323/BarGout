import { cn } from '@/lib/utils'

/**
 * The "BarGout" wordmark, rebuilt as text so it stays sharp on every screen.
 * Matches the logo: classic serif, burgundy #720F22, slightly wide letter spacing.
 * The logo is Latin, so it is always laid out left-to-right even on Hebrew pages.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      aria-label="BarGout"
      className={cn('font-serif leading-none tracking-[0.03em] text-brand select-none', className)}
      style={{ fontWeight: 460 }}
    >
      BarGout
    </span>
  )
}
