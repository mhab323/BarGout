import { FloorMap, type SpotStatus } from '@/components/floor/FloorMap'
import { useBar } from '@/hooks/barDataContext'
import { totalSeats } from '@/lib/defaults'
import { occupiedSpots } from '@/lib/occupancy'

export function FloorPage() {
  const bar = useBar()
  const occupied = occupiedSpots(bar.seated)
  const status: Record<string, SpotStatus> = {}
  for (const [id, p] of occupied) status[id] = { state: 'seated', tone: 'idle', caption: p.name.slice(0, 8) }
  const taken = bar.seated.reduce((sum, p) => sum + p.size, 0)

  return (
    <section className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">מפת המקום</h1>
        <span className="text-sm text-muted-foreground">
          {taken} / {totalSeats(bar.layout)} מקומות תפוסים
        </span>
      </div>
      {/* The map fills the free space and keeps the room's proportions */}
      <div className="min-h-0 flex-1 rounded-xl border bg-card p-3">
        <FloorMap layout={bar.layout} status={status} className="size-full" />
      </div>
    </section>
  )
}
