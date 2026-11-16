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

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with oxlint |

## Deploy

Vercel, from this GitHub repo. Add the `VITE_FIREBASE_*` variables in the Vercel project settings.
