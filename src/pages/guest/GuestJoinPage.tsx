/**
 * Guest page, opened from the QR code at the door. No login: the guest is signed in
 * anonymously, and their list entry id is that anonymous id (one entry per phone).
 * They only ever see their own entry and their place in line - never other guests.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { Loader2, LogOut, Users } from 'lucide-react'

import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLiveDoc } from '@/hooks/useFirestore'
import { useNow } from '@/hooks/useNow'
import { joinAsGuest, leaveAsGuest } from '@/lib/actions'
import { partyRef, queueRef, settingsRef } from '@/lib/db'
import { DEFAULT_SETTINGS } from '@/lib/defaults'
import { auth } from '@/lib/firebase'
import { clock, prefLabel } from '@/lib/format'
import { fillTemplate, normalizePhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { Party, SeatingPref, Settings } from '@/types'

const PREFS: SeatingPref[] = ['any', 'bar', 'table']

/** Why the invisible guest sign-in failed, in words the owner can act on. */
// eslint-disable-next-line react-refresh/only-export-components
export function guestSignInProblem(code: string): { emoji: string; title: string; text: string } {
  if (code.includes('admin-restricted-operation') || code.includes('operation-not-allowed'))
    return {
      emoji: '🔒',
      title: 'ההרשמה דרך הטלפון עוד לא הופעלה',
      text: 'לבעלים: Firebase → Authentication → Sign-in method → Anonymous → Enable',
    }
  if (code.includes('network-request-failed')) return { emoji: '📶', title: 'אין חיבור', text: 'בדקו את האינטרנט ונסו שוב.' }
  if (code.includes('too-many-requests')) return { emoji: '⏳', title: 'יותר מדי ניסיונות', text: 'נסו שוב בעוד דקה.' }
  return { emoji: '😕', title: 'משהו השתבש', text: 'נסו שוב, או פנו אלינו בכניסה.' }
}

function limitNote(settings: Settings) {
  const hours = settings.tableLimitMinutes / 60
  return fillTemplate(settings.messages.timeLimitNote, { hours: Number.isInteger(hours) ? hours : hours.toFixed(1) })
}

export function GuestJoinPage() {
  const [uid, setUid] = useState<string | null>(null)
  /** Firebase error code when the invisible guest sign-in failed. */
  const [authError, setAuthError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Sign in anonymously (invisible to the guest). Keep an existing session (e.g. a staff tablet testing).
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setUid(user.uid)
          setAuthError(null)
        } else {
          signInAnonymously(auth).catch((e: { code?: string }) => {
            console.error('Guest sign-in failed', e)
            setAuthError(e?.code ?? 'unknown')
          })
        }
      }),
    [attempt],
  )

  const queue = useLiveDoc(queueRef)
  const settingsDoc = useLiveDoc(settingsRef)
  const party = useLiveDoc(uid ? partyRef(uid) : null)
  const settings: Settings = { ...DEFAULT_SETTINGS, ...settingsDoc.data }
  const [rejoining, setRejoining] = useState(false)

  const loading = !uid || queue.loading || settingsDoc.loading || party.loading
  const qrOpen = queue.data?.qrJoinOpen ?? false
  const busy = queue.data?.busyMode ?? false
  const p = party.data
  const onList = p && (p.status === 'waiting' || p.status === 'notified')

  let content: React.ReactNode
  if (authError) {
    const problem = guestSignInProblem(authError)
    content = (
      <div className="space-y-6 text-center">
        <Message {...problem} />
        <Button size="lg" onClick={() => setAttempt((n) => n + 1)}>
          נסו שוב
        </Button>
        <p dir="ltr" className="text-xs text-muted-foreground/70">
          {authError}
        </p>
      </div>
    )
  }
  else if (loading) content = <Loader2 className="mx-auto mt-16 size-8 animate-spin text-primary" />
  else if (onList) content = <OnTheList party={p} uid={uid} settings={settings} position={positionOf(queue.data?.order, uid)} busy={busy} />
  else if (p?.status === 'seated') content = <Message emoji="🍷" title="ערב טוב!" text={busy ? `תהנו! ${limitNote(settings)}` : 'תהנו מהערב.'} />
  else if (!qrOpen) content = <Message emoji="🙂" title="הרשימה מנוהלת כרגע בדלת" text="פנו אלינו בכניסה ונרשום אתכם." />
  else if (p && !rejoining)
    content = (
      <div className="space-y-6 text-center">
        <Message emoji="👋" title="יצאתם מהרשימה" text="רוצים להצטרף שוב?" />
        <Button size="lg" onClick={() => setRejoining(true)}>
          הצטרפות מחדש
        </Button>
      </div>
    )
  else content = <JoinForm uid={uid} settings={settings} busy={busy} previous={p} onJoined={() => setRejoining(false)} />

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10">
        <header className="mb-6 text-center">
          <Wordmark className="text-5xl" />
        </header>
        <main className="flex-1">{content}</main>
      </div>
    </div>
  )
}

function positionOf(order: string[] | undefined, uid: string | null) {
  const i = order && uid ? order.indexOf(uid) : -1
  return i >= 0 ? i + 1 : null
}

