import type { BarSpot, FloorLayout, TableSpot } from '@/types'
import { barSeatId } from '@/types'
import { cn } from '@/lib/utils'

/** What is happening at one table or bar stool. Filled in by the floor page from live data. */
export interface SpotStatus {
  /** free | seated | bill asked | held for a notified group */
  state: 'free' | 'seated' | 'bill' | 'held'
  /** Timer color when seated: ok / warn / late / idle (not busy). */
  tone?: 'ok' | 'warn' | 'late' | 'idle'
  /** Short text under the table number, e.g. "1:42". */
  caption?: string
}

interface FloorMapProps {
  layout: FloorLayout
  /** Keyed by table id ("T5") or bar seat id ("BAR:3"). Missing = free. */
  status?: Record<string, SpotStatus>
  /** Highlighted spots, e.g. bar stools being picked for a group. */
  selected?: string[]
  onSpotClick?: (spotId: string) => void
  className?: string
}

const toneFill: Record<NonNullable<SpotStatus['tone']>, string> = {
  ok: 'fill-timer-ok',
  warn: 'fill-timer-warn',
  late: 'fill-timer-late',
  idle: 'fill-timer-idle',
}

function spotClasses(status: SpotStatus | undefined, isSelected: boolean) {
  const state = status?.state ?? 'free'
  return cn(
    'stroke-[0.25] transition-colors',
    state === 'free' && 'fill-card stroke-foreground/40',
    state === 'seated' && cn(toneFill[status?.tone ?? 'idle'], 'stroke-foreground/30'),
    state === 'bill' && cn(toneFill[status?.tone ?? 'idle'], 'stroke-primary [stroke-dasharray:1_0.6] stroke-[0.45]'),
    state === 'held' && 'fill-accent stroke-primary [stroke-dasharray:0.8_0.5]',
    isSelected && 'fill-primary/25 stroke-primary stroke-[0.5]',
  )
}

/** The bar's room drawn to the owner's layout. Always left-to-right: it is a picture of the room. */
export function FloorMap({ layout, status = {}, selected = [], onSpotClick, className }: FloorMapProps) {
  const clickable = Boolean(onSpotClick)
  const tables = layout.spots.filter((s): s is TableSpot => s.kind === 'table')
  const bars = layout.spots.filter((s): s is BarSpot => s.kind === 'bar')

  return (
    <svg
      style={{ direction: 'ltr' }}
      viewBox={`-1 -1 ${layout.width + 2} ${layout.height + 2}`}
      className={cn('touch-manipulation select-none', className)}
      role="img"
      aria-label="מפת המקום"
    >
      {/* Walls, door, labels */}
      {layout.decor.map((d) =>
        d.type === 'label' ? (
          <text
            key={d.id}
            x={d.x + d.w / 2}
            y={d.y + d.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-primary text-[1.6px] font-semibold"
          >
            {d.text}
          </text>
        ) : (
          <g key={d.id}>
            <rect
              x={d.x}
              y={d.y}
              width={d.w}
              height={d.h}
              rx={0.2}
              className={d.type === 'wall' ? 'fill-foreground/70' : 'fill-primary/15 stroke-primary stroke-[0.25] [stroke-dasharray:0.6_0.4]'}
            />
            {d.text && (
              <text
                x={d.x + d.w / 2}
                y={d.y - 1}
                textAnchor="middle"
                className="fill-muted-foreground text-[1.6px]"
              >
                {d.text}
              </text>
            )}
          </g>
        ),
      )}

      {/* Bar counter + stools */}
      {bars.map((bar) => (
        <g key={bar.id}>
          {bar.segments.map((seg, i) => (
            <rect key={i} x={seg.x} y={seg.y} width={seg.w} height={seg.h} className="fill-primary" />
          ))}
          {bar.segments[0] && (
            <text
              x={bar.segments[0].x + bar.segments[0].w / 2}
              y={bar.segments[0].y + bar.segments[0].h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-primary-foreground font-serif text-[2.6px]"
            >
              {bar.label}
            </text>
          )}
          {bar.stools.map((stool) => {
            const id = barSeatId(bar.id, stool.n)
            const st = status[id]
            return (
              <g
                key={id}
                onClick={clickable ? () => onSpotClick?.(id) : undefined}
                className={cn(clickable && 'cursor-pointer')}
              >
                {/* larger invisible hit area for fingers */}
                {clickable && <circle cx={stool.x} cy={stool.y} r={2.4} className="fill-transparent" />}
                <circle cx={stool.x} cy={stool.y} r={1.7} className={spotClasses(st, selected.includes(id))} />
                <text
                  x={stool.x}
                  y={stool.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none fill-foreground text-[1.7px] font-semibold"
                >
                  {stool.n}
                </text>
              </g>
            )
          })}
        </g>
      ))}

      {/* Tables */}
      {tables.map((t) => {
        const st = status[t.id]
        const cx = t.x + t.w / 2
        const cy = t.y + t.h / 2
        return (
          <g
            key={t.id}
            onClick={clickable ? () => onSpotClick?.(t.id) : undefined}
            className={cn(clickable && 'cursor-pointer')}
          >
            {t.shape === 'round' ? (
              <ellipse cx={cx} cy={cy} rx={t.w / 2} ry={t.h / 2} className={spotClasses(st, selected.includes(t.id))} />
            ) : (
              <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={0.8} className={spotClasses(st, selected.includes(t.id))} />
            )}
            <text
              x={cx}
              y={st?.caption ? cy - 0.9 : cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none fill-foreground text-[2.6px] font-bold"
            >
              {t.label}
            </text>
            <text
              x={cx}
              y={st?.caption ? cy + 1.6 : cy + 2.3}
              textAnchor="middle"
              dominantBaseline="central"
              direction="rtl"
              className="pointer-events-none fill-foreground/70 text-[1.3px]"
            >
              {st?.caption ?? `${t.seats} מק׳`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
