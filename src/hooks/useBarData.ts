/**
 * Everything the staff screens need, live: settings, floor layout, the public queue state
 * (busy mode, QR join) and the groups that are on the list or sitting.
 */
import { query, where } from 'firebase/firestore'

import { layoutRef, partiesCol, queueRef, settingsRef } from '@/lib/db'
import { DEFAULT_LAYOUT, DEFAULT_SETTINGS } from '@/lib/defaults'
import { useLiveDoc, useLiveQuery } from '@/hooks/useFirestore'
import type { Party, Settings } from '@/types'

const activeQuery = query(partiesCol, where('status', 'in', ['waiting', 'notified', 'seated']))

export function useBarData() {
  const settings = useLiveDoc(settingsRef)
  const layout = useLiveDoc(layoutRef)
  const queue = useLiveDoc(queueRef)
  const parties = useLiveQuery(activeQuery, 'active-parties')

    // A join time not known yet sorts last.
  const joinMs = (p: Party) => p.joinedAt?.toMillis() ?? Number.MAX_SAFE_INTEGER
  const byJoin = (a: Party, b: Party) => joinMs(a) - joinMs(b)
  const list = parties.data.filter((p) => p.status === 'waiting' || p.status === 'notified').sort(byJoin)
  const seated = parties.data.filter((p) => p.status === 'seated')

  return {
    settings: { ...DEFAULT_SETTINGS, ...settings.data } as Settings,
    settingsExists: settings.exists,
    layout: layout.data ?? DEFAULT_LAYOUT,
    layoutExists: layout.exists,
    queue: queue.data,
    queueExists: queue.exists,
    busyMode: queue.data?.busyMode ?? false,
    qrJoinOpen: queue.data?.qrJoinOpen ?? false,
    /** On the list (waiting + called), first come first. */
    list,
    seated,
    all: parties.data,
    loading: settings.loading || layout.loading || queue.loading || parties.loading,
    error: settings.error ?? layout.error ?? queue.error ?? parties.error,
  }
}
