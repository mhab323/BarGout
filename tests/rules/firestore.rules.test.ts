/**
 * Security rules tests. Run with: npm run test:rules
 * (starts the Firestore emulator, runs these tests, stops it)
 */
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const OWNER = 'owner-uid'
const STAFF = 'staff-uid'
const GUEST = 'guest-uid'
const OTHER_GUEST = 'other-guest-uid'

const guestParty = (uid: string, extra: Record<string, unknown> = {}) => ({
  name: 'דנה',
  size: 2,
  phone: '972501234567',
  pref: 'any',
  source: 'qr',
  status: 'waiting',
  guestUid: uid,
  note: null,
  joinedAt: serverTimestamp(),
  notifiedAt: null,
  seatedAt: null,
  billAt: null,
  endedAt: null,
  spotIds: [],
  timeLimited: false,
  limitStartAt: null,
  ...extra,
})

const staffParty = (extra: Record<string, unknown> = {}) => ({
  ...guestParty('', { source: 'staff', guestUid: null, phone: null }),
  ...extra,
})

async function seed(qrJoinOpen: boolean) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'staff', OWNER), { role: 'owner', name: 'Owner' })
    await setDoc(doc(db, 'staff', STAFF), { role: 'staff', name: 'Tablet' })
    await setDoc(doc(db, 'public', 'queue'), {
      order: [],
      qrJoinOpen,
      busyMode: true,
      busySince: null,
      updatedAt: Timestamp.now(),
    })
    await setDoc(doc(db, 'config', 'settings'), { busyMode: true })
    await setDoc(doc(db, 'parties', 'p1'), { ...staffParty(), joinedAt: Timestamp.now() })
  })
}

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bargout',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

describe('guests (QR page)', () => {
  beforeEach(() => seed(true))

  it('can join when QR join is open', async () => {
    await assertSucceeds(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST)))
  })

  it('cannot join when QR join is closed', async () => {
    await seed(false)
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST)))
  })

  it('cannot join without signing in', async () => {
    await assertFails(setDoc(doc(as(null), 'parties', GUEST), guestParty(GUEST)))
  })

  it('cannot use someone else id', async () => {
    await assertFails(setDoc(doc(as(GUEST), 'parties', OTHER_GUEST), guestParty(GUEST)))
  })

  it('cannot add themselves as already seated or notified', async () => {
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { status: 'seated' })))
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { status: 'notified' })))
  })

  it('cannot fake the join time (to jump the line)', async () => {
    const early = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { joinedAt: early })))
  })

  it('must give a valid phone, name and group size', async () => {
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { phone: 'abc' })))
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { name: '' })))
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { size: 0 })))
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { size: 30 })))
  })

  it('cannot add extra fields', async () => {
    await assertFails(setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST, { vip: true })))
  })

  it('can read their own entry, even before it exists', async () => {
    await assertSucceeds(getDoc(doc(as(GUEST), 'parties', GUEST)))
    await setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST))
    await assertSucceeds(getDoc(doc(as(GUEST), 'parties', GUEST)))
  })

  it("cannot read other people's entries (names and phones stay private)", async () => {
    await assertFails(getDoc(doc(as(GUEST), 'parties', 'p1')))
    await assertFails(getDoc(doc(as(GUEST), 'parties', OTHER_GUEST)))
    await assertFails(getDoc(doc(as(null), 'parties', 'p1')))
  })

  it('can leave the list', async () => {
    await setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST))
    await assertSucceeds(
      updateDoc(doc(as(GUEST), 'parties', GUEST), { status: 'left', endedAt: serverTimestamp() }),
    )
  })

  it('cannot change anything else on their entry', async () => {
    await setDoc(doc(as(GUEST), 'parties', GUEST), guestParty(GUEST))
    await assertFails(updateDoc(doc(as(GUEST), 'parties', GUEST), { size: 6 }))
    await assertFails(updateDoc(doc(as(GUEST), 'parties', GUEST), { status: 'seated' }))
    await assertFails(deleteDoc(doc(as(GUEST), 'parties', GUEST)))
  })

  it('can read the public queue and settings, but not change them', async () => {
    await assertSucceeds(getDoc(doc(as(null), 'public', 'queue')))
    await assertSucceeds(getDoc(doc(as(null), 'config', 'settings')))
    await assertFails(updateDoc(doc(as(GUEST), 'public', 'queue'), { qrJoinOpen: false }))
    await assertFails(updateDoc(doc(as(GUEST), 'config', 'settings'), { busyMode: false }))
  })

  it('cannot read or change the layout, staff list or stats', async () => {
    await assertFails(setDoc(doc(as(GUEST), 'config', 'layout'), { spots: [] }))
    await assertFails(getDoc(doc(as(GUEST), 'config', 'layout')))
    await assertFails(getDoc(doc(as(GUEST), 'staff', OWNER)))
    await assertFails(getDoc(doc(as(GUEST), 'history', 'h1')))
  })

  it('cannot make themselves staff', async () => {
    await assertFails(setDoc(doc(as(GUEST), 'staff', GUEST), { role: 'owner', name: 'me' }))
  })
})

