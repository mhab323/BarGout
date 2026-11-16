import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { AddGroupDialog } from '@/components/list/AddGroupDialog'
import { PartyCard } from '@/components/list/PartyCard'
import { SeatDialog } from '@/components/list/SeatDialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useBar } from '@/hooks/barDataContext'
import { useNow } from '@/hooks/useNow'
import { setBusyMode, setQrJoinOpen } from '@/lib/actions'
import { longestFreeRun, rankCandidates } from '@/lib/matching'
import { barsOf, occupiedSpots, occupiedStools, tablesOf } from '@/lib/occupancy'
import type { Party } from '@/types'

export function WaitlistPage() {
  const bar = useBar()
  const now = useNow(1000)
  const [adding, setAdding] = useState(false)
  const [seating, setSeating] = useState<Party | null>(null)

  // "Fits now" hints: for every free table / free bar row, who is the best match?
  const hints = useMemo(() => {
    const occupied = occupiedSpots(bar.seated)
    const result = new Map<string, string>()
    for (const t of tablesOf(bar.layout).filter((t) => !occupied.has(t.id)).sort((a, b) => a.seats - b.seats)) {
      const best = rankCandidates({ kind: 'table', seats: t.seats }, bar.list).find(
        (c) => c.reason !== 'other-pref' && !result.has(c.party.id),
      )
      if (best) result.set(best.party.id, `מתאים עכשיו: שולחן ${t.label}`)
    }
    // Tables that asked for the bill are next.
    for (const t of tablesOf(bar.layout).filter((t) => occupied.get(t.id)?.billAt).sort((a, b) => a.seats - b.seats)) {
      const best = rankCandidates({ kind: 'table', seats: t.seats }, bar.list).find(
        (c) => c.reason !== 'other-pref' && !result.has(c.party.id),
      )
      if (best) result.set(best.party.id, `הבאים לשולחן ${t.label} (ביקשו חשבון)`)
    }
    const counter = barsOf(bar.layout)[0]
    if (counter) {
      const run = longestFreeRun(counter.stools.map((s) => s.n), occupiedStools(counter, occupied))
      const best = rankCandidates({ kind: 'bar', freeRun: run }, bar.list).find(
        (c) => c.reason === 'fits' && !result.has(c.party.id),
      )
      if (best) result.set(best.party.id, 'מתאים עכשיו: בר')
    }
    return result
  }, [bar.seated, bar.layout, bar.list])

  const waitingCount = bar.list.reduce((sum, p) => sum + p.size, 0)

  return (
    <section className="mx-auto max-w-4xl space-y-4 p-4">
      {/* top: title, toggles, add (stacks on a phone, one row on a tablet) */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="col-span-2 sm:me-auto">
          <h1 className="text-2xl">רשימת המתנה</h1>
          <p className="text-sm text-muted-foreground">
            {bar.list.length ? `${bar.list.length} קבוצות · ${waitingCount} אנשים` : 'אין אף אחד ברשימה'}
          </p>
        </div>
        <label className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-sm font-medium">מצב עומס</span>
          <Switch checked={bar.busyMode} onCheckedChange={(on) => void setBusyMode(on).catch(console.error)} />
        </label>
        <label className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-sm font-medium">הצטרפות ב-QR</span>
          <Switch checked={bar.qrJoinOpen} onCheckedChange={(on) => void setQrJoinOpen(on).catch(console.error)} />
        </label>
        <Button size="lg" className="col-span-2 sm:col-span-1" onClick={() => setAdding(true)}>
          <Plus />
          הוספה
        </Button>
      </div>

      {bar.busyMode && (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          מצב עומס פעיל: הישיבה מוגבלת ל-{bar.settings.tableLimitMinutes / 60} שעות, וההודעה בוואטסאפ כוללת את זה.
        </p>
      )}

      {/* the list */}
      {bar.list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-4xl">🍷</p>
          <p className="mt-2">הרשימה ריקה. כשמגיעים אנשים ואין מקום — לחצו "הוספה".</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {bar.list.map((party, i) => (
            <li key={party.id}>
              <PartyCard
                party={party}
                position={i + 1}
                settings={bar.settings}
                busyMode={bar.busyMode}
                now={now}
                hint={hints.get(party.id)}
                onSeat={() => setSeating(party)}
              />
            </li>
          ))}
        </ol>
      )}

      <AddGroupDialog open={adding} onOpenChange={setAdding} countryCode={bar.settings.countryCode} />
      <SeatDialog
        key={seating?.id ?? 'none'}
        party={seating}
        layout={bar.layout}
        seated={bar.seated}
        busyMode={bar.busyMode}
        onOpenChange={(o) => !o && setSeating(null)}
      />
    </section>
  )
}
