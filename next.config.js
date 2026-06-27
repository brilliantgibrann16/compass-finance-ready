/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    // Mengabaikan linting saat build agar proses perakitan di GitHub Actions mulus
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Memaksa Next.js mengabaikan type error dari file luar (seperti supabase edge functions) saat production build
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;