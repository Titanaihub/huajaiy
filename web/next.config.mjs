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
        source: "/api/game/:path*",
        destination: `${api}/api/game/:path*`
      }
    ];
  }
};

export default nextConfig;
