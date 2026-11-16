import { useState } from 'react'
import { ExternalLink, Loader2, LogOut, Minus, Moon, Plus, Printer, Save } from 'lucide-react'

import { QrCode } from '@/components/brand/QrCode'
import { Button } from '@/components/ui/button'
import { joinUrl } from '@/lib/urls'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useBar } from '@/hooks/barDataContext'
import { saveSettings, setQrJoinOpen } from '@/lib/actions'
import { signOut, useStaffAuth } from '@/lib/authState'
import { endOfNight, type EndOfNightResult } from '@/lib/endOfNight'
import { fillTemplate } from '@/lib/phone'
import { hm } from '@/lib/timers'
import type { Settings } from '@/types'

/** Problems that block saving, in Hebrew. */
function validate(s: Settings): string | null {
  if (!(s.warnAtMinutes < s.lateAtMinutes)) return 'הצהוב צריך להתחיל לפני האדום'
  if (!(s.lateAtMinutes <= s.tableLimitMinutes)) return 'האדום צריך להתחיל עד סוף זמן הישיבה'
  if (!s.messages.tableReady.trim()) return 'הודעת הוואטסאפ ריקה'
  if (!/^\d{1,4}$/.test(s.countryCode)) return 'קידומת מדינה לא תקינה'
  return null
}

