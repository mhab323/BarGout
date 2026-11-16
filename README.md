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

## Go live (Firebase Hosting)

The app runs at **https://bargout.web.app** (free Firebase plan). The Firebase web config is not in this repo: Firebase Hosting serves it to the app at `/__/firebase/init.json`.

### One time

1. Log the Firebase CLI in with the Google account that owns the project (opens the browser):

   ```bash
   npx firebase login
   ```

2. Build and upload the app **and** the security rules:

   ```bash
   npm run deploy
   ```

3. **Owner access.** Open https://bargout.web.app/staff, tap **כניסה עם Google**. The app shows "אין עדיין הרשאה" with your **UID** (copy button).
   Firebase console → Firestore Database → **Start collection** `staff` → Document ID = your UID → fields `role` = `owner`, `name` = your name → Save.
   The app opens by itself, and the first owner sign-in writes the default settings and the floor plan.
4. **Tablet account.** Firebase console → Authentication → Users → **Add user** (any email, e.g. `tablet@bargout.app`, and a password).
   Copy its **User UID** from that table → Firestore → `staff` → **Add document** with that UID → `role` = `staff`, `name` = `Tablet`.
5. **Install on the tablets.** Open https://bargout.web.app/staff and sign in with the tablet account.
   Android (Chrome): ⋮ → **Install app** / **Add to Home screen**. iPad (Safari): Share → **Add to Home Screen**.
6. **QR poster.** Settings → **פוסטר להדפסה** → print, put it at the door.

### Every update

```bash
git pull
```

```bash
npm run deploy
```

Open tablets pick up the new version by themselves on the next load.

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
