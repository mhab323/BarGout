import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

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
  /** Light grid behind the room (edit mode). */
  showGrid?: boolean
  /** Edit mode: tables can be dragged; the new top-left corner is reported in grid units. */
  onTableMove?: (tableId: string, x: number, y: number) => void
  className?: string
}

/** Dragging closer than this (in screen px) counts as a tap, not a move. */
const TAP_SLOP = 6
const snap = (v: number) => Math.round(v * 2) / 2

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
export function FloorMap({
  layout,
  status = {},
  selected = [],
  showGrid = false,
  onSpotClick,
  onTableMove,
  className,
}: FloorMapProps) {
  const clickable = Boolean(onSpotClick)
  const editing = Boolean(onTableMove)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null)

  /** Screen point -> grid units on the map. */
  function toMap(clientX: number, clientY: number) {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function startDrag(e: ReactPointerEvent, t: TableSpot) {
    if (!editing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toMap(e.clientX, e.clientY)
    drag.current = { id: t.id, dx: p.x - t.x, dy: p.y - t.y, startX: e.clientX, startY: e.clientY, moved: false }
  }

  function moveDrag(e: ReactPointerEvent, t: TableSpot) {
    const d = drag.current
    if (!d || d.id !== t.id) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < TAP_SLOP) return
    d.moved = true
    const p = toMap(e.clientX, e.clientY)
    const x = Math.min(Math.max(snap(p.x - d.dx), 0), layout.width - t.w)
    const y = Math.min(Math.max(snap(p.y - d.dy), 0), layout.height - t.h)
    if (x !== t.x || y !== t.y) onTableMove?.(t.id, x, y)
  }

  function endDrag(t: TableSpot) {
    const d = drag.current
    drag.current = null
    // A short tap (no move) selects the table.
    if (d && d.id === t.id && !d.moved) onSpotClick?.(t.id)
  }
  const tables = layout.spots.filter((s): s is TableSpot => s.kind === 'table')
  const bars = layout.spots.filter((s): s is BarSpot => s.kind === 'bar')

  return (
    <svg
      ref={svgRef}
      style={{ direction: 'ltr' }}
      viewBox={`-1 -1 ${layout.width + 2} ${layout.height + 2}`}
      className={cn('touch-manipulation select-none', className)}
      role="img"
      aria-label="מפת המקום"
    >
      {showGrid && (
        <g className="stroke-border" strokeWidth={0.08}>
          {Array.from({ length: Math.floor(layout.width / 5) + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * 5} y1={0} x2={i * 5} y2={layout.height} />
          ))}
          {Array.from({ length: Math.floor(layout.height / 5) + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 5} x2={layout.width} y2={i * 5} />
          ))}
        </g>
      )}

      {/* Walls, door, labels */}
      {layout.decor.map((d) =>
        d.type === 'label' || d.type === 'zone' ? (
          <text
            key={d.id}
            x={d.x + d.w / 2}
            y={d.y + d.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className={
              d.type === 'zone'
                ? 'fill-muted-foreground/70 text-[1.5px] tracking-wide'
                : 'fill-primary text-[1.6px] font-semibold'
            }
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
                onClick={clickable && !editing ? () => onSpotClick?.(id) : undefined}
                className={cn(clickable && !editing && 'cursor-pointer')}
              >
                {/* larger invisible hit area for fingers */}
                {clickable && !editing && <circle cx={stool.x} cy={stool.y} r={2.4} className="fill-transparent" />}
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
            onClick={clickable && !editing ? () => onSpotClick?.(t.id) : undefined}
            onPointerDown={editing ? (e) => startDrag(e, t) : undefined}
            onPointerMove={editing ? (e) => moveDrag(e, t) : undefined}
            onPointerUp={editing ? () => endDrag(t) : undefined}
            onPointerCancel={editing ? () => (drag.current = null) : undefined}
            className={cn(clickable && 'cursor-pointer', editing && 'cursor-grab touch-none active:cursor-grabbing')}
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
