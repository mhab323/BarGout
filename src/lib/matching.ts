/**
 * Who should get a table (or bar stools) that is freeing up?
 *
 * The owner's rule: when a small table frees up, give it to the first group in line
 * that fits it, even if a bigger group has been waiting longer. The bigger group keeps
 * its place and gets the next table that fits them.
 *
 * Ranking for one free spot (only groups still "waiting", not already called):
 *   1. wants this kind of seat (or "either") AND fits   -> first come, first served
 *      (a couple first in line gets a free table for 4 - owner's decision)
 *   2. asked for the other kind of seat but fits        -> shown as an option only
 */
import type { Party, SeatingPref } from '@/types'

export type FreeSpot =
  | { kind: 'table'; seats: number }
  /** freeRun = longest row of free stools next to each other */
  | { kind: 'bar'; freeRun: number }

export type MatchReason = 'fits' | 'other-pref'

export interface Candidate {
  party: Party
  reason: MatchReason
}

const prefMatches = (pref: SeatingPref, kind: FreeSpot['kind']) => pref === 'any' || pref === kind

function capacity(spot: FreeSpot) {
  return spot.kind === 'table' ? spot.seats : spot.freeRun
}

function tierOf(party: Party, spot: FreeSpot): MatchReason | null {
  if (party.size > capacity(spot)) return null
  return prefMatches(party.pref, spot.kind) ? 'fits' : 'other-pref'
}

const tierRank: Record<MatchReason, number> = { fits: 0, 'other-pref': 1 }

/** Waiting groups sorted by who joined first. */
export function inLineOrder(parties: Party[]): Party[] {
  return parties
    .filter((p) => p.status === 'waiting')
    .sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis())
}

/** All groups that could take this spot, best suggestion first. */
export function rankCandidates(spot: FreeSpot, parties: Party[]): Candidate[] {
  const line = inLineOrder(parties)
  return line
    .map((party, index) => ({ party, index, reason: tierOf(party, spot) }))
    .filter((c): c is { party: Party; index: number; reason: MatchReason } => c.reason !== null)
    .sort((a, b) => tierRank[a.reason] - tierRank[b.reason] || a.index - b.index)
    .map(({ party, reason }) => ({ party, reason }))
}

// ---------- bar stools ----------

/** Rows of free stools next to each other, e.g. [[1,2],[5,6,7]]. Stool numbers follow the counter. */
export function freeStoolRuns(stoolNumbers: number[], occupied: Set<number>): number[][] {
  const runs: number[][] = []
  let current: number[] = []
  for (const n of [...stoolNumbers].sort((a, b) => a - b)) {
    const isFree = !occupied.has(n)
    const continues = current.length > 0 && current[current.length - 1] === n - 1
    if (isFree && (continues || current.length === 0)) {
      current.push(n)
    } else {
      if (current.length) runs.push(current)
      current = isFree ? [n] : []
    }
  }
  if (current.length) runs.push(current)
  return runs
}

export function longestFreeRun(stoolNumbers: number[], occupied: Set<number>): number {
  return Math.max(0, ...freeStoolRuns(stoolNumbers, occupied).map((r) => r.length))
}

/**
 * Pick stools for a group of `size`: the smallest free row that fits, so big gaps stay
 * open for bigger groups. Returns the stool numbers, or null if they don't fit.
 */
export function pickStools(stoolNumbers: number[], occupied: Set<number>, size: number): number[] | null {
  const runs = freeStoolRuns(stoolNumbers, occupied).filter((r) => r.length >= size)
  if (!runs.length) return null
  runs.sort((a, b) => a.length - b.length || a[0] - b[0])
  return runs[0].slice(0, size)
}
