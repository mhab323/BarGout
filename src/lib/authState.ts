/**
 * Staff sign-in state and actions. The owner uses Google; the bar tablets use one shared
 * email/password staff account. Both stay signed in (Firebase keeps the session on the device).
 * Access is decided by the staff/{uid} document (role owner | staff).
 */
import { createContext, useContext } from 'react'
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'

import { auth } from '@/lib/firebase'
import type { StaffMember } from '@/types'

export type StaffAuth =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** Signed in, but not on the staff list yet (the owner must add them). */
  | { status: 'no-access'; user: User }
  | { status: 'staff'; user: User; member: StaffMember; isOwner: boolean }

export const AuthContext = createContext<StaffAuth>({ status: 'loading' })

export const useStaffAuth = () => useContext(AuthContext)

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider())
}

export function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export function signOut() {
  return fbSignOut(auth)
}

/** Friendly Hebrew message for common sign-in errors. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'אימייל או סיסמה לא נכונים'
  if (code.includes('too-many-requests')) return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return 'החלון נסגר לפני ההתחברות'
  if (code.includes('popup-blocked')) return 'הדפדפן חסם את החלון. אפשרו חלונות קופצים ונסו שוב'
  if (code.includes('network')) return 'אין חיבור לאינטרנט'
  return 'ההתחברות נכשלה. נסו שוב'
}