export function SettingsPage() {
  const bar = useBar()
  const auth = useStaffAuth()
  const isOwner = auth.status === 'staff' && auth.isOwner
  const [draft, setDraft] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const s = draft ?? bar.settings
  const dirty = draft !== null
  const problem = validate(s)

  const set = (patch: Partial<Settings>) => {
    setDraft({ ...s, ...patch })
    setSaved(false)
  }
  const setMsg = (patch: Partial<Settings['messages']>) => set({ messages: { ...s.messages, ...patch } })

  async function save() {
    if (!draft || problem) return
    setSaving(true)
    try {
      await saveSettings(draft)
      setDraft(null)
      setSaved(true)
    } catch (e) {
      console.error(e)
      alert('השמירה נכשלה. בדקו חיבור ונסו שוב.')
    } finally {
      setSaving(false)
    }
  }

  const hours = s.tableLimitMinutes / 60
  const preview =
    fillTemplate(s.messages.tableReady, { name: 'דנה', hold: s.holdMinutes }) +
    '\n' +
    fillTemplate(s.messages.timeLimitNote, { hours: Number.isInteger(hours) ? hours : hours.toFixed(1) })

  return (
    <section className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
      <h1 className="text-2xl">הגדרות</h1>

      {/* QR join */}
      <Card title="הצטרפות ב-QR" description="אורחים סורקים את הקוד בכניסה, נרשמים לבד, ורואים את המקום שלהם בתור.">
        <div className="flex flex-wrap items-center gap-5">
          <QrCode value={joinUrl()} className="w-36 shrink-0 rounded-lg border p-1.5" />
          <div className="min-w-0 flex-1 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="font-medium">{bar.qrJoinOpen ? 'פתוח — אורחים יכולים להירשם' : 'סגור — רק אתם מוסיפים לרשימה'}</span>
              <Switch checked={bar.qrJoinOpen} onCheckedChange={(on) => void setQrJoinOpen(on).catch(console.error)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="/poster" target="_blank" rel="noreferrer">
                  <Printer /> פוסטר להדפסה
                </a>
              </Button>
              <Button asChild variant="ghost">
                <a href="/join" target="_blank" rel="noreferrer">
                  <ExternalLink /> דף האורחים
                </a>
              </Button>
            </div>
            <p dir="ltr" className="truncate text-end text-xs text-muted-foreground">
              {joinUrl()}
            </p>
          </div>
        </div>
      </Card>

      {!isOwner && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          את הזמנים וההודעות רק הבעלים יכול לשנות (כניסה עם Google).
        </p>
      )}

      {/* Times */}
      <Card title="זמנים" description="מצב עומס: כמה זמן יושבים, ומתי השולחן מחליף צבע על המפה.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Stepper label="זמן ישיבה במצב עומס" value={s.tableLimitMinutes} step={15} min={60} max={240} format={hm} disabled={!isOwner} onChange={(v) => set({ tableLimitMinutes: v })} />
          <Stepper label="זמן לחזור אחרי וואטסאפ" value={s.holdMinutes} step={1} min={3} max={30} format={(v) => `${v} ד׳`} disabled={!isOwner} onChange={(v) => set({ holdMinutes: v })} />
          <Stepper label="🟡 צהוב מ-" value={s.warnAtMinutes} step={5} min={15} max={s.tableLimitMinutes} format={hm} disabled={!isOwner} onChange={(v) => set({ warnAtMinutes: v })} />
          <Stepper label="🔴 אדום מ-" value={s.lateAtMinutes} step={5} min={15} max={s.tableLimitMinutes} format={hm} disabled={!isOwner} onChange={(v) => set({ lateAtMinutes: v })} />
          <Stepper label="קבוצה הכי גדולה בהרשמה עצמית" value={s.maxPartySize} step={1} min={1} max={12} format={(v) => `${v} אנשים`} disabled={!isOwner} onChange={(v) => set({ maxPartySize: v })} />
          <div className="space-y-1.5">
            <Label htmlFor="cc">קידומת מדינה (לוואטסאפ)</Label>
            <Input id="cc" dir="ltr" inputMode="numeric" className="h-11 w-28 text-center" value={s.countryCode} disabled={!isOwner} onChange={(e) => set({ countryCode: e.target.value.replace(/\D/g, '') })} />
          </div>
        </div>
      </Card>

      {/* Messages */}
      <Card title="הודעות" description="מה האורחים מקבלים בוואטסאפ. {name} = השם, {hold} = דקות לחזור, {hours} = שעות ישיבה.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-ready">כשהמקום מוכן</Label>
            <Textarea id="m-ready" rows={2} value={s.messages.tableReady} disabled={!isOwner} onChange={(e) => setMsg({ tableReady: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-limit">שורה על זמן הישיבה (במצב עומס)</Label>
            <Textarea id="m-limit" rows={1} value={s.messages.timeLimitNote} disabled={!isOwner} onChange={(e) => setMsg({ timeLimitNote: e.target.value })} />
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">כך זה ייראה:</p>
            <p className="max-w-sm rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-sm whitespace-pre-line text-[#111]">{preview}</p>
          </div>
        </div>
      </Card>

      {/* End of night */}
      <EndOfNightCard listCount={bar.list.length} seatedCount={bar.seated.length} />

      {/* Account */}
      <Card title="חשבון">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {auth.status === 'staff' && (
              <>
                <span dir="ltr">{auth.user.email}</span> · {auth.isOwner ? 'בעלים' : 'צוות'}
              </>
            )}
          </p>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut /> התנתקות
          </Button>
        </div>
      </Card>

      {/* Save bar */}
      {isOwner && (dirty || saved) && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 px-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-lg">
            <p className={problem ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>
              {problem ?? (dirty ? 'יש שינויים שלא נשמרו' : 'נשמר ✓')}
            </p>
            {dirty && (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  ביטול
                </Button>
                <Button onClick={save} disabled={saving || Boolean(problem)}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} שמירה
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-xl">{title}</h2>
      {description && <p className="mt-0.5 mb-4 text-sm text-muted-foreground">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  )
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  format,
  disabled,
  onChange,
}: {
  label: string
  value: number
  step: number
  min: number
  max: number
  format: (v: number) => string
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon" disabled={disabled || value + step > max} onClick={() => onChange(Math.min(max, value + step))} aria-label="יותר">
          <Plus />
        </Button>
        <span className="min-w-20 text-center text-lg font-semibold tabular-nums">{format(value)}</span>
        <Button type="button" variant="outline" size="icon" disabled={disabled || value - step < min} onClick={() => onChange(Math.max(min, value - step))} aria-label="פחות">
          <Minus />
        </Button>
      </div>
    </div>
  )
}

function EndOfNightCard({ listCount, seatedCount }: { listCount: number; seatedCount: number }) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EndOfNightResult | null>(null)
  const [failed, setFailed] = useState(false)

  async function run() {
    setRunning(true)
    setFailed(false)
    try {
      setResult(await endOfNight())
    } catch (e) {
      console.error(e)
      setFailed(true)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card title="סגירת ערב" description="בסוף הערב: מוחק שמות וטלפונים, שומר רק נתונים אנונימיים (זמני המתנה וישיבה), ומאפס את הרשימה, מצב עומס ו-QR.">
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Moon /> סגירת ערב
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setResult(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{result ? 'הערב נסגר 🌙' : 'לסגור את הערב?'}</DialogTitle>
            <DialogDescription>
              {result
                ? `${result.groups} קבוצות (${result.people} אנשים) נשמרו כנתונים אנונימיים. השמות והטלפונים נמחקו.`
                : 'כל השמות והטלפונים יימחקו. הרשימה תתרוקן והמפה תתפנה. אי אפשר לבטל.'}
            </DialogDescription>
          </DialogHeader>
          {!result && (listCount > 0 || seatedCount > 0) && (
            <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              שימו לב: עדיין יש {listCount} קבוצות ברשימה ו-{seatedCount} יושבות.
            </p>
          )}
          {failed && <p className="text-sm text-destructive">משהו נכשל. בדקו חיבור ונסו שוב.</p>}
          {result ? (
            <Button onClick={() => setOpen(false)}>סגירה</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={run} disabled={running}>
                {running ? <Loader2 className="animate-spin" /> : <Moon />} כן, לסגור את הערב
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                ביטול
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
