import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { businessDay, toHistory } from '@/lib/endOfNight'
import type { Party } from '@/types'

const at = (h: number, m = 0, day = 16) => Timestamp.fromDate(new Date(2026, 10, day, h, m))
const base: Party = {
  id: 'p1', name: 'דנה', size: 2, phone: '972501234567', pref: 'bar', source: 'qr', status: 'done',
  guestUid: 'uid-123', note: 'birthday', joinedAt: at(20, 0), notifiedAt: at(20, 20), seatedAt: at(20, 30),
  billAt: at(22, 0), endedAt: at(22, 15), spotIds: ['BAR:5', 'BAR:6'], timeLimited: true, limitStartAt: at(20, 30),
}

describe('end of night', () => {
  it('keeps times and size but never the name, phone or device id', () => {
    const h = toHistory(base, Date.now())
    expect(h).not.toHaveProperty('name')
    expect(h).not.toHaveProperty('phone')
    expect(h).not.toHaveProperty('guestUid')
    expect(h).not.toHaveProperty('note')
    expect(JSON.stringify(h)).not.toContain('דנה')
    expect(JSON.stringify(h)).not.toContain('972501234567')
    expect(h).toMatchObject({ size: 2, pref: 'bar', source: 'qr', outcome: 'done', waitMinutes: 30, stayMinutes: 105 })
  })

  it('groups still sitting are closed as done, groups still waiting as left', () => {
    const now = at(23, 0).toMillis()
    expect(toHistory({ ...base, status: 'seated', endedAt: null }, now)).toMatchObject({ outcome: 'done', stayMinutes: 150 })
    expect(toHistory({ ...base, status: 'waiting', seatedAt: null, endedAt: null }, now)).toMatchObject({
      outcome: 'left',
      waitMinutes: null,
      stayMinutes: null,
    })
  })

  it('walk-ins (no list) have no waiting time', () => {
    const h = toHistory({ ...base, name: '', joinedAt: at(21), seatedAt: at(21), notifiedAt: null }, Date.now())
    expect(h.waitMinutes).toBe(0)
  })

  it('a night past midnight counts for the day it started', () => {
    expect(businessDay(new Date(2026, 10, 16, 23, 30).getTime())).toBe('2026-11-16')
    expect(businessDay(new Date(2026, 10, 17, 1, 30).getTime())).toBe('2026-11-16')
    expect(businessDay(new Date(2026, 10, 17, 18, 0).getTime())).toBe('2026-11-17')
  })
})
