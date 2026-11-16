import type { FloorLayout, Settings, TableSpot } from '@/types'

/** Starting settings, written to config/settings on first run. */
export const DEFAULT_SETTINGS: Omit<Settings, 'busySince'> = {
  busyMode: false,
  qrJoinOpen: false,
  tableLimitMinutes: 120,
  warnAtMinutes: 90,
  lateAtMinutes: 110,
  holdMinutes: 10,
  countryCode: '972',
  maxPartySize: 6,
  messages: {
    tableReady: 'היי {name}! 🍷 המקום שלכם מוכן. מחכים לכם תוך {hold} דקות.',
    timeLimitNote: 'בשעות העומס הישיבה היא ל-{hours} שעות.',
  },
}

const table = (
  n: number,
  seats: number,
  x: number,
  y: number,
  shape: TableSpot['shape'] = 'square',
): TableSpot => {
  const size = seats >= 4 ? 10 : seats === 3 ? 9 : 7
  return { id: `T${n}`, kind: 'table', label: String(n), seats, shape, x, y, w: size, h: size, rotation: 0 }
}

/**
 * Placeholder floor plan: 12 bar seats, 5 tables of 4, 1 table of 3, 5 tables of 2 = 45 seats.
 * Positions are generic until they are arranged to match the real room in the layout editor.
 */
export const DEFAULT_LAYOUT: FloorLayout = {
  width: 100,
  height: 70,
  spots: [
    { id: 'BAR', kind: 'bar', label: 'בר', seats: 12, x: 8, y: 4, w: 64, h: 7, rotation: 0, seatSide: 'bottom' },
    table(1, 4, 8, 24),
    table(2, 4, 24, 24),
    table(3, 4, 40, 24),
    table(4, 4, 56, 24),
    table(5, 4, 72, 24),
    table(6, 3, 84, 8, 'round'),
    table(7, 2, 10, 50),
    table(8, 2, 26, 50),
    table(9, 2, 42, 50),
    table(10, 2, 58, 50),
    table(11, 2, 74, 50),
  ],
  decor: [{ id: 'door', type: 'door', x: 88, y: 62, w: 10, h: 3, text: 'כניסה' }],
}

export const totalSeats = (layout: FloorLayout) => layout.spots.reduce((sum, s) => sum + s.seats, 0)
