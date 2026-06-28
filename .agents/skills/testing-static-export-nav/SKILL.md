---
name: testing-static-export-nav
description: Test Compass Finance (Next.js static export + Capacitor) navigation and pages end-to-end. Use when verifying bottom-nav routing, blank-screen/PageTransition bugs, or any page render in a browser against the production static build.
---

# Testing Compass Finance (static export, browser)

Compass Finance is a Next.js App Router app with `output: 'export'` + `trailingSlash: true`, packaged in an iOS Capacitor webview. You can't run an iOS webview from the Devin VM, but the production static export in a desktop browser faithfully reproduces the client-side routing + framer-motion behavior (where the "blank screen on tab tap" class of bug lives).

## Build & serve the production static export
```bash
npm install
npm run build          # emits to out/
npx serve out -l 4173  # run in a background shell; serves trailing-slash routes
```
Open `http://127.0.0.1:4173/`. Routes use trailing slashes: `/scan/`, `/insights/`, `/coach/`, `/more/`, `/`.

Tips:
- If `npm run build` fails with `out/` locked on Windows, kill node first: `taskkill //IM node.exe //F`, then `rm -rf out .next` and rebuild.
- The app gates on a login/splash phase (`AppShell`). A persisted session ("Remember me") survives rebuilds via localStorage; if you land on the splash/login, complete it once.

## Window setup for recording
The bottom nav is fixed to the viewport bottom. If the browser is maximized, the nav sits behind the Windows taskbar and is unclickable. **Keep the window restored-down (not maximized)** so the nav clears the taskbar — the app is mobile-width (`max-w-md`) so the full UI is still visible. (Maximizing + taskbar auto-hide is an alternative.)

## Primary nav flow (golden path)
Click each bottom-nav tab and assert the destination renders (not a blank viewport). Expected headings:
- `/scan/` → "Receipt Scanner" + Camera/Upload buttons
- `/insights/` → "Smart Insights" + 7/30/90-day toggles
- `/coach/` → "Budget Coach" + recommendation card + AI Coach mascot
- `/more/` → "More" menu (Analytics, AI Advisor, Monthly Reports, Debt Tracker, Savings Goals…)
- `/` → dashboard ("Available balance", "Safe to Spend")

Console should be clean except the benign `[Sync] Supabase not configured` log. Any uncaught error = fail.

## Blank-screen ("white/black screen of death") diagnosis
This bug is usually NOT a crash or routing failure — the route document is fully present in the DOM but rendered invisible. To distinguish:
1. After a tab tap, check the console — no errors means it's a visual stranding, not a JS exception.
2. Inspect the page wrapper: a value like `style="opacity:0; transform:translateX(-12px)"` that never animates to `opacity:1` is the tell.
3. The root cause was `components/ui/PageTransition.tsx` using framer-motion `AnimatePresence mode="wait"`: on App Router client nav (`router.push`) React unmounts the old route synchronously, so the incoming route's enter tween never starts. Fix = plain keyed `motion.div` (`key={pathname}`, `initial→animate`, no `exit`/`AnimatePresence`).
If this class of bug reappears, PageTransition (or any `AnimatePresence mode="wait"` wrapping route children) is the first place to look.

## Lint/typecheck/test
```bash
npm run lint          # NOTE: lib/__tests__/store.test.ts has a pre-existing no-explicit-any error on main — unrelated
npx tsc --noEmit      # should be clean
npm test              # vitest; ~157 tests; fake timers + mock fetch + lib/fixtures/
```
Per `.clinerules`: do NOT modify `vitest.config.ts`/`vitest.setup.ts` without user confirmation; format rupiah as `Rp 1.937.350` via `Intl.NumberFormat('id-ID')`.

## Devin Secrets Needed
None. Supabase is optional; the app runs in local-first fallback mode with no credentials.