describe('staff (tablets)', () => {
  beforeEach(() => seed(false))

  it('can add a group by hand even when QR join is closed', async () => {
    await assertSucceeds(setDoc(doc(as(STAFF), 'parties', 'p2'), staffParty()))
  })

  it('can read and update any group', async () => {
    await assertSucceeds(getDoc(doc(as(STAFF), 'parties', 'p1')))
    await assertSucceeds(updateDoc(doc(as(STAFF), 'parties', 'p1'), { status: 'notified', notifiedAt: serverTimestamp() }))
  })

  it('can toggle busy mode / QR join on the public queue', async () => {
    await assertSucceeds(updateDoc(doc(as(STAFF), 'public', 'queue'), { qrJoinOpen: true, busyMode: true }))
  })

  it('can move tables (save the floor plan)', async () => {
    await assertSucceeds(setDoc(doc(as(STAFF), 'config', 'layout'), { spots: [] }))
  })

  it('cannot change settings or staff (owner only)', async () => {
    await assertFails(updateDoc(doc(as(STAFF), 'config', 'settings'), { holdMinutes: 30 }))
    await assertFails(setDoc(doc(as(STAFF), 'staff', 'x'), { role: 'owner', name: 'x' }))
  })

  it('can write anonymous history, but never with names or phones', async () => {
    await assertSucceeds(setDoc(doc(as(STAFF), 'history', 'h1'), { size: 2, outcome: 'done' }))
    await assertFails(setDoc(doc(as(STAFF), 'history', 'h2'), { size: 2, name: 'דנה' }))
    await assertFails(setDoc(doc(as(STAFF), 'history', 'h3'), { size: 2, phone: '972501234567' }))
  })

  it('cannot write a broken group', async () => {
    await assertFails(setDoc(doc(as(STAFF), 'parties', 'p3'), staffParty({ size: '2' })))
    await assertFails(setDoc(doc(as(STAFF), 'parties', 'p3'), staffParty({ status: 'eating' })))
  })
})

describe('owner', () => {
  beforeEach(() => seed(false))

  it('can change settings and layout and manage staff', async () => {
    await assertSucceeds(setDoc(doc(as(OWNER), 'config', 'settings'), { holdMinutes: 15 }))
    await assertSucceeds(setDoc(doc(as(OWNER), 'config', 'layout'), { spots: [] }))
    await assertSucceeds(setDoc(doc(as(OWNER), 'staff', 'new-tablet'), { role: 'staff', name: 'Tablet 2' }))
  })

  it('can read stats', async () => {
    await assertSucceeds(getDoc(doc(as(OWNER), 'history', 'h1')))
  })
})

describe('signed-in users who are not staff', () => {
  beforeEach(() => seed(false))

  it('see nothing private', async () => {
    const stranger = as('random-google-user')
    await assertFails(getDoc(doc(stranger, 'parties', 'p1')))
    await assertFails(getDoc(doc(stranger, 'config', 'layout')))
    await assertFails(setDoc(doc(stranger, 'parties', 'p9'), staffParty()))
  })
})
