import { describe, expect, it } from 'vitest'

import { DEFAULT_LAYOUT, totalSeats } from '@/lib/defaults'
import { addTable, duplicateLabels, moveTable, nextTableNumber, removeTable, tablesIn, updateTable } from '@/lib/layoutEdit'

const table = (layout: typeof DEFAULT_LAYOUT, id: string) => tablesIn(layout).find((t) => t.id === id)!

describe('editing the floor plan', () => {
  it('moves a table (e.g. from inside to outside)', () => {
    const moved = moveTable(DEFAULT_LAYOUT, 'T5', 10, 12)
    expect(table(moved, 'T5')).toMatchObject({ x: 10, y: 12, label: '5', seats: 4 })
    // the original is untouched
    expect(table(DEFAULT_LAYOUT, 'T5').x).not.toBe(10)
  })

  it('keeps tables inside the map', () => {
    const moved = moveTable(DEFAULT_LAYOUT, 'T5', -20, 500)
    const t = table(moved, 'T5')
    expect(t.x).toBe(0)
    expect(t.y).toBe(DEFAULT_LAYOUT.height - t.h)
  })

  it('changing seats resizes the table around its centre and updates the total', () => {
    const before = table(DEFAULT_LAYOUT, 'T7')
    const changed = updateTable(DEFAULT_LAYOUT, 'T7', { seats: 4 })
    const after = table(changed, 'T7')
    expect(after.seats).toBe(4)
    expect(after.w).toBeGreaterThan(before.w)
    expect(after.x + after.w / 2).toBeCloseTo(before.x + before.w / 2)
    expect(totalSeats(changed)).toBe(totalSeats(DEFAULT_LAYOUT) + 2)
  })

  it('adds a table with the next number', () => {
    expect(nextTableNumber(DEFAULT_LAYOUT)).toBe(12)
    const { layout, id } = addTable(DEFAULT_LAYOUT, 2)
    expect(table(layout, id)).toMatchObject({ label: '12', seats: 2 })
    expect(totalSeats(layout)).toBe(47)
  })

  it('puts a new table in an empty place, not on top of the bar or another table', () => {
    let layout = DEFAULT_LAYOUT
    for (let i = 0; i < 3; i++) layout = addTable(layout, 4).layout
    const tables = tablesIn(layout)
    const added = tables.filter((t) => Number(t.label) >= 12)
    expect(added).toHaveLength(3)
    const bar = DEFAULT_LAYOUT.spots.find((s) => s.kind === 'bar')!
    const rects = [...tables, ...(bar.kind === 'bar' ? bar.segments : [])]
    for (const t of added) {
      for (const r of rects) {
        if (r === t) continue
        const hit = t.x < r.x + r.w && r.x < t.x + t.w && t.y < r.y + r.h && r.y < t.y + t.h
        expect(hit, `table ${t.label} overlaps`).toBe(false)
      }
    }
  })

  it('removes a table', () => {
    const layout = removeTable(DEFAULT_LAYOUT, 'T3')
    expect(tablesIn(layout).map((t) => t.label)).not.toContain('3')
    expect(totalSeats(layout)).toBe(43)
  })

  it('finds duplicate table numbers', () => {
    expect(duplicateLabels(DEFAULT_LAYOUT)).toEqual([])
    expect(duplicateLabels(updateTable(DEFAULT_LAYOUT, 'T7', { label: '5' }))).toEqual(['5'])
  })
})
