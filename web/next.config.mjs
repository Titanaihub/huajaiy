/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    const raw =
      process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com";
    const api = raw.replace(/\/$/, "");
    return [
      {
        source: "/api/health",
        destination: `${api}/api/health`
      },
      {
        source: "/api/game/:path*",
        destination: `${api}/api/game/:path*`
      },
      {
        source: "/api/hearts/:path*",
        destination: `${api}/api/hearts/:path*`
      },
      {
        source: "/api/marketplace/:path*",
        destination: `${api}/api/marketplace/:path*`
      },
      {
        source: "/api/shops/:path*",
        destination: `${api}/api/shops/:path*`
      }
    ];
  }
};

export default nextConfig;
