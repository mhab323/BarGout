import { DoorOpen, MoveLeft, Receipt, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNow } from '@/hooks/useNow'
import { finishGroup, setBillAsked } from '@/lib/actions'
import { rankCandidates } from '@/lib/matching'
import { describeSpots, tablesOf } from '@/lib/occupancy'
import { hm, tableTimer } from '@/lib/timers'
import { cn } from '@/lib/utils'
import type { FloorLayout, Party, Settings } from '@/types'

const toneText = { ok: 'text-timer-ok', warn: 'text-[#a8740a]', late: 'text-timer-late', idle: 'text-muted-foreground' }

/** Tapped an occupied table or stool: timer, bill asked, who is next, move, free. */
export function GroupDialog({
  party,
  layout,
  list,
  settings,
  busyMode,
  busySinceMs,
  onMove,
  onOpenChange,
}: {
  party: Party | null
  layout: FloorLayout
  list: Party[]
  settings: Settings
  busyMode: boolean
  busySinceMs: number | null
  onMove: (party: Party) => void
  onOpenChange: (open: boolean) => void
}) {
  const now = useNow(15000)
  if (!party) return <Dialog open={false} />

  const timer = tableTimer(party, { busyMode, busySinceMs, now, settings })
  const billAsked = Boolean(party.billAt)

  // Who should get this place when they leave?
  const table = tablesOf(layout).find((t) => party.spotIds.includes(t.id))
  const next = rankCandidates(
    table ? { kind: 'table', seats: table.seats } : { kind: 'bar', freeRun: party.spotIds.length },
    list,
  )[0]?.party

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{party.name || 'ללא שם'}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Users className="size-4" /> {party.size}
            </span>
            <span>{describeSpots(party.spotIds, layout)}</span>
            <span>{timer.sittingMin < 1 ? 'התיישבו הרגע' : `יושבים ${hm(timer.sittingMin)}`}</span>
          </DialogDescription>
        </DialogHeader>

        {timer.limitMin !== null && (
          <p className={cn('rounded-lg bg-muted px-3 py-2 font-semibold', toneText[timer.tone])}>
            {timer.over ? (
              <>
                עברו השעתיים (<span dir="ltr">+{hm(-(timer.leftMin ?? 0))}</span>)
              </>
            ) : (
              `מתוך השעתיים: ${hm(timer.limitMin)} · נשארו ${hm(timer.leftMin ?? 0)}`
            )}
          </p>
        )}

        {(billAsked || timer.tone === 'late') && next && (
          <p className="text-sm">
            הבאים למקום הזה: <span className="font-semibold">{next.name}</span> ({next.size})
          </p>
        )}

        <div className="grid gap-2">
          <Button
            size="lg"
            variant={billAsked ? 'secondary' : 'outline'}
            onClick={() => void setBillAsked(party.id, !billAsked).catch(console.error)}
          >
            <Receipt />
            {billAsked ? 'ביקשו חשבון ✓ (לחיצה לביטול)' : 'ביקשו חשבון'}
          </Button>
          <Button size="lg" variant="outline" onClick={() => onMove(party)}>
            <MoveLeft />
            העברה למקום אחר
          </Button>
          <Button
            size="lg"
            onClick={() => {
              void finishGroup(party.id).catch(console.error)
              onOpenChange(false)
            }}
          >
            <DoorOpen />
            פינוי — הלכו, המקום פנוי
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
