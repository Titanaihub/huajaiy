import "./globals.css";
import { Sarabun } from "next/font/google";
import HeartsProvider from "../components/HeartsProvider";
import MemberAuthProvider from "../components/MemberAuthProvider";
import { getSiteUrl } from "../lib/siteUrl";

const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-sarabun"
});

const site = getSiteUrl();
let metadataBase;
try {
  metadataBase = site ? new URL(`${site}/`) : undefined;
} catch {
  metadataBase = undefined;
}

export const metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: "HUAJAIY",
  description: "แพลตฟอร์มเบา โหลดไว — ร้านค้า เกม และอัปโหลดรูป",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  },
  openGraph: {
    title: "HUAJAIY",
    description: "ร้านค้า เกม อัปโหลดรูป — ใช้งานบนมือถือได้สะดวก",
    type: "website",
    locale: "th_TH"
  },
  twitter: {
    card: "summary",
    title: "HUAJAIY",
    description: "ร้านค้า เกม อัปโหลดรูป — ใช้งานบนมือถือได้สะดวก"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body
        className={`${sarabun.className} relative min-h-screen antialiased`}
      >
        <div className="game-app-backdrop" aria-hidden>
          <div className="game-app-backdrop__mesh" />
          <div className="game-app-backdrop__blob game-app-backdrop__blob--1" />
          <div className="game-app-backdrop__blob game-app-backdrop__blob--2" />
          <div className="game-app-backdrop__blob game-app-backdrop__blob--3" />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <MemberAuthProvider>
            <HeartsProvider>{children}</HeartsProvider>
          </MemberAuthProvider>
        </div>
      </body>
    </html>
  );
}
