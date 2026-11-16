import { useState } from 'react'
import { Armchair, UserCheck, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { seatGroup, seatWalkIn } from '@/lib/actions'
import { prefLabel } from '@/lib/format'
import { freeStoolRuns, rankCandidates, stoolsFrom } from '@/lib/matching'
import { barsOf, occupiedSpots, occupiedStools, tablesOf } from '@/lib/occupancy'
import { cn } from '@/lib/utils'
import type { FloorLayout, Party } from '@/types'
import { barSeatId } from '@/types'

const SAT_AGO = [
  { min: 0, label: 'עכשיו' },
  { min: 30, label: 'לפני 30 ד׳' },
  { min: 60, label: 'לפני שעה' },
  { min: 90, label: 'לפני 1.5 ש׳' },
  { min: 120, label: 'לפני 2 ש׳' },
]

/**
 * Tapped a free table or bar stool: seat a group from the list here,
 * or mark it taken by people who sat down without the list (no name needed).
 */
export function FreeSpotDialog({
  spotId,
  layout,
  list,
  seated,
  busyMode,
  onOpenChange,
}: {
  spotId: string | null
  layout: FloorLayout
  list: Party[]
  seated: Party[]
  busyMode: boolean
  onOpenChange: (open: boolean) => void
}) {
  const table = spotId ? tablesOf(layout).find((t) => t.id === spotId) : undefined
  const bar = spotId?.includes(':') ? barsOf(layout).find((b) => spotId.startsWith(b.id + ':')) : undefined
  const stoolN = bar && spotId ? Number(spotId.split(':')[1]) : 0

  // How many people fit here: the table's seats, or the free row of stools around the tapped one.
  const stoolNumbers = bar ? bar.stools.map((s) => s.n) : []
  const takenStools = bar ? occupiedStools(bar, occupiedSpots(seated)) : new Set<number>()
  const barRun = bar ? (freeStoolRuns(stoolNumbers, takenStools).find((r) => r.includes(stoolN))?.length ?? 1) : 0
  const capacity = table ? table.seats : barRun

  const spotsFor = (size: number): string[] | null => {
    if (table) return [table.id]
    if (!bar) return null
    return stoolsFrom(stoolNumbers, takenStools, stoolN, size)?.map((n) => barSeatId(bar.id, n)) ?? null
  }

  // Groups already called come first (they're on their way back), then the line.
  const called = list.filter((p) => p.status === 'notified' && p.size <= capacity)
  const ranked = rankCandidates(table ? { kind: 'table', seats: table.seats } : { kind: 'bar', freeRun: barRun }, list)
  const candidates = [
    ...called.map((party) => ({ party, tag: 'הוזמנו' })),
    ...ranked.map((c) => ({ party: c.party, tag: c.reason === 'other-pref' ? `ביקשו ${prefLabel[c.party.pref]}` : '' })),
  ].slice(0, 4)

  const [walkInSize, setWalkInSize] = useState<number | null>(null)
  const [satAgo, setSatAgo] = useState(0)
  const size = walkInSize ?? (table ? table.seats : 1)
  const sizeOptions = Array.from({ length: Math.max(capacity, 1) + (table ? 2 : 0) }, (_, i) => i + 1).slice(0, 8)

  function close() {
    setWalkInSize(null)
    setSatAgo(0)
    onOpenChange(false)
  }

  function seatFromList(party: Party) {
    const spots = spotsFor(party.size)
    if (!spots) return
    void seatGroup(party.id, spots, busyMode).catch(console.error)
    close()
  }

  function markTaken() {
    const spots = spotsFor(Math.min(size, table ? size : barRun))
    if (!spots) return
    void seatWalkIn({ size, spotIds: spots, minutesAgo: satAgo, busyMode }).catch(console.error)
    close()
  }

  return (
    <Dialog open={Boolean(spotId)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        {(table || bar) && (
          <>
            <DialogHeader>
              <DialogTitle>{table ? `שולחן ${table.label} פנוי` : `כיסא ${stoolN} בבר פנוי`}</DialogTitle>
              <DialogDescription>
                {table ? `${table.seats} מקומות` : `${barRun} כיסאות פנויים ברצף כאן`}
              </DialogDescription>
            </DialogHeader>

            {candidates.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-sans text-sm font-semibold text-muted-foreground">מהרשימה</h3>
                <ul className="divide-y rounded-lg border">
                  {candidates.map(({ party, tag }, i) => (
                    <li key={party.id} className="flex items-center gap-3 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {party.name}
                          {i === 0 && <span className="ms-2 text-xs font-medium text-timer-ok">הבאים בתור</span>}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="size-3.5" /> {party.size} · {prefLabel[party.pref]}
                          {tag && <span className="text-primary">· {tag}</span>}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => seatFromList(party)}>
                        <Armchair /> הושבה כאן
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 rounded-lg bg-muted p-3">
              <h3 className="font-sans text-sm font-semibold">התיישבו בלי רשימה</h3>
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">כמה אנשים?</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizeOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={size === n}
                      onClick={() => setWalkInSize(n)}
                      className={cn(
                        'size-10 rounded-md border font-semibold',
                        size === n ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">מתי התיישבו?</p>
                <div className="flex flex-wrap gap-1.5">
                  {SAT_AGO.map((o) => (
                    <button
                      key={o.min}
                      type="button"
                      aria-pressed={satAgo === o.min}
                      onClick={() => setSatAgo(o.min)}
                      className={cn(
                        'h-10 rounded-md border px-3 text-sm font-medium',
                        satAgo === o.min ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" className="w-full bg-card" onClick={markTaken} disabled={!spotsFor(Math.min(size, table ? size : barRun))}>
                <UserCheck /> סימון כתפוס
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
