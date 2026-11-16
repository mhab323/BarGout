/**
 * Table timers.
 *
 * Not busy: the timer is gray and just shows how long the group has been sitting.
 * Busy mode: the 2-hour limit counts from when the group sat down, or from when busy mode
 * started if they were already sitting (they were not told about the limit before).
 *   green  < warnAtMinutes (1:30)
 *   yellow < lateAtMinutes (1:50)
 *   red    from lateAtMinutes; "over" after tableLimitMinutes (2:00)
 */
import type { Party, Settings } from '@/types'

export type TimerTone = 'ok' | 'warn' | 'late' | 'idle'

export interface TableTimer {
  tone: TimerTone
  /** Minutes since they sat down. */
  sittingMin: number
  /** Minutes counted toward the limit (busy mode only). */
  limitMin: number | null
  /** Minutes left of the limit; negative = over time (busy mode only). */
  leftMin: number | null
  over: boolean
}

export function tableTimer(
  party: Pick<Party, 'seatedAt'>,
  opts: { busyMode: boolean; busySinceMs: number | null; now: number; settings: Pick<Settings, 'tableLimitMinutes' | 'warnAtMinutes' | 'lateAtMinutes'> },
): TableTimer {
  const seatedMs = party.seatedAt?.toMillis() ?? opts.now
  const sittingMin = Math.max(0, Math.floor((opts.now - seatedMs) / 60000))
  if (!opts.busyMode) return { tone: 'idle', sittingMin, limitMin: null, leftMin: null, over: false }

  const limitStart = Math.max(seatedMs, opts.busySinceMs ?? seatedMs)
  const limitMin = Math.max(0, Math.floor((opts.now - limitStart) / 60000))
  const { tableLimitMinutes, warnAtMinutes, lateAtMinutes } = opts.settings
  const tone: TimerTone = limitMin < warnAtMinutes ? 'ok' : limitMin < lateAtMinutes ? 'warn' : 'late'
  const leftMin = tableLimitMinutes - limitMin
  return { tone, sittingMin, limitMin, leftMin, over: leftMin < 0 }
}

/** 95 -> "1:35" */
export function hm(minutes: number): string {
  const m = Math.abs(Math.floor(minutes))
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** Short text under the table number on the map. */
export function timerCaption(t: TableTimer): string {
  if (t.limitMin === null) return hm(t.sittingMin)
  return t.over ? `+${hm(-(t.leftMin ?? 0))}` : hm(t.limitMin)
}
