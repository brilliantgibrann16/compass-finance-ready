/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  async headers() {
    const csp = [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net9 https://unpkg.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com"
    ];
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp.join('; ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;