/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  /** TailAdmin (Vue) ใน iframe: ต้องใช้ pathname /tailadmin-template/ ไม่ใช่ .../index.html ไม่งั้น Vue Router ไม่ match route / */
  async redirects() {
    return [
      {
        source: "/tailadmin-template/index.html",
        destination: "/tailadmin-template/",
        permanent: false
      },
      {
        source: "/calendar",
        destination: "/member",
        permanent: false
      },
      {
        source: "/profile",
        destination: "/member",
        permanent: false
      }
    ];
  },
  async rewrites() {
    const raw =
      process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com";
    const api = raw.replace(/\/$/, "");
    return [
      {
        source: "/tailadmin-template",
        destination: "/tailadmin-template/index.html"
      },
      {
        source: "/tailadmin-template/",
        destination: "/tailadmin-template/index.html"
      },
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
      },
      {
        source: "/api/public/:path*",
        destination: `${api}/api/public/:path*`
      },
      /** อัปโหลดรูป — ให้เรียก same-origin `/upload` ได้เมื่อตั้งค่าให้ชี้ API ในเครื่อง */
      {
        source: "/upload",
        destination: `${api}/upload`
      },
      {
        source: "/upload/",
        destination: `${api}/upload`
      }
    ];
  }
};

export default nextConfig;
