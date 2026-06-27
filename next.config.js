/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Mobile / Capacitor static-export target ──────────────────────────────
  // Gated on MOBILE_EXPORT so the DEFAULT `npm run build` keeps the full server
  // build (the /api/sync route handler + the CSP headers() below), neither of
  // which Next.js static export supports. The CI iOS pipeline sets
  // MOBILE_EXPORT=true to emit a webview-ready static bundle into ./out.
  //   - output: 'export'        → fully static HTML/JS, no Node server
  //   - images.unoptimized      → disable the Image Optimization server
  //   - trailingSlash           → /scan -> /scan/index.html so file:// loads resolve
  ...(process.env.MOBILE_EXPORT === "true"
    ? { output: "export", images: { unoptimized: true }, trailingSlash: true }
    : {}),
  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' for styles: Framer Motion and several components
      // (ProgressRing, CategoryIcon, progress bars) set color/position via
      // inline `style` at runtime. fonts.googleapis.com is the Google Fonts
      // stylesheet origin (the font files themselves come from gstatic).
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // 'unsafe-inline' for scripts is REQUIRED by Next.js App Router:
      // hydration is bootstrapped via inline <script> tags (self.__next_f.push)
      // that have no stable hash and no nonce on statically-prerendered pages.
      // Blocking them prevents React from ever hydrating (blank screen).
      // If you later switch to dynamic rendering, replace this with a
      // per-request nonce + 'strict-dynamic' set from middleware.
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://unpkg.com https://tessdata.projectnaptha.com",
      // worker-src blob: + the CDN origins above are REQUIRED by Tesseract.js v5:
      // it spawns a Web Worker from a blob URL and fetches the WASM core, worker
      // script, and *.traineddata language packs from jsdelivr/unpkg + the
      // projectnaptha tessdata mirror at runtime. Without these the real OCR
      // path is CSP-blocked and /scan silently degrades to the mock fallback.
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;