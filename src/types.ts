/**
 * BarGout data model.
 *
 * Firestore layout (see SPEC.md and firestore.rules):
 *   config/settings   -> Settings        (staff read, owner write)
 *   config/layout     -> FloorLayout     (staff read, owner write)
 *   public/queue      -> PublicQueue     (anyone read, staff write)  - no names/phones
 *   parties/{id}      -> Party           (staff read/write; QR guest: create + read/leave own)
 *   staff/{uid}       -> StaffMember     (owner manages; created once in the console)
 *   history/{id}      -> PartyHistory    (anonymous stats, owner read)
 */

import type { Timestamp } from 'firebase/firestore'

// ---------- Floor layout ----------

export type SpotShape = 'square' | 'round' | 'rect'

/** A table on the floor map. Coordinates are in grid units on the layout canvas. */
export interface TableSpot {
  id: string // e.g. "T1"
  kind: 'table'
  label: string // shown on the map, e.g. "1"
  seats: number // normal capacity
  shape: SpotShape
  x: number
  y: number
  w: number
  h: number
  rotation: 0 | 90
}

/** The bar counter: one shape with N individual seats along it. */
export interface BarSpot {
  id: string // e.g. "BAR"
  kind: 'bar'
  label: string
  seats: number // 12
  x: number
  y: number
  w: number
  h: number
  rotation: 0 | 90
  /** Which long side the stools are on (in canvas coordinates, before rotation). */
  seatSide: 'top' | 'bottom'
}

export type FloorSpot = TableSpot | BarSpot

export interface FloorLayout {
  /** Canvas size in grid units; the map scales to the screen keeping this aspect ratio. */
  width: number
  height: number
  spots: FloorSpot[]
  /** Optional static shapes (walls, door, kitchen) to make the map look like the room. */
  decor: LayoutDecor[]
}

export interface LayoutDecor {
  id: string
  type: 'wall' | 'door' | 'label'
  x: number
  y: number
  w: number
  h: number
  text?: string
}

/** Seat id at the bar, e.g. "BAR:3" (1-based). */
export type BarSeatId = `${string}:${number}`

// ---------- Parties (groups) ----------

export type SeatingPref = 'bar' | 'table' | 'any'

export type PartyStatus =
  | 'waiting' // on the list
  | 'notified' // WhatsApp sent, hold countdown running
  | 'seated' // sitting at a table / bar seats
  | 'done' // left after sitting
  | 'no_show' // notified but did not come back in time
  | 'left' // left the list before being seated (guest tapped "leave" or staff removed)

export const ACTIVE_LIST_STATUSES: PartyStatus[] = ['waiting', 'notified']

export interface Party {
  id: string
  name: string
  size: number
  /** Digits only, international format without "+", e.g. "972501234567". Optional for walk-ins added by staff. */
  phone: string | null
  pref: SeatingPref
  source: 'staff' | 'qr'
  status: PartyStatus
  /** Anonymous auth uid of the guest device (QR joins only). */
  guestUid: string | null
  note: string | null

  joinedAt: Timestamp
  notifiedAt: Timestamp | null
  seatedAt: Timestamp | null
  billAt: Timestamp | null
  endedAt: Timestamp | null

  /** Table id, or bar seat ids, once seated. */
  spotIds: string[]
  /** Set when seated while busy mode is on: the 2-hour limit applies from limitStartAt. */
  timeLimited: boolean
  limitStartAt: Timestamp | null
}

/** What the guest status page may read without seeing anyone's name or phone. */
export interface PublicQueue {
  /** Party ids of the active list (waiting + notified), in order. */
  order: string[]
  qrJoinOpen: boolean
  busyMode: boolean
  updatedAt: Timestamp
}

// ---------- Settings ----------

export interface Settings {
  /** Busy mode: the 2-hour rule is active and timers turn colored. */
  busyMode: boolean
  busySince: Timestamp | null
  /** Guests may join by scanning the QR code. Off = staff adds people manually. */
  qrJoinOpen: boolean
  tableLimitMinutes: number // 120
  warnAtMinutes: number // 90  -> yellow
  lateAtMinutes: number // 110 -> red
  holdMinutes: number // 10  -> how long a notified group has to come back
  countryCode: string // "972"
  maxPartySize: number // largest group the QR page accepts
  messages: {
    /** WhatsApp text when the table is ready. Placeholders: {name} {hold} */
    tableReady: string
    /** Line shown on the join page and appended to WhatsApp when busy. Placeholder: {hours} */
    timeLimitNote: string
  }
}

// ---------- Staff & stats ----------

export interface StaffMember {
  role: 'owner' | 'staff'
  name: string
}

/** Anonymous record kept after "End of night" - no name, no phone. */
export interface PartyHistory {
  dayKey: string // "2026-11-16" (business day, night shifts count to the day they started)
  size: number
  pref: SeatingPref
  source: 'staff' | 'qr'
  outcome: PartyStatus
  joinedAt: Timestamp
  notifiedAt: Timestamp | null
  seatedAt: Timestamp | null
  billAt: Timestamp | null
  endedAt: Timestamp | null
  spotIds: string[]
  timeLimited: boolean
  waitMinutes: number | null
  stayMinutes: number | null
}