function Message({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="mt-6 text-center">
      <p className="text-5xl">{emoji}</p>
      <h1 className="mt-4 text-3xl">{title}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{text}</p>
    </div>
  )
}

// ---------- join form ----------

function JoinForm({
  uid,
  settings,
  busy,
  previous,
  onJoined,
}: {
  uid: string | null
  settings: Settings
  busy: boolean
  previous: Party | null
  onJoined: () => void
}) {
  const [name, setName] = useState(previous?.name ?? '')
  const [size, setSize] = useState(previous?.size ?? 2)
  const [pref, setPref] = useState<SeatingPref>(previous?.pref ?? 'any')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const sizes = Array.from({ length: Math.max(1, settings.maxPartySize) }, (_, i) => i + 1)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!uid) return
    if (!name.trim()) return setError('מה השם?')
    const normalized = normalizePhone(phone, settings.countryCode)
    if (!normalized) return setError('מספר הטלפון לא תקין')
    setError(null)
    setSending(true)
    try {
      await joinAsGuest(uid, { name, size, pref, phone: normalized })
      onJoined()
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      setError(code.includes('permission') ? 'ההצטרפות דרך הטלפון סגורה כרגע — פנו אלינו בכניסה' : 'משהו השתבש. נסו שוב')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl">ברוכים הבאים 🍷</h1>
        <p className="mt-2 text-muted-foreground">כרגע אין מקום פנוי. הצטרפו לרשימה ונשלח לכם וואטסאפ כשהמקום שלכם מוכן.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="j-name">שם</Label>
        <Input id="j-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </div>

      <div className="space-y-2">
        <Label>כמה אתם?</Label>
        <div className="grid grid-cols-6 gap-1.5">
          {sizes.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={size === n}
              onClick={() => setSize(n)}
              className={cn(
                'h-12 rounded-md border text-lg font-semibold',
                size === n ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">יותר מ-{settings.maxPartySize}? דברו איתנו בכניסה.</p>
      </div>

      <div className="space-y-2">
        <Label>איפה תעדיפו לשבת?</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {PREFS.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={pref === x}
              onClick={() => setPref(x)}
              className={cn(
                'h-12 rounded-md border font-medium',
                pref === x ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
              )}
            >
              {prefLabel[x]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="j-phone">מספר וואטסאפ</Label>
        <Input
          id="j-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="text-end"
          placeholder="050-123-4567"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setError(null)
          }}
        />
        <p className="text-xs text-muted-foreground">רק כדי להודיע לכם שהמקום מוכן. השם והמספר נמחקים בסוף הערב.</p>
      </div>

      {busy && <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{limitNote(settings)}</p>}
      {error && (
        <p role="alert" className="text-center font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="h-14 w-full text-lg" disabled={sending}>
        {sending ? <Loader2 className="animate-spin" /> : 'הצטרפות לרשימה'}
      </Button>
    </form>
  )
}

// ---------- on the list ----------

function OnTheList({
  party,
  uid,
  settings,
  position,
  busy,
}: {
  party: Party
  uid: string | null
  settings: Settings
  position: number | null
  busy: boolean
}) {
  const now = useNow(1000)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const called = party.status === 'notified' && party.notifiedAt
  const holdLeft = called ? settings.holdMinutes * 60 - (now - party.notifiedAt!.toMillis()) / 1000 : 0

  return (
    <div className="space-y-6">
      {called ? (
        <div className="rounded-2xl bg-primary p-6 text-center text-primary-foreground">
          <p className="text-5xl">🍷</p>
          <h1 className="mt-3 font-serif text-3xl font-medium text-primary-foreground">המקום שלכם מוכן!</h1>
          <p className="mt-2 text-lg">
            {holdLeft > 0 ? (
              <>
                בואו אלינו תוך <span className="font-bold tabular-nums">{clock(holdLeft)}</span>
              </>
            ) : (
              'בואו אלינו עכשיו'
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-muted-foreground">אתם ברשימה</p>
          {position ? (
            <>
              <p className="mt-1 font-serif text-7xl font-medium text-brand tabular-nums">{position}</p>
              <p className="mt-1 text-lg">{position === 1 ? 'אתם הבאים בתור!' : `לפניכם ${position - 1} ${position === 2 ? 'קבוצה' : 'קבוצות'}`}</p>
            </>
          ) : (
            <p className="mt-3 text-lg">מיד תראו את המקום שלכם בתור</p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">נשלח לכם וואטסאפ כשהמקום מוכן. אפשר להתרחק קצת — רק שהטלפון יהיה איתכם.</p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
        <span className="font-semibold">{party.name}</span>
        <span className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" /> {party.size}
          </span>
          {prefLabel[party.pref]}
        </span>
      </div>

      {busy && <p className="text-center text-sm text-muted-foreground">{limitNote(settings)}</p>}

      {confirmLeave ? (
        <div className="space-y-2 rounded-lg border p-4 text-center">
          <p className="font-medium">לצאת מהרשימה?</p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={() => uid && void leaveAsGuest(uid).catch(console.error)}>
              כן, לצאת
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setConfirmLeave(false)}>
              לא, נשארים
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirmLeave(true)}>
          <LogOut /> יציאה מהרשימה
        </Button>
      )}
    </div>
  )
}
