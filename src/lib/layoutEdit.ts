/**
 * Editing the floor plan: move, add, change and remove tables.
 * All functions return a new layout (the editor keeps a draft until "save").
 */
import type { FloorLayout, Rect, SpotShape, TableSpot } from '@/types'

/** Table size on the map (grid units) by seats and shape. */
export function tableSize(seats: number, shape: SpotShape): { w: number; h: number } {
  const base = seats <= 2 ? 5.5 : seats === 3 ? 6 : seats === 4 ? 7 : 7 + (seats - 4) * 0.75
  if (shape === 'rect') return { w: Math.round(base * 1.5 * 2) / 2, h: Math.round(base * 0.8 * 2) / 2 }
  return { w: base, h: base }
}

const isTable = (s: FloorLayout['spots'][number]): s is TableSpot => s.kind === 'table'

export const tablesIn = (layout: FloorLayout) => layout.spots.filter(isTable)

function mapTables(layout: FloorLayout, fn: (t: TableSpot) => TableSpot): FloorLayout {
  return { ...layout, spots: layout.spots.map((s) => (isTable(s) ? fn(s) : s)) }
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

export function moveTable(layout: FloorLayout, id: string, x: number, y: number): FloorLayout {
  return mapTables(layout, (t) =>
    t.id === id ? { ...t, x: clamp(x, 0, layout.width - t.w), y: clamp(y, 0, layout.height - t.h) } : t,
  )
}

/** Change seats / shape / number. Size follows seats and shape; the table stays centred where it was. */
export function updateTable(
  layout: FloorLayout,
  id: string,
  changes: Partial<Pick<TableSpot, 'seats' | 'shape' | 'label'>>,
): FloorLayout {
  return mapTables(layout, (t) => {
    if (t.id !== id) return t
    const next = { ...t, ...changes }
    const { w, h } = tableSize(next.seats, next.shape)
    const cx = t.x + t.w / 2
    const cy = t.y + t.h / 2
    return {
      ...next,
      w,
      h,
      x: clamp(cx - w / 2, 0, layout.width - w),
      y: clamp(cy - h / 2, 0, layout.height - h),
    }
  })
}

/** Next free table number: one more than the highest number used. */
export function nextTableNumber(layout: FloorLayout): number {
  const numbers = tablesIn(layout).map((t) => Number(t.label)).filter(Number.isFinite)
  return numbers.length ? Math.max(...numbers) + 1 : 1
}

/** Everything a new table must not cover: tables, bar counter, stools, walls, door. */
function obstacles(layout: FloorLayout): Rect[] {
  const rects: Rect[] = []
  for (const s of layout.spots) {
    if (s.kind === 'table') rects.push(s)
    else {
      rects.push(...s.segments)
      for (const st of s.stools) rects.push({ x: st.x - 1.7, y: st.y - 1.7, w: 3.4, h: 3.4 })
    }
  }
  for (const d of layout.decor) if (d.type === 'wall' || d.type === 'door') rects.push(d)
  return rects
}

const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad

/** First empty place for a w x h table, scanning from the bottom-middle outwards. */
export function findFreeSpot(layout: FloorLayout, w: number, h: number): { x: number; y: number } {
  const taken = obstacles(layout)
  const xs: number[] = []
  const mid = (layout.width - w) / 2
  for (let d = 0; d <= layout.width; d += 1) xs.push(mid - d, mid + d)
  for (let y = layout.height - h - 0.5; y >= 0.5; y -= 1) {
    for (const x of xs) {
      if (x < 0.5 || x > layout.width - w - 0.5) continue
      const r = { x, y, w, h }
      if (!taken.some((o) => overlaps(r, o, 0.8))) return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 }
    }
  }
  return { x: Math.round(mid), y: Math.round(layout.height - h - 1) }
}

/** New table in an empty place on the map; the owner then drags it where it really is. */
export function addTable(layout: FloorLayout, seats = 2): { layout: FloorLayout; id: string } {
  const n = nextTableNumber(layout)
  let id = `T${n}`
  for (let i = 2; layout.spots.some((s) => s.id === id); i++) id = `T${n}-${i}`
  const { w, h } = tableSize(seats, 'square')
  const { x, y } = findFreeSpot(layout, w, h)
  const table: TableSpot = { id, kind: 'table', label: String(n), seats, shape: 'square', w, h, x, y }
  return { layout: { ...layout, spots: [...layout.spots, table] }, id }
}

export function removeTable(layout: FloorLayout, id: string): FloorLayout {
  return { ...layout, spots: layout.spots.filter((s) => s.id !== id) }
}

/** Table numbers used more than once (staff call tables by number, so they must be unique). */
export function duplicateLabels(layout: FloorLayout): string[] {
  const seen = new Map<string, number>()
  for (const t of tablesIn(layout)) seen.set(t.label, (seen.get(t.label) ?? 0) + 1)
  return [...seen].filter(([, n]) => n > 1).map(([label]) => label)
}
