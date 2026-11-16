import { describe, expect, it } from 'vitest'

import { guestSignInProblem } from '@/pages/guest/GuestJoinPage'

describe('guest sign-in problems', () => {
  it('anonymous sign-in turned off in Firebase is explained to the owner, not shown as "no connection"', () => {
    expect(guestSignInProblem('auth/admin-restricted-operation').text).toContain('Anonymous')
    expect(guestSignInProblem('auth/operation-not-allowed').text).toContain('Anonymous')
  })
  it('a real network problem says no connection', () => {
    expect(guestSignInProblem('auth/network-request-failed').title).toBe('אין חיבור')
  })
  it('anything else is a generic problem', () => {
    expect(guestSignInProblem('auth/internal-error').title).toBe('משהו השתבש')
  })
})
