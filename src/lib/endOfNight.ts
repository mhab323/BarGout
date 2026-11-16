/**
 * "End of night": every group of the evening becomes an anonymous history record
 * (times, size, outcome - no name, no phone), and the group itself is deleted.
 * The public queue is reset: empty, QR join off, busy mode off.
 */
import { getDocs, serverTimestamp, Timestamp, writeBatch, doc, collection } from 'firebase/firestore'

import { partiesCol, partyRef, queueRef } from '@/lib/db'
import { db } from '@/lib/firebase'
import type { Party, PartyHistory, PartyStatus } from '@/types'

const minutesBetween = (a: Timestamp | null, b: Timestamp | null) =>
  a && b ? Math.max(0, Math.round((b.toMillis() - a.toMillis()) / 60000)) : null

/** Business day: a night that goes past midnight still counts for the day it started (before 6am = yesterday). */
export function businessDay(ms: number): string {
  const d = new Date(ms - 6 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** One group -> anonymous record. Groups still on the list or sitting are closed now. */
export function toHistory(party: Party, nowMs: number): PartyHistory {
  const now = Timestamp.fromMillis(nowMs)
  const outcome: PartyStatus =
    party.status === 'seated' ? 'done' : party.status === 'waiting' || party.status === 'notified' ? 'left' : party.status
  const endedAt = party.endedAt ?? now
  return {
    dayKey: businessDay(party.joinedAt?.toMillis() ?? nowMs),
    size: party.size,
    pref: party.pref,
    source: party.source,
    outcome,
    joinedAt: party.joinedAt ?? now,
    notifiedAt: party.notifiedAt ?? null,
    seatedAt: party.seatedAt ?? null,
    billAt: party.billAt ?? null,
    endedAt,
    spotIds: party.spotIds ?? [],
    timeLimited: Boolean(party.timeLimited),
    // walk-ins (no list) did not wait
    waitMinutes: party.seatedAt && party.joinedAt.toMillis() !== party.seatedAt.toMillis() ? minutesBetween(party.joinedAt, party.seatedAt) : party.seatedAt ? 0 : null,
    stayMinutes: party.seatedAt ? minutesBetween(party.seatedAt, endedAt) : null,
  }
}

export interface EndOfNightResult {
  groups: number
  people: number
  seated: number
}

export async function endOfNight(): Promise<EndOfNightResult> {
  const snap = await getDocs(partiesCol)
  const parties = snap.docs.map((d) => d.data())
  const now = Date.now()

  // Firestore batches hold up to 500 writes; each group = 1 history write + 1 delete.
  const chunks: Party[][] = []
  for (let i = 0; i < parties.length; i += 200) chunks.push(parties.slice(i, i + 200))
  for (const chunk of chunks) {
    const batch = writeBatch(db)
    for (const party of chunk) {
      batch.set(doc(collection(db, 'history')), toHistory(party, now))
      batch.delete(partyRef(party.id))
    }
    await batch.commit()
  }

  const reset = writeBatch(db)
  reset.set(queueRef, { order: [], qrJoinOpen: false, busyMode: false, busySince: null, updatedAt: serverTimestamp() } as never)
  await reset.commit()

  return {
    groups: parties.length,
    people: parties.reduce((sum, p) => sum + p.size, 0),
    seated: parties.filter((p) => p.seatedAt).length,
  }
}
