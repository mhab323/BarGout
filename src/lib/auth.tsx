/** Provides the staff sign-in state to the app. See authState.ts for the actions. */
import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'

import { AuthContext, type StaffAuth } from '@/lib/authState'
import { staffRef } from '@/lib/db'
import { auth } from '@/lib/firebase'
import type { StaffMember } from '@/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [member, setMember] = useState<{ uid: string; data: StaffMember | null } | null>(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!user || user.isAnonymous) return
    return onSnapshot(
      staffRef(user.uid),
      (snap) => setMember({ uid: user.uid, data: snap.exists() ? snap.data() : null }),
      () => setMember({ uid: user.uid, data: null }),
    )
  }, [user])

  let state: StaffAuth
  if (user === undefined) state = { status: 'loading' }
  // Guests on this device are signed in anonymously; that is not a staff login.
  else if (!user || user.isAnonymous) state = { status: 'signed-out' }
  else if (!member || member.uid !== user.uid) state = { status: 'loading' }
  else if (!member.data) state = { status: 'no-access', user }
  else state = { status: 'staff', user, member: member.data, isOwner: member.data.role === 'owner' }

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
