/**
 * Fill the LOCAL Firebase emulators with test accounts (and, with --demo, a busy evening).
 * Never touches the real project: it only talks to 127.0.0.1.
 *
 *   owner:  owner@bargout.test  / bargout123   (role owner)
 *   tablet: tablet@bargout.test / bargout123   (role staff)
 */
const PROJECT = 'demo-bargout'
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const PASSWORD = 'bargout123'
const demo = process.argv.includes('--demo')

/** JS value -> Firestore REST value */
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } }
  return { stringValue: String(v) }
}
const toFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]))

async function setDoc(path, data) {
  const res = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, // emulator admin
    body: JSON.stringify({ fields: toFields(data) }),
  })
  if (!res.ok) throw new Error(`write ${path}: ${res.status} ${await res.text()}`)
}

async function account(email) {
  const body = JSON.stringify({ email, password: PASSWORD, returnSecureToken: true })
  const headers = { 'Content-Type': 'application/json' }
  let res = await fetch(`${AUTH}/accounts:signUp?key=demo`, { method: 'POST', headers, body })
  if (!res.ok) res = await fetch(`${AUTH}/accounts:signInWithPassword?key=demo`, { method: 'POST', headers, body })
  if (!res.ok) throw new Error(`account ${email}: ${res.status} ${await res.text()}`)
  return (await res.json()).localId
}

const ago = (min) => new Date(Date.now() - min * 60000)
let n = 0
function party(data) {
  return {
    name: '', size: 2, phone: null, pref: 'any', source: 'staff', status: 'waiting', guestUid: null, note: null,
    joinedAt: ago(0), notifiedAt: null, seatedAt: null, billAt: null, endedAt: null,
    spotIds: [], timeLimited: false, limitStartAt: null,
    ...data,
  }
}

async function main() {
  const owner = await account('owner@bargout.test')
  const tablet = await account('tablet@bargout.test')
  await setDoc(`staff/${owner}`, { role: 'owner', name: 'Owner' })
  await setDoc(`staff/${tablet}`, { role: 'staff', name: 'Tablet' })

  if (demo) {
    // Busy evening: busy mode on for 3 hours, tables at different times.
    await setDoc('public/queue', { order: [], qrJoinOpen: true, busyMode: true, busySince: ago(180), updatedAt: ago(0) })
    const seated = [
      { name: 'משפחת כהן', size: 4, spotIds: ['T4'], min: 40 }, // green
      { name: 'רון ומאיה', size: 2, spotIds: ['T1'], min: 95 }, // yellow
      { name: 'חברים מהעבודה', size: 4, spotIds: ['T8'], min: 115, bill: true }, // red, asked for the bill
      { name: '', size: 2, spotIds: ['T2'], min: 130 }, // over time, walk-in without a name
      { name: 'אורי', size: 2, spotIds: ['BAR:5', 'BAR:6'], min: 20 },
      { name: '', size: 3, spotIds: ['BAR:9', 'BAR:10', 'BAR:11'], min: 100 },
    ]
    for (const s of seated) {
      await setDoc(`parties/demo-seated-${++n}`, party({
        name: s.name, size: s.size, status: 'seated', spotIds: s.spotIds,
        joinedAt: ago(s.min + 10), seatedAt: ago(s.min), billAt: s.bill ? ago(2) : null, timeLimited: true,
      }))
    }
    const waiting = [
      { name: 'משפחת לוי', size: 4, pref: 'table', phone: '972501234567', min: 25, notified: 12 }, // called, hold over
      { name: 'דנה', size: 2, pref: 'any', phone: '972521112233', min: 18 },
      { name: 'יוסי וחברים', size: 3, pref: 'table', phone: null, min: 12 },
      { name: 'נועה', size: 2, pref: 'bar', phone: '972541234567', min: 5, source: 'qr' },
    ]
    for (const w of waiting) {
      await setDoc(`parties/demo-waiting-${++n}`, party({
        name: w.name, size: w.size, pref: w.pref, phone: w.phone, source: w.source ?? 'staff',
        status: w.notified ? 'notified' : 'waiting', joinedAt: ago(w.min), notifiedAt: w.notified ? ago(w.notified) : null,
      }))
    }
  }

  console.log('\n  Local test data ready' + (demo ? ' (busy evening demo)' : '') + ':')
  console.log('    owner : owner@bargout.test  / ' + PASSWORD)
  console.log('    tablet: tablet@bargout.test / ' + PASSWORD + '\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
