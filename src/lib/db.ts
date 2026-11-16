/** Firestore paths and typed converters. */
import {
  collection,
  doc,
  type DocumentReference,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { FloorLayout, Party, PublicQueue, Settings, StaffMember } from '@/types'

const passthrough = <T extends object>(): FirestoreDataConverter<T> => ({
  toFirestore: (data) => data as Record<string, unknown>,
  // 'estimate': a time we just wrote shows right away instead of null until the server confirms
  fromFirestore: (snap: QueryDocumentSnapshot) => snap.data({ serverTimestamps: 'estimate' }) as T,
})

/** Parties carry their document id; it is not stored inside the document. */
const partyConverter: FirestoreDataConverter<Party> = {
  toFirestore: (party) => {
    const { id: _id, ...rest } = party as Party
    return rest
  },
  fromFirestore: (snap: QueryDocumentSnapshot) => ({
    id: snap.id,
    ...(snap.data({ serverTimestamps: 'estimate' }) as Omit<Party, 'id'>),
  }),
}

export const settingsRef = doc(db, 'config', 'settings').withConverter(passthrough<Settings>())
export const layoutRef = doc(db, 'config', 'layout').withConverter(passthrough<FloorLayout>())
export const queueRef = doc(db, 'public', 'queue').withConverter(passthrough<PublicQueue>())
export const partiesCol = collection(db, 'parties').withConverter(partyConverter)
export const partyRef = (id: string) => doc(partiesCol, id)
export const staffRef = (uid: string): DocumentReference<StaffMember> =>
  doc(db, 'staff', uid).withConverter(passthrough<StaffMember>())
