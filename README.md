# Compass — Personal Finance OS

A daily-use financial command center: today's safe-to-spend amount, the
twice-monthly allowance cycle, debt payoff countdown, and long-term
savings goals (graduation fund, emergency fund), in one dark-mode PWA.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Data is stored in your browser's
`localStorage` — nothing leaves your device in this version.

## Install on iPhone

1. Deploy it somewhere with HTTPS (see Deployment below) — iOS won't
   install PWAs served over plain HTTP.
2. Open the URL in **Safari** (not Chrome — iOS PWA install only works
   from Safari).
3. Tap the Share icon → **Add to Home Screen**.

## Deployment

This is a standard Next.js app — push it to a GitHub repo and import it
in Vercel, or run `npx vercel` from this directory. No environment
variables are required for the current (local-storage-only) version.

## Architecture

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server routes ready for V2 (bank sync, AI assistant) without a rewrite |
| Styling | Tailwind | Fast iteration, consistent tokens |
| Animation | Framer Motion | Requested explicitly; used for counters, sheets, progress rings |
| State | Zustand + `persist` | Minimal boilerplate; the `storage` option is the exact seam where a Supabase-backed adapter drops in later — see `lib/store.ts` |
| Data model | `lib/types.ts` | Plain TypeScript types, no framework coupling — these can become Supabase table shapes almost unchanged |

All calculation logic (spending pace, transfer cycles, category
detection, health score, goal projections) lives in `lib/engine/` as
pure functions with no React or storage dependencies — they're unit
testable in isolation and reusable if/when a backend is added.

## What's built (Phase 1 — the daily loop)

- Daily Money Command Center dashboard: available balance, Safe-to-Spend
  Today (with the compass-ring gauge), today/week/month spend, monthly
  savings commitment
- Smart Daily Spending Engine (`lib/engine/spendingEngine.ts`)
- Transfer Cycle System for the twice-monthly allowance (`lib/engine/transferCycle.ts`)
- Quick Add: type `+11000 geprek`, auto-categorized, editable before saving
- Smart category detection by keyword (`lib/engine/categoryDetector.ts`)
- Financial Health Score — v1 heuristic, see `lib/engine/healthScore.ts` for the formula and how to tune it
- Debt and savings-goal summary cards on the dashboard
- Settings sheet for balance + transfer schedule
- PWA manifest + iOS home-screen icons (placeholder ring mark — swap the
  files in `public/icons/` for real artwork whenever you have a logo)

## What's not built yet

This was scoped as a multi-phase build; Phase 1 is the part you'll touch
every day. Still to come:

- **Phase 2** — dedicated Debt-Free Mode, Graduation Fund, and Emergency
  Fund detail screens with milestone timelines and celebration
  animations; Wishlist create/edit UI. Debt and goals currently come
  from `lib/seedData.ts` — edit the numbers there directly until those
  screens exist.
- **Phase 3** — Receipt scanner (Tesseract.js OCR), automatic Insights
  Engine.
- **Phase 4** — full animation/accessibility/responsive polish pass,
  proper app icon artwork, ESLint config.

## Known assumptions worth checking

- **Quick Add sign convention**: a bare number or `+number` logs an
  *expense*; `-number` logs *income*. All the spec's examples were
  expenses written with `+`, so this was the only consistent reading —
  flip it in `lib/engine/quickAddParser.ts` if your mental model is
  reversed.
- **Health score** is a simple, documented v1 formula (pace, debt
  trajectory, savings progress, cycle buffer — 25 points each). Treat it
  as a starting point to calibrate once you have a few months of real
  data, not a finished model.
- **iOS PWA limits**: no push notifications before iOS 16.4, and
  background sync is limited. Fine for this local-first version; worth
  knowing before promising notification-driven features in V2.
