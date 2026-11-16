import { useState } from 'react'
import type { User } from 'firebase/auth'
import { Copy, Check } from 'lucide-react'

import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/authState'

/**
 * Signed in, but not on the staff list. Shows the user id the owner needs to add
 * (Firestore -> staff/{uid} with role "owner" or "staff").
 */
export function NoAccessPage({ user }: { user: User }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(user.uid)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <Wordmark className="text-4xl" />
        <h1 className="mt-6 text-2xl">אין עדיין הרשאה</h1>
        <p className="mt-2 text-muted-foreground">
          מחוברים בתור <span dir="ltr">{user.email ?? 'ללא אימייל'}</span>, אבל החשבון עוד לא ברשימת הצוות.
        </p>
        <div className="mt-6 rounded-lg border bg-muted p-4 text-start">
          <p className="text-sm text-muted-foreground">מזהה החשבון (UID):</p>
          <div className="mt-2 flex items-center gap-2">
            <code dir="ltr" className="flex-1 truncate rounded bg-card px-2 py-1 text-sm">
              {user.uid}
            </code>
            <Button size="icon" variant="outline" onClick={copy} aria-label="העתקה">
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
        <Button variant="ghost" className="mt-6" onClick={() => signOut()}>
          התנתקות
        </Button>
      </div>
    </div>
  )
}
