# Compass Finance

Personal financial command center — track spending, scan receipts, manage debt installments, set savings goals, and get AI-powered financial coaching. Built as a mobile-first PWA with an optional native iOS pipeline via Capacitor.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 (persisted to localStorage) |
| Charts | Recharts 2 |
| OCR | Tesseract.js 5 (client-side, offline-capable) |
| Animations | Framer Motion 11 |
| Testing | Vitest + React Testing Library |
| iOS Build | Capacitor 8 + GitHub Actions (`xcodebuild`) |

## Features

### ✅ Working
- **Dashboard** — Safe-to-spend hero, daily/weekly/monthly stats, health score
- **Quick Add** — Natural language transaction input with category auto-detection
- **Receipt Scanner** — OCR-based receipt parsing (Indonesian + English), with offline fallback
- **Smart Insights** — Spending trends, category breakdown, period comparisons
- **Budget Coach** — Personalized tips based on spending patterns
- **AI Advisor** — Recommendations, savings forecasts, debt forecasts, merchant analysis, overspending alerts
- **Analytics** — Bar/pie/line charts, income vs expense, 7d/30d/MTD views
- **Monthly Reports** — Detailed monthly summaries with PDF export
- **Debt Tracker** — SPayLater & GoPay Pinjam installment tracking
- **Savings Goals** — Progress tracking with contribution management
- **Wishlist** — Priority-based wish tracking with savings progress
- **Notifications** — System alerts and financial reminders
- **PWA** — Installable via "Add to Home Screen" on any browser (manifest + icons + service worker)
- **iOS Pipeline** — GitHub Actions workflow to build unsigned `.ipa` via Capacitor + Xcode (for sideloading via LiveContainer/SideStore)

### ⚠️ Stub / Not Yet Functional
- **Cloud Sync** — `SyncCoordinator` plumbing exists and the offline queue works, but the `/api/sync` endpoint is a stub that acknowledges changes without persisting them. No user auth, no cloud storage. See `app/api/sync/route.ts` for details.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Build (web)
npm run build

# Build (iOS static export — used by the CI pipeline)
# Note: requires temporarily moving app/api/ aside (the CI workflow handles this)
MOBILE_EXPORT=true npm run build
```

## Project Structure

```
app/
├── page.tsx              # Dashboard (home)
├── scan/                 # Receipt scanner
├── insights/             # Smart insights + charts
├── coach/                # Budget coach tips
├── advisor/              # AI advisor + forecasts
├── analytics/            # Detailed analytics
├── reports/              # Monthly reports + PDF export
├── debt/                 # Debt installment tracker
├── goals/                # Savings goals
├── wishlist/             # Wishlist manager
├── notifications/        # Alerts center
├── more/                 # Hub page linking to all features
└── api/sync/             # Sync stub endpoint

components/
├── dashboard/            # Dashboard-specific components
├── transactions/         # Transaction list, quick add, settings
├── debt/                 # Debt UI components
├── goals/                # Goal UI components
├── wishlist/             # Wishlist UI components
└── ui/                   # Shared UI (BottomNav, Card, Skeleton, etc.)

lib/
├── store.ts              # Zustand store (persisted)
├── types.ts              # Domain model types
├── syncCoordinator.ts    # Offline-first sync engine
├── syncClient.ts         # Store ↔ sync wiring
├── engine/
│   ├── ocrEngine.ts      # Tesseract.js receipt scanning
│   ├── spendingEngine.ts # Safe-to-spend calculations
│   ├── healthScore.ts    # Financial health scoring
│   ├── insightsEngine.ts # Insight generation
│   ├── coachEngine.ts    # Budget coaching tips
│   ├── advisorEngine.ts  # AI advisor recommendations
│   ├── analyticsEngine.ts# Analytics computations
│   ├── debtEngine.ts     # Debt calculations
│   └── ...
└── utils/                # Currency formatting, etc.
```

## iOS / IPA Build

The repo includes a GitHub Actions workflow (`.github/workflows/ios-build.yml`) that:

1. Runs `MOBILE_EXPORT=true npm run build` to produce a static export
2. Runs `npx cap sync ios` to sync the web assets into the Xcode project
3. Runs `xcodebuild archive` with signing disabled
4. Packages the archive into an unsigned `.ipa`

This `.ipa` can be sideloaded onto an iPhone via **LiveContainer** or **SideStore** (no paid Apple Developer account needed).

To trigger: push to `main`/`master`, or manually run the workflow from the GitHub Actions tab.

## Financial Blueprint

See `v10.md` for the financial data blueprint (debt amounts, savings goals, merchant analysis thresholds) that drives the advisor and coach engines.