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

## Develop against local emulators (no real data touched)

```bash
npm run emulators
```

```bash
npm run dev:emulators
```

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
