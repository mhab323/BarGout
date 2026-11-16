import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { freeStoolRuns, longestFreeRun, pickStools, rankCandidates, stoolsFrom } from '@/lib/matching'
import type { Party, SeatingPref } from '@/types'

let minute = 0
/** A waiting group; each new one joins a minute after the previous. */
const group = (name: string, size: number, pref: SeatingPref = 'any', status: Party['status'] = 'waiting'): Party => ({
  id: name,
  name,
  size,
  phone: null,
  pref,
  source: 'staff',
  status,
  guestUid: null,
  note: null,
  joinedAt: Timestamp.fromMillis(Date.UTC(2026, 10, 16, 20, minute++)),
  notifiedAt: null,
  seatedAt: null,
  billAt: null,
  endedAt: null,
  spotIds: [],
  timeLimited: false,
  limitStartAt: null,
})

const names = (list: { party: Party }[]) => list.map((c) => c.party.name)

describe('table freeing up', () => {
  it('a table for 2 goes to the first group of 2, even if a group of 4 is first in line', () => {
    const line = [group('Cohen (4)', 4), group('Levi (2)', 2), group('Mizrahi (2)', 2)]
    const ranked = rankCandidates({ kind: 'table', seats: 2 }, line)
    expect(names(ranked)).toEqual(['Levi (2)', 'Mizrahi (2)'])
  })

  it('a table for 4 goes to the first group in line that fits, even a couple', () => {
    const line = [group('Levi (2)', 2), group('Cohen (4)', 4)]
    const ranked = rankCandidates({ kind: 'table', seats: 4 }, line)
    expect(names(ranked)).toEqual(['Levi (2)', 'Cohen (4)'])
    expect(ranked[0].reason).toBe('fits')
  })

  it('a group of 4 first in line gets the table for 4', () => {
    const line = [group('Cohen (4)', 4), group('Levi (2)', 2)]
    expect(rankCandidates({ kind: 'table', seats: 4 }, line)[0].party.name).toBe('Cohen (4)')
  })

  it('groups that are too big are never suggested', () => {
    const line = [group('Big (6)', 6), group('Cohen (4)', 4)]
    expect(names(rankCandidates({ kind: 'table', seats: 3 }, line))).toEqual([])
  })

  it('the table for 3 skips a group of 4 and goes to the first group that fits', () => {
    const line = [group('Cohen (4)', 4), group('Peretz (3)', 3)]
    expect(rankCandidates({ kind: 'table', seats: 3 }, line)[0].party.name).toBe('Peretz (3)')
  })

  it('groups that asked for the bar come last for a table, as an option only', () => {
    const line = [group('Bar lovers (2)', 2, 'bar'), group('Levi (2)', 2, 'table')]
    const ranked = rankCandidates({ kind: 'table', seats: 2 }, line)
    expect(names(ranked)).toEqual(['Levi (2)', 'Bar lovers (2)'])
    expect(ranked[1].reason).toBe('other-pref')
  })

  it('only groups still waiting are suggested (not already called, seated or gone)', () => {
    const line = [
      group('Called', 2, 'any', 'notified'),
      group('Sitting', 2, 'any', 'seated'),
      group('Left', 2, 'any', 'left'),
      group('Waiting', 2),
    ]
    expect(names(rankCandidates({ kind: 'table', seats: 2 }, line))).toEqual(['Waiting'])
  })

  it('keeps first-come-first-served inside the same tier', () => {
    const line = [group('A (2)', 2), group('B (2)', 2), group('C (2)', 2)]
    expect(names(rankCandidates({ kind: 'table', seats: 2 }, line))).toEqual(['A (2)', 'B (2)', 'C (2)'])
  })
})

describe('bar stools', () => {
  const stools = Array.from({ length: 12 }, (_, i) => i + 1)

  it('finds rows of free stools next to each other', () => {
    expect(freeStoolRuns(stools, new Set([3, 4, 8, 9, 10, 11, 12]))).toEqual([[1, 2], [5, 6, 7]])
    expect(longestFreeRun(stools, new Set([3, 4, 8, 9, 10, 11, 12]))).toBe(3)
  })

  it('a group of 2 can take 2 free stools next to each other', () => {
    const line = [group('Cohen (4)', 4), group('Levi (2)', 2, 'bar')]
    const ranked = rankCandidates({ kind: 'bar', freeRun: 2 }, line)
    expect(names(ranked)).toEqual(['Levi (2)'])
  })

  it('picks the smallest gap that fits, keeping bigger gaps for bigger groups', () => {
    // free: 1-2 (gap of 2) and 5-7 (gap of 3)
    const occupied = new Set([3, 4, 8, 9, 10, 11, 12])
    expect(pickStools(stools, occupied, 2)).toEqual([1, 2])
    expect(pickStools(stools, occupied, 3)).toEqual([5, 6, 7])
    expect(pickStools(stools, occupied, 4)).toBeNull()
  })
  it('walk-ins at the bar: takes the tapped stool and the free ones next to it', () => {
    const occupied = new Set([1, 2, 8])
    expect(stoolsFrom(stools, occupied, 5, 1)).toEqual([5])
    expect(stoolsFrom(stools, occupied, 5, 2)).toEqual([5, 6])
    // near the end of a free row it takes the stools before
    expect(stoolsFrom(stools, occupied, 7, 3)).toEqual([5, 6, 7])
    // row 3-7 has only 5 stools
    expect(stoolsFrom(stools, occupied, 4, 6)).toBeNull()
  })
})
