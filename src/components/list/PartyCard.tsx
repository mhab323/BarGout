import { Armchair, MoreVertical, QrCode, Undo2, UserX, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { backToWaiting, markNoShow, markNotified, removeFromList } from '@/lib/actions'
import { clock, minutesLabel, prefLabel } from '@/lib/format'
import { fillTemplate, formatPhone, whatsappLink } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { Party, Settings } from '@/types'

interface PartyCardProps {
  party: Party
  position: number
  settings: Settings
  busyMode: boolean
  now: number
  /** Matching hint, e.g. "מתאים עכשיו: שולחן 7". */
  hint?: string
  onSeat: () => void
}

function readyMessage(party: Party, settings: Settings, busyMode: boolean) {
  let text = fillTemplate(settings.messages.tableReady, { name: party.name, hold: settings.holdMinutes })
  if (busyMode) {
    const hours = settings.tableLimitMinutes / 60
    text += '\n' + fillTemplate(settings.messages.timeLimitNote, { hours: Number.isInteger(hours) ? hours : hours.toFixed(1) })
  }
  return text
}

export function PartyCard({ party, position, settings, busyMode, now, hint, onSeat }: PartyCardProps) {
  const waitedMin = Math.floor((now - party.joinedAt.toMillis()) / 60000)
  const notified = party.status === 'notified' && party.notifiedAt
  const holdLeftSec = notified ? settings.holdMinutes * 60 - (now - party.notifiedAt!.toMillis()) / 1000 : 0
  const holdOver = notified && holdLeftSec <= 0

  return (
    <article
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-xs sm:flex-nowrap sm:p-4',
        notified && 'border-primary/40 bg-accent/40',
        holdOver && 'border-destructive/50 bg-destructive/5',
      )}
    >
      {/* place in line */}
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">
        {position}
      </div>

      {/* who */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-sans text-lg font-semibold text-foreground">{party.name}</h2>
          {party.source === 'qr' && (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              <QrCode className="size-3" /> QR
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <Users className="size-4" /> {party.size}
          </span>
          <span>{prefLabel[party.pref]}</span>
          <span>{waitedMin < 1 ? 'הרגע הצטרפו' : `ממתינים ${minutesLabel(waitedMin)}`}</span>
          {party.phone && <span dir="ltr">{formatPhone(party.phone, settings.countryCode)}</span>}
        </div>
        {hint && !notified && <p className="mt-1 text-sm font-medium text-timer-ok">{hint}</p>}
        {notified && (
          <p className={cn('mt-1 text-sm font-semibold', holdOver ? 'text-destructive' : 'text-primary')}>
            {holdOver ? (
              <>
                עבר הזמן (<span dir="ltr">+{clock(-holdLeftSec)}</span>) — לא הגיעו?
              </>
            ) : (
              <>נשלחה הודעה · חוזרים תוך {clock(holdLeftSec)}</>
            )}
          </p>
        )}
      </div>

      {/* actions */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {party.phone ? (
          <Button asChild variant="outline" size="lg" className="flex-1 sm:flex-none">
            <a
              href={whatsappLink(party.phone, readyMessage(party, settings, busyMode))}
              target="_blank"
              rel="noreferrer"
              onClick={() => void markNotified(party.id).catch(console.error)}
            >
              <WhatsAppIcon />
              {notified ? 'שוב' : 'וואטסאפ'}
            </a>
          </Button>
        ) : (
          !notified && (
            <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => void markNotified(party.id).catch(console.error)}>
              קראתי להם
            </Button>
          )
        )}
        <Button size="lg" className="flex-1 sm:flex-none" onClick={onSeat}>
          <Armchair />
          הושבה
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="עוד">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {notified && (
              <>
                <DropdownMenuItem variant="destructive" onSelect={() => void markNoShow(party.id).catch(console.error)}>
                  <UserX /> לא הגיעו
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void backToWaiting(party.id).catch(console.error)}>
                  <Undo2 /> החזרה להמתנה
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => void removeFromList(party.id).catch(console.error)}>
              <X /> הסרה מהרשימה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-[#25D366]">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM12 0a12 12 0 0 0-10.3 18L0 24l6.2-1.6A12 12 0 1 0 12 0z" />
    </svg>
  )
}
