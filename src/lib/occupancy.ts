import type { BarSpot, FloorLayout, Party, TableSpot } from '@/types'
import { barSeatId } from '@/types'

/** spotId ("T5" / "BAR:3") -> the group sitting there. */
export function occupiedSpots(seated: Party[]): Map<string, Party> {
  const map = new Map<string, Party>()
  for (const party of seated) for (const id of party.spotIds) map.set(id, party)
  return map
}

export const tablesOf = (layout: FloorLayout) => layout.spots.filter((s): s is TableSpot => s.kind === 'table')
export const barsOf = (layout: FloorLayout) => layout.spots.filter((s): s is BarSpot => s.kind === 'bar')

/** Stool numbers taken at a bar. */
export function occupiedStools(bar: BarSpot, occupied: Map<string, Party>): Set<number> {
  return new Set(bar.stools.map((s) => s.n).filter((n) => occupied.has(barSeatId(bar.id, n))))
}

/** "שולחן 5" / "בר 5–6" / "בר 3, 7" for a list of spot ids. */
export function describeSpots(spotIds: string[], layout: FloorLayout): string {
  if (!spotIds.length) return ''
  const tables = tablesOf(layout)
  const tableLabels = spotIds.map((id) => tables.find((t) => t.id === id)?.label).filter(Boolean)
  const stools = spotIds
    .filter((id) => id.includes(':'))
    .map((id) => Number(id.split(':')[1]))
    .sort((a, b) => a - b)
  const parts: string[] = []
  if (tableLabels.length) parts.push(`שולחן ${tableLabels.join(', ')}`)
  if (stools.length) {
    const consecutive = stools.every((n, i) => i === 0 || n === stools[i - 1] + 1)
    parts.push(`בר ${consecutive && stools.length > 1 ? `${stools[0]}–${stools[stools.length - 1]}` : stools.join(', ')}`)
  }
  return parts.join(' + ')
}

/** Seats in a selection: a table's capacity, or one per stool. */
export function seatsIn(spotIds: string[], layout: FloorLayout): number {
  const tables = tablesOf(layout)
  return spotIds.reduce((sum, id) => sum + (id.includes(':') ? 1 : (tables.find((t) => t.id === id)?.seats ?? 0)), 0)
}
