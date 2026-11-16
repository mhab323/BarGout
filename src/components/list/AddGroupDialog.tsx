import { useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addGroup } from '@/lib/actions'
import { prefLabel } from '@/lib/format'
import { normalizePhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { SeatingPref } from '@/types'

const SIZES = [1, 2, 3, 4, 5, 6, 7, 8]
const PREFS: SeatingPref[] = ['any', 'bar', 'table']

/** Staff adds a group at the door: name, size, bar/table, phone (optional). */
export function AddGroupDialog({
  open,
  onOpenChange,
  countryCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  countryCode: string
}) {
  const [name, setName] = useState('')
  const [size, setSize] = useState(2)
  const [pref, setPref] = useState<SeatingPref>('any')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setSize(2)
    setPref('any')
    setPhone('')
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = phone.trim() ? normalizePhone(phone, countryCode) : null
    if (phone.trim() && !normalized) {
      setError('מספר הטלפון לא תקין')
      return
    }
    setSaving(true)
    try {
      // Don't wait for the server: Firestore shows the new group right away and syncs in the background.
      void addGroup({ name: name.trim() || 'ללא שם', size, pref, phone: normalized }).catch((err) =>
        console.error('addGroup failed', err),
      )
      reset()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הוספה לרשימה</DialogTitle>
          <DialogDescription>רק שם וגודל קבוצה חובה. טלפון — כדי לשלוח וואטסאפ כשמתפנה מקום.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="g-name">שם</Label>
            <Input id="g-name" autoFocus autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>

          <div className="space-y-2">
            <Label>כמה אנשים?</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSize(n)}
                  aria-pressed={size === n}
                  className={cn(
                    'h-12 rounded-md border text-lg font-semibold transition-colors',
                    size === n ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>איפה?</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PREFS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPref(p)}
                  aria-pressed={pref === p}
                  className={cn(
                    'h-12 rounded-md border font-medium transition-colors',
                    pref === p ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                  )}
                >
                  {prefLabel[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="g-phone">טלפון לוואטסאפ (לא חובה)</Label>
            <Input
              id="g-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="050-123-4567"
              className="text-end"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setError(null)
              }}
              aria-invalid={Boolean(error)}
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <UserPlus />
            הוספה לרשימה
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
