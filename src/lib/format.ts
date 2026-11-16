/** Small Hebrew formatting helpers for times and labels. */
import type { SeatingPref } from '@/types'

export const prefLabel: Record<SeatingPref, string> = { any: 'לא משנה', bar: 'בר', table: 'שולחן' }

/** 7 -> "7 ד׳", 75 -> "1:15 ש׳" */
export function minutesLabel(minutes: number): string {
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `${minutes} ד׳`
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} ש׳`
}

/** 452 seconds -> "07:32" */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Math.abs(totalSeconds)))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
