import type { FloorLayout, Settings, TableSpot } from '@/types'

/** Starting settings, written to config/settings on first run. */
export const DEFAULT_SETTINGS: Settings = {
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

/** Standard table sizes (grid units) by capacity. */
const TABLE_SIZE: Record<number, number> = { 2: 5.5, 3: 6, 4: 7 }

/** A table centred on (cx, cy). */
const table = (n: number, seats: number, cx: number, cy: number, shape: TableSpot['shape'] = 'square'): TableSpot => {
  const size = TABLE_SIZE[seats] ?? 7
  return { id: `T${n}`, kind: 'table', label: String(n), seats, shape, x: cx - size / 2, y: cy - size / 2, w: size, h: size }
}

/**
 * The real room, traced from the owner's hand drawing:
 * - centre: Π-shaped bar, 12 stools (1-4 right side bottom-up, 5-8 along the top
 *   right-to-left, 9-12 left side top-down)
 * - right: tables 1, 2, 3 (2 seats each)
 * - left of the front wall (entrance in the gap): 11, 8, 9 (4), 6 (3), 7, 10 (2); inside by the wall: 4, 5 (4)
 * Total: 12 + 5x4 + 3 + 5x2 = 45 seats.
 */
export const DEFAULT_LAYOUT: FloorLayout = {
  width: 100,
  height: 42,
  spots: [
    {
      id: 'BAR',
      kind: 'bar',
      label: 'בר',
      segments: [
        { x: 43, y: 7.5, w: 28.5, h: 7 }, // top
        { x: 43, y: 14.5, w: 7.5, h: 21.5 }, // left leg
        { x: 64, y: 14.5, w: 7.5, h: 22 }, // right leg
      ],
      stools: [
        { n: 1, x: 74.2, y: 33 },
        { n: 2, x: 74.2, y: 26 },
        { n: 3, x: 74.2, y: 19 },
        { n: 4, x: 74.2, y: 12 },
        { n: 5, x: 66, y: 4.8 },
        { n: 6, x: 59.7, y: 4.8 },
        { n: 7, x: 53.4, y: 4.8 },
        { n: 8, x: 47, y: 4.8 },
        { n: 9, x: 40.3, y: 17.5 },
        { n: 10, x: 40.3, y: 22.5 },
        { n: 11, x: 40.3, y: 27.5 },
        { n: 12, x: 40.3, y: 32.5 },
      ],
    },
    // right side
    table(1, 2, 88.5, 7.5),
    table(2, 2, 88.5, 21.5),
    table(3, 2, 88.5, 35),
    // by the wall, facing the bar
    table(4, 4, 32, 10),
    table(5, 4, 32, 27.5),
    // left room
    table(6, 3, 20.5, 9),
    table(7, 2, 21, 23),
    table(10, 2, 22, 36.5),
    table(11, 4, 6.5, 7.5),
    table(8, 4, 6.5, 21.5),
    table(9, 4, 7.5, 34),
  ],
  decor: [
    { id: 'wall-top', type: 'wall', x: 26.2, y: 0, w: 0.6, h: 16.5 },
    { id: 'wall-bottom', type: 'wall', x: 26.2, y: 23.5, w: 0.6, h: 18.5 },
    { id: 'entrance', type: 'door', x: 25.7, y: 16.8, w: 1.6, h: 6.4 },
    { id: 'entrance-label', type: 'label', x: 28.5, y: 18, w: 5.5, h: 4, text: 'כניסה' },
  ],
}

export const spotSeats = (spot: FloorLayout['spots'][number]) => (spot.kind === 'bar' ? spot.stools.length : spot.seats)

export const totalSeats = (layout: FloorLayout) => layout.spots.reduce((sum, s) => sum + spotSeats(s), 0)
