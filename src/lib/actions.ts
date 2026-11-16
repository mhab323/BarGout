/** Everything staff can do to the list, as small Firestore writes. */
import { addDoc, serverTimestamp, setDoc, updateDoc, type FieldValue } from 'firebase/firestore'

import { partiesCol, partyRef, queueRef, settingsRef, layoutRef } from '@/lib/db'
import { DEFAULT_LAYOUT, DEFAULT_SETTINGS } from '@/lib/defaults'
import type { FloorLayout, Party, SeatingPref } from '@/types'

type Writable<T> = { [K in keyof T]: T[K] | FieldValue }

export interface NewGroup {
  name: string
  size: number
  pref: SeatingPref
  /** Already normalized (international digits) or null. */
  phone: string | null
}

/** Staff adds a group by hand at the door. */
export function addGroup(group: NewGroup) {
  const party: Writable<Omit<Party, 'id'>> = {
    name: group.name.trim(),
    size: group.size,
    phone: group.phone,
    pref: group.pref,
    source: 'staff',
    status: 'waiting',
    guestUid: null,
    note: null,
    joinedAt: serverTimestamp(),
    notifiedAt: null,
    seatedAt: null,
    billAt: null,
    endedAt: null,
    spotIds: [],
    timeLimited: false,
    limitStartAt: null,
  }
  return addDoc(partiesCol, party as unknown as Party)
}

/** WhatsApp sent: start the hold countdown. */
export const markNotified = (id: string) =>
  updateDoc(partyRef(id), { status: 'notified', notifiedAt: serverTimestamp() })

/** Undo "notified" (sent by mistake): back to waiting, keeps their place in line. */
export const backToWaiting = (id: string) => updateDoc(partyRef(id), { status: 'waiting', notifiedAt: null })

/** Called but did not come back in time. */
export const markNoShow = (id: string) => updateDoc(partyRef(id), { status: 'no_show', endedAt: serverTimestamp() })

/** Left the list (staff removed them). */
export const removeFromList = (id: string) => updateDoc(partyRef(id), { status: 'left', endedAt: serverTimestamp() })

/**
 * Seat a group at a table or bar stools. In busy mode the 2-hour limit starts now.
 */
export const seatGroup = (id: string, spotIds: string[], busyMode: boolean) =>
  updateDoc(partyRef(id), {
    status: 'seated',
    seatedAt: serverTimestamp(),
    spotIds,
    timeLimited: busyMode,
    limitStartAt: busyMode ? serverTimestamp() : null,
  })

// ---------- busy mode / QR join (public queue doc, readable by the guest page) ----------

export function ensureQueue() {
  return setDoc(
    queueRef,
    { order: [], qrJoinOpen: false, busyMode: false, busySince: null, updatedAt: serverTimestamp() } as never,
    { merge: true },
  )
}

export const setBusyMode = (on: boolean) =>
  setDoc(queueRef, { busyMode: on, busySince: on ? serverTimestamp() : null, updatedAt: serverTimestamp() } as never, {
    merge: true,
  })

export const setQrJoinOpen = (on: boolean) =>
  setDoc(queueRef, { qrJoinOpen: on, updatedAt: serverTimestamp() } as never, { merge: true })

/** Keep the public, name-free order in sync so guests see their live place in line. */
export const syncQueueOrder = (order: string[]) =>
  setDoc(queueRef, { order, updatedAt: serverTimestamp() } as never, { merge: true })

// ---------- floor plan ----------

/** Save the edited floor plan (tables moved inside/outside, added, removed). */
export const saveLayout = (layout: FloorLayout) => setDoc(layoutRef, layout)

// ---------- first run (owner) ----------

/** Write default settings and the traced floor plan the first time the owner opens the app. */
export async function bootstrapConfig(opts: { settings: boolean; layout: boolean }) {
  if (opts.settings) await setDoc(settingsRef, DEFAULT_SETTINGS)
  if (opts.layout) await setDoc(layoutRef, DEFAULT_LAYOUT)
}

