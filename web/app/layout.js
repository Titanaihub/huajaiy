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
        className={`${sarabun.className} min-h-screen bg-brand-50 text-slate-900 antialiased`}
      >
        <MemberAuthProvider>
          <HeartsProvider>{children}</HeartsProvider>
        </MemberAuthProvider>
      </body>
    </html>
  );
}
