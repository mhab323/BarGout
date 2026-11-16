import { useMemo, useState } from 'react'
import { Armchair, MoveLeft, TriangleAlert } from 'lucide-react'

import { FloorMap, type SpotStatus } from '@/components/floor/FloorMap'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { moveGroup, seatGroup } from '@/lib/actions'
import { pickStools } from '@/lib/matching'
import { barsOf, describeSpots, occupiedSpots, occupiedStools, seatsIn, tablesOf } from '@/lib/occupancy'
import type { FloorLayout, Party } from '@/types'
import { barSeatId } from '@/types'

/** Best starting choice: smallest free table that fits, or a row of bar stools. */
function suggestSpots(party: Party, layout: FloorLayout, occupied: Map<string, Party>): string[] {
  const freeTables = tablesOf(layout)
    .filter((t) => !occupied.has(t.id) && t.seats >= party.size)
    .sort((a, b) => a.seats - b.seats)
  const bar = barsOf(layout)[0]
  const stools = bar
    ? pickStools(bar.stools.map((s) => s.n), occupiedStools(bar, occupied), party.size)?.map((n) => barSeatId(bar.id, n))
    : undefined

  if (party.pref === 'bar') return stools ?? (freeTables[0] ? [freeTables[0].id] : [])
  if (freeTables[0]) return [freeTables[0].id]
  return party.pref === 'any' && stools ? stools : []
}

/**
 * Pick a table or bar stools on the real map.
 * mode "seat": seat a group from the list. mode "move": move a seated group (their timer keeps running).
 */
export function SeatDialog({
  party,
  layout,
  seated,
  busyMode,
  mode = 'seat',
  onOpenChange,
}: {
  party: Party | null
  layout: FloorLayout
  seated: Party[]
  busyMode: boolean
  mode?: 'seat' | 'move'
  onOpenChange: (open: boolean) => void
}) {
  const moving = mode === 'move'
  // When moving, the group's own places count as free (they can keep a stool and add one).
  const others = useMemo(() => (moving && party ? seated.filter((p) => p.id !== party.id) : seated), [moving, party, seated])
  const occupied = useMemo(() => occupiedSpots(others), [others])
  const [selection, setSelection] = useState<string[] | null>(null)
  const current = selection ?? (party && !moving ? suggestSpots(party, layout, occupied) : [])

  const status: Record<string, SpotStatus> = {}
  for (const [id, p] of occupied) status[id] = { state: 'seated', tone: 'idle', caption: p.name.slice(0, 8) }
  if (moving && party) for (const id of party.spotIds) status[id] = { state: 'held', caption: 'כאן' }

  function toggle(spotId: string) {
    if (occupied.has(spotId)) return
    const isStool = spotId.includes(':')
    if (!isStool) {
      setSelection(current.length === 1 && current[0] === spotId ? [] : [spotId])
      return
    }
    const stools = current.filter((id) => id.includes(':'))
    setSelection(stools.includes(spotId) ? stools.filter((id) => id !== spotId) : [...stools, spotId])
  }

  function close() {
    setSelection(null)
    onOpenChange(false)
  }

  function confirm() {
    if (!party || !current.length) return
    const write = moving ? moveGroup(party.id, current) : seatGroup(party.id, current, busyMode)
    void write.catch((err) => console.error(moving ? 'moveGroup failed' : 'seatGroup failed', err))
    close()
  }

  const seats = seatsIn(current, layout)

  return (
    <Dialog open={Boolean(party)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl">
        {party && (
          <>
            <DialogHeader>
              <DialogTitle>
                {moving ? 'העברה' : 'הושבה'}: {party.name} ({party.size})
              </DialogTitle>
              <DialogDescription>
                {moving
                  ? 'לחצו על המקום החדש (שולחן, או כיסאות בר). המקום הנוכחי מסומן בקו מקווקו. הזמן ממשיך לרוץ.'
                  : 'לחצו על שולחן, או על כיסאות בר (אפשר כמה). מקומות תפוסים מסומנים באפור.'}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-card p-2">
              <FloorMap layout={layout} status={status} selected={current} onSpotClick={toggle} className="w-full" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-h-6">
                {current.length ? (
                  <p className="font-medium">
                    {describeSpots(current, layout)} · {seats} מק׳
                  </p>
                ) : (
                  <p className="text-muted-foreground">לא נבחר מקום</p>
                )}
                {current.length > 0 && seats < party.size && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-destructive">
                    <TriangleAlert className="size-4" /> פחות מקומות מגודל הקבוצה
                  </p>
                )}
                {busyMode && !moving && <p className="mt-1 text-sm text-muted-foreground">מצב עומס: שעתיים מתחילות עכשיו</p>}
              </div>
              <Button size="lg" onClick={confirm} disabled={!current.length}>
                {moving ? <MoveLeft /> : <Armchair />}
                {moving ? 'העברה' : 'הושבה'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
