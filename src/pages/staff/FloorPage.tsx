import { FloorMap } from '@/components/floor/FloorMap'
import { DEFAULT_LAYOUT, totalSeats } from '@/lib/defaults'

export function FloorPage() {
  const layout = DEFAULT_LAYOUT

  return (
    <section className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">מפת המקום</h1>
        <span className="text-sm text-muted-foreground">{totalSeats(layout)} מקומות</span>
      </div>
      {/* The map fills the free space and keeps the room's proportions */}
      <div className="min-h-0 flex-1 rounded-xl border bg-card p-3">
        <FloorMap layout={layout} className="size-full" />
      </div>
    </section>
  )
}
