# Current State — Compass Finance

## Overview
This repository is a Capacitor-backed Next.js finance app with Supabase integration, native deep-link auth support, offline-first sync, and Capgo live updates.

## Key areas already implemented
- Next.js App Router with client-side auth gating via `components/ui/AppShell.tsx`.
- Supabase auth integration with email/password and Google OAuth in `lib/auth/useAuth.ts`.
- Supabase local-mode fallback using `localStorage` for mock auth when env vars are not configured.
- Native deep-link scheme `com.compass.finance` registered in `ios/App/App/Info.plist`.
- Capacitor `appUrlOpen` listener added in `AppShell` to route deep link callbacks into the app.
- Offline-first sync coordinator implemented in `lib/syncCoordinator.ts` and wired in `lib/syncClient.ts`.
- Supabase Edge Function routing for secure AI coach (`bynance-coach`) and sync state (`sync-state`).
- Capgo updater configured in `capacitor.config.ts` with `autoUpdate: true` and `production` channel.

## Fixes applied in this audit
- Normalized native deep link routing in `components/ui/AppShell.tsx` so custom schemes and https callback URLs both map to local app routes.
- Updated Google OAuth redirect logic in `lib/auth/useAuth.ts` so web OAuth uses `/auth/callback` while native uses `com.compass.finance://auth/callback`.

## Current runtime risk areas / remaining work
- `app/auth/callback/page.tsx` must be verified on device to ensure Supabase callback params are parsed and session restoration succeeds after native Google OAuth.
- Supabase Auth settings must include the native redirect `com.compass.finance://auth/callback` and web redirect `https://<your-domain>/auth/callback`.
- Capgo live update flow for iPhone IPA deployment has not been runtime-tested in this session.
- No universal link / App Clip configuration is present; custom scheme deep-linking remains the only native path.
- The current Next.js build emits a warning from `lib/notifications/scheduler.ts` about a dynamic dependency, but the production build still succeeds.
- Email signup / verify flows still redirect to the app root on web; if the app needs a dedicated verify callback route, this should be added later.

## Notes
- The auth flow now has an explicit `/auth/callback` route for OAuth web sign-in.
- The native-capable `appUrlOpen` handler can accept custom-scheme callbacks from Capacitor and map them into Next.js route navigation.
- `CURRENT_STATE.md` is being created as the active audit artifact for status tracking.
