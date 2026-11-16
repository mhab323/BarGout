import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { hm, tableTimer, timerCaption } from '@/lib/timers'

const settings = { tableLimitMinutes: 120, warnAtMinutes: 90, lateAtMinutes: 110 }
const NOW = Date.UTC(2026, 10, 16, 22, 0)
const minAgo = (m: number) => NOW - m * 60000
const seated = (m: number) => ({ seatedAt: Timestamp.fromMillis(minAgo(m)) })

describe('table timers', () => {
  it('not busy: gray, shows how long they sit', () => {
    const t = tableTimer(seated(75), { busyMode: false, busySinceMs: null, now: NOW, settings })
    expect(t).toMatchObject({ tone: 'idle', sittingMin: 75, limitMin: null })
    expect(timerCaption(t)).toBe('1:15')
  })

  it.each([
    [30, 'ok'],
    [89, 'ok'],
    [90, 'warn'],
    [109, 'warn'],
    [110, 'late'],
    [130, 'late'],
  ])('busy: after %i minutes the table is %s', (minutes, tone) => {
    const t = tableTimer(seated(minutes), { busyMode: true, busySinceMs: minAgo(300), now: NOW, settings })
    expect(t.tone).toBe(tone)
  })

  it('busy: over the 2 hours shows +time', () => {
    const t = tableTimer(seated(135), { busyMode: true, busySinceMs: minAgo(300), now: NOW, settings })
    expect(t.over).toBe(true)
    expect(timerCaption(t)).toBe('+0:15')
  })

  it('groups already sitting when busy mode starts count from busy mode, not from when they sat', () => {
    // sat 2.5 hours ago, busy mode started 20 minutes ago
    const t = tableTimer(seated(150), { busyMode: true, busySinceMs: minAgo(20), now: NOW, settings })
    expect(t).toMatchObject({ tone: 'ok', sittingMin: 150, limitMin: 20, leftMin: 100, over: false })
    expect(timerCaption(t)).toBe('0:20')
  })

  it('formats minutes as h:mm', () => {
    expect(hm(5)).toBe('0:05')
    expect(hm(125)).toBe('2:05')
  })
})
