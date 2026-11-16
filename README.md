# BarGout

Walk-in waitlist and table timers for a wine bar. Hebrew, RTL, installable on tablets (PWA).

See [SPEC.md](SPEC.md) for the full product spec.

## Run locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase web config (Firebase console → Project settings → Your apps → Web app).

```bash
npm run dev
```

- Staff screens: http://localhost:5173/staff
- Guest join page: http://localhost:5173/join

## First-time Firebase setup

1. **Security rules.** Firebase console → Firestore Database → **Rules** → paste the contents of `firestore.rules` → **Publish**.
   (Or from your computer: `npx firebase login`, then `npm run deploy:rules`.)
2. **Tablet account.** Firebase console → Authentication → Users → **Add user** with an email and password for the tablets.
3. **Give access.** Open the app and sign in (Google for the owner, the tablet account on the tablets).
   The app shows "אין עדיין הרשאה" with the account's **UID** and a copy button.
   In Firestore → **Start collection** `staff` → Document ID = that UID → fields:
   - `role` (string): `owner` for you, `staff` for the tablet account
   - `name` (string): anything, e.g. `Owner` / `Tablet`
4. The first time the owner signs in, the app writes the default settings and the floor plan.

## Try it locally (demo, no real data touched)

Needs [Node.js](https://nodejs.org) 20+ and Java 21+ (the local Firebase emulator runs on Java).

```bash
npm install
```

```bash
npm run demo
```

This starts a local copy of Firebase with a busy evening already in it, and the app on port 5173.

- Open http://localhost:5173/staff
- Tablet login: `tablet@bargout.test` / `bargout123` (owner: `owner@bargout.test` / `bargout123`)
- On a tablet or phone on the same Wi-Fi: use the **Network** address the command prints, e.g. `http://192.168.1.20:5173/staff`
- Firebase emulator UI (see the data): http://localhost:4000
- Stop with Ctrl+C. Every `npm run demo` starts fresh.

Without the demo evening: `npm run emulators` in one terminal, then `npm run seed` and `npm run dev:emulators` in another.

## Tests

```bash
npm test
```

```bash
npm run test:rules
```

`npm test` runs the matching and phone tests. `npm run test:rules` starts the Firestore emulator and checks the security rules.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with oxlint |

## Deploy

Vercel, from this GitHub repo. Add the `VITE_FIREBASE_*` variables in the Vercel project settings.
