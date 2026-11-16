# BarGout — Spec

A walk-in waitlist and table-timer app for a 45-seat wine bar with no reservations.

## The problem

- The bar fills up fast. On busy nights 5–10 groups wait **outside**.
- The waiting list is kept on **paper** by the owner, who is also working the floor.
- When it's busy, tables are limited to **2 hours**, but nothing tracks how long each table has been sitting, and guests are not always told.
- The signal that a table is about to free up is **the bill being asked for**.

## Goals

1. **Manage the list** (the biggest pain): who is waiting, in what order, and how to call them.
2. **Track table time**: when each table sat down and when its 2 hours end.
3. **Make the 2-hour rule consistent**: guests hear it every time, the same way.

Every action during service should take **one or two taps**. If the app is slower than paper, it fails.

## The place

| Area | Seats |
|---|---|
| Bar | 12 stools |
| Tables of 4 | 5 tables (20) |
| Table of 3 | 1 table (3) |
| Tables of 2 | 5 tables (10) |
| **Total** | **45** |

The floor map in the app must look like the real room: each table at its real position and in its real shape. The owner arranges this once in the layout editor.

## Users

| Who | Device | Login |
|---|---|---|
| Owner | own phone + tablets | Google sign-in, role `owner` |
| Staff | 2 tablets that stay in the bar | one shared email/password staff account that stays signed in, role `staff` |
| Guests | their own phone, via a QR code at the door | Firebase anonymous auth (invisible to them) |

Owner-only: layout editor, settings, stats. Both roles can run the list and the floor.

## How a night works

1. **Early in the evening:** QR joining is **off**. When the first groups wait outside, the owner adds them **manually** on the tablet (name, size, phone optional, bar/table/either).
2. **When the list grows:** the owner turns **busy mode** on (the 2-hour rule applies, timers turn colored) and **QR join** on, so guests at the door scan and add themselves.
3. **A table is about to free up:** a waiter brings the bill and taps **"Bill asked"** on the table. The app suggests the next group that fits.
4. **Notify:** the owner taps **WhatsApp**, and a ready Hebrew message opens in WhatsApp. One tap to send. A **10-minute hold** countdown starts.
5. **Seat:** the group comes back, the owner taps the table (or bar stools), and their timer starts. If they don't come back, mark them **no-show** and call the next group.
6. **Leaving:** the owner marks the table free (or the next group is seated on it).
7. **End of night:** one button. Names and phone numbers are deleted, and only anonymous stats are kept.

## Screens

### Guest (`/join`, from the QR code)

- **Join form**: name, group size (1–6), WhatsApp number, bar / table / either. It shows the 2-hour note when busy mode is on.
- **When QR join is off:** "The list is managed at the door — please talk to us 🙂".
- **After joining:** "You are #3" updates live, with a **Leave the list** button. Guests never see other people's names or numbers. ✅
- **Called:** "המקום שלכם מוכן!" with the hold countdown, as soon as staff tap WhatsApp. ✅
- **Seated:** "ערב טוב!" (+ the 2-hour note in busy mode). **Left / no-show:** "join again" while QR join is open. ✅
- The phone number is required on the QR page (it is how we call them). The page loads no third-party scripts.

### Staff — List (`/staff`)

- A big **+ Add** button: name, size stepper, phone (optional), bar/table/either. This is the main way to add people early in the evening.
- Each row shows the place, name, size, preference, wait time, and source (manual/QR).
- Actions per row: **WhatsApp** (opens `wa.me` with the message), **Seat**, **No-show**, **Remove**.
- Notified rows show the hold countdown (10:00 → 0:00, turns red at 0).

### Staff — Floor (`/staff/floor`)

- The real room drawn to scale: the bar with 12 stools and 11 tables.
- Each occupied table shows the group name, size, and timer:
  - **Not busy:** gray, elapsed time only
  - **Busy:** green below 1:30, **yellow** from 1:30, **red** from 1:50, and "over time" after 2:00
- Tap an occupied table or stool: who sits there and for how long, with **Move** (pick the new table / stools on the map; the 2-hour timer keeps running from the original seating time) and **Free** (they left). ✅
- On an occupied place also: **Bill asked** (dashed outline on the map; the list shows who is next for that table) ✅
- Tap a free table or stool: seat someone **from the list** here (groups already called first, then the line), or **mark it taken without a name** (walk-ins / tables already full when busy mode starts), with "how many" and "when did they sit" (now / 30 min / 1 h / 1.5 h / 2 h ago) ✅
- Timers: `src/lib/timers.ts` (tested). Busy mode counts from seating, or from when busy mode started for groups already sitting ✅
- **Bar stools** are seated individually (for example, a group of 2 takes stools 5–6), so each group at the bar has its own timer.
- **Suggestion:** when a table is free or has the bill asked, it shows the next group (`src/lib/matching.ts`, tested):
  1. the **first group in line that fits** the table and wants this kind of seat (or "either")
  2. groups that asked for the other kind of seat (offered as an option only)

  So **a table for 2 goes to the first couple in line even if a group of 4 is first**, and a table for 4 goes to whoever is first and fits, **even a couple** (owner's decision). Groups already called (notified) are not suggested again.
- **Bar stools** for a group are picked from the smallest free row of stools that fits, keeping long rows free for bigger groups.

### Staff — Settings (`/staff/settings`)

- Toggles: **Busy mode**, **QR join open**
- Numbers: table limit (120), yellow at (90), red at (110), hold minutes (10), max group size on QR (6), country code (972)
- Message texts (Hebrew, editable): table ready and time-limit note
- **Layout editor** — on the map tab, "עריכת מפה" (any staff, so it works from the tablet): drag tables to move them (e.g. from inside to outside), tap a table to change its number, seats (1–8) or shape (square / round / long), add a table (placed in an empty spot), remove a table (not while people sit there), reset to the original drawing. Changes are a draft until "שמירה"; duplicate table numbers block saving.
- **QR code**: shown in settings, with an A4 poster to print (`/poster`) ✅
- **End of night** (any staff): every group becomes an anonymous `history` record (times, size, outcome — tested to contain no name / phone / device id), groups are deleted, the queue resets (empty, QR off, busy off) ✅
- **Stats** (later)

## Brand

The app follows the BarGout logo (`docs/brand/logo-original.png`).

| Token | Value | Use |
|---|---|---|
| Burgundy | `#720F22` | logo color, primary buttons, headings, active tab, app icon |
| White | `#FFFFFF` | background, same as the logo |
| Wordmark | Frank Ruhl Libre, weight 460, wide letter-spacing | "BarGout" in the header and on the guest page, rebuilt as text so it stays sharp |
| Headings | Frank Ruhl Libre (Hebrew serif) | matches the logo's classic serif |
| Body / UI | Heebo | easy to read quickly on a busy night |
| Timer colors | green `#2E9D5B`, yellow `#E3A21A`, red `#E0442E` | kept clearly different from the burgundy, so "late" never looks like "brand" |

App icon: a burgundy tile with a white serif "B".

## Rules and decisions

- **Two-hour limit counting.** A group seated while busy mode is on counts from its seating time. If busy mode turns on later, groups already sitting count from the moment busy mode started, since they weren't told before. This is stored as `limitStartAt`.
- **Phone numbers.** Local numbers (`05X-XXXXXXX`) are converted to international format using the country code (`9725XXXXXXXX`), as `wa.me` requires.
- **WhatsApp** uses free click-to-chat links (`https://wa.me/<number>?text=<message>`), with no API and no cost. Automatic sending through the WhatsApp Business API is a possible later step, and it has a cost.
- **Privacy.** Names and phones exist only during the night. "End of night" moves each group to `history/` without name or phone, then deletes it.
- **Free plan only.** Firebase Spark has no Cloud Functions, so all logic runs in the app and data safety is enforced in `firestore.rules`.

## Data model (Firestore)

| Path | What | Who can read / write |
|---|---|---|
| `config/settings` | `Settings` | staff read, owner write |
| `config/layout` | `FloorLayout`: tables, bar, decor with positions | staff read and write (moving tables) |
| `parties/{id}` | `Party`: one group, from joining to leaving | staff read/write. A guest can create one (only when QR join is open), read it, and set it to `left` |
| `public/queue` | `PublicQueue`: ordered party ids, QR open, busy — **no names** | anyone reads, staff writes |
| `staff/{uid}` | `StaffMember`: role `owner` or `staff` | owner manages |
| `history/{id}` | `PartyHistory`: anonymous stats | owner reads, staff writes (end of night) |

Party life cycle: `waiting → notified → seated → done`. A group can also end as `no_show` (notified, didn't come back) or `left` (left the list).

Types live in `src/types.ts`.

## Tech stack

| Part | Choice |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui components, Hebrew, RTL (`<html dir="rtl">`), Heebo font |
| App | PWA (installable on tablets/phone, offline cache) |
| Backend | Firebase (Spark free plan): Firestore + Auth (Google, Email/Password, Anonymous) |
| Hosting | Vercel (static build, `vercel.json` rewrites to the SPA) |

## Build order

1. ✅ Project setup: Vite, Tailwind, shadcn base, RTL, PWA, Firebase client
2. ✅ Data model + `firestore.rules` (24 tests) + emulator setup
3. ✅ Staff login + roles
4. ✅ Staff list: manual add, WhatsApp, hold timer, no-show, seat on the map, "fits now" hints
5. ✅ Guest QR join + live position + called + leave + rejoin
6. ✅ Floor map: real layout, timers, bill asked, seating, walk-ins, move, free
7. ✅ Layout editor (move / add / remove tables, seats, shape)
8. ✅ Settings (times, messages with WhatsApp preview, country code), QR poster, End of night (stats screen later)
9. Deploy to Vercel, print the QR, real-night test

## Later

- POS integration (the POS opens a bill per table with a start time, so it could start timers automatically)
- Wait-time estimate on the guest page, from history
- Automatic WhatsApp via the Business API
