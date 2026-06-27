# 🧭 Compass Finance

**Your Daily Money Command Center** — A production-ready, internationalized, mobile-first personal finance app built for students and young adults managing debts and cashflow worldwide.

---

## ✨ Key Features

### 💰 Financial Dashboard
- Real-time **Safe-to-Spend** calculator with spending pace indicator
- Financial **Health Score** with breakdown
- **Debt-Free Progress** tracker with countdown
- **Savings Goals** with projections
- **Wishlist** tracker
- Quick-add transactions with natural language parsing

### 🤖 Bynance — AI Financial Companion
- 3D floating mascot on dashboard
- **AI Coach** powered by Bynara Router API (`nara/mimo-v2.5-pro-free`)
- Personalized advice based on real spending patterns
- Locale-aware responses (responds in user's language)
- Auto-pilot analysis on page load with refresh button

### 🌐 Multi-Language Support
- **4 Languages**: English, Bahasa Indonesia, Español, العربية
- RTL support for Arabic
- Language switcher in More page
- All 200+ UI strings fully localized

### 🎨 Dual Theme Engine
- **Dark Mode** (default) — premium OLED-ready palette
- **Light Mode** — clean, bright UI
- System preference auto-detection
- Smooth CSS transitions with theme-aware glassmorphism

### 📊 Analytics & Insights
- Daily/Weekly/Monthly spending charts (Recharts)
- Category breakdown with pie charts
- AI-powered smart insights
- Monthly PDF report export

### 💳 Debt Management
- Multi-source debt tracking (SPayLater, GoPay, etc.)
- Installment payment schedule
- Debt-free countdown timer
- Celebration animation on full payoff

### 🔐 Auth Gateway
- Email/Password sign-in with Remember Me
- Google Sign-In (Supabase-ready)
- Account creation & password reset
- **Zero-cost fallback**: localStorage mock auth when Supabase is not configured

### 📱 Mobile-First
- iOS/Android safe-area support
- Capacitor-ready for native builds
- Local notification scheduling for bill reminders
- Touch-optimized with haptic-friendly interactions

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Static Export) |
| Styling | Tailwind CSS + CSS Variables |
| Animation | Framer Motion |
| State | Zustand (localStorage persisted) |
| Charts | Recharts |
| AI | Bynara Router API |
| Auth | Supabase (optional) → localStorage fallback |
| Mobile | Capacitor |
| i18n | Custom React Context (4 locales) |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npx next build

# Start production server
npx next start
```

### Environment Variables

Create `.env.local` in the project root:

```env
# AI Coach (Bynara Router)
NEXT_PUBLIC_COACH_API_URL=https://router.bynara.id/v1/chat/completions
NEXT_PUBLIC_COACH_API_KEY=your-api-key
NEXT_PUBLIC_COACH_MODEL=nara/mimo-v2.5-pro-free

# Supabase Auth (optional)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Available AI Models
- `nara/mimo-v2.5-free` — Free tier
- `nara/mimo-v2.5-pro-free` — Pro free tier (recommended)
- `nara/mistral-large` — Large model
- `nara/mistral-medium-3-5` — Medium model

---

## 📱 Mobile Build (Capacitor)

```bash
# Build static export
npx next build

# Add platforms
npx cap add ios
npx cap add android

# Sync and open
npx cap sync
npx cap open ios
npx cap open android
```

---

## 📂 Project Structure

```
compass-finance/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard (home)
│   ├── about/             # About & Vision
│   ├── advisor/           # AI Advisor
│   ├── analytics/         # Charts & analytics
│   ├── coach/             # AI Coach (Bynara)
│   ├── debt/              # Debt tracker
│   ├── goals/             # Savings goals
│   ├── insights/          # Smart insights
│   ├── more/              # Settings & more
│   ├── notifications/     # Alerts
│   ├── reports/           # Monthly reports
│   ├── scan/              # Receipt scanner
│   └── wishlist/          # Wishlist
├── components/
│   ├── dashboard/         # Dashboard widgets
│   ├── transactions/      # Transaction components
│   ├── debt/              # Debt components
│   └── ui/                # Shared UI components
├── lib/
│   ├── auth/              # Auth (Supabase + mock)
│   ├── engine/            # Business logic engines
│   ├── i18n/              # Internationalization
│   ├── notifications/     # Notification scheduler
│   ├── theme/             # Theme engine
│   └── utils/             # Utilities
└── public/
    └── bynance.png        # Mascot asset
```

---

## 🌍 Localization

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Complete |
| Bahasa Indonesia | `id` | ✅ Complete |
| Spanish | `es` | ✅ Complete |
| Arabic | `ar` | ✅ Complete (RTL) |

---

## 📄 License

Built with ❤️ for financial freedom.

© 2024-2026 Compass Finance. All rights reserved.