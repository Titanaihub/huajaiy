import "./globals.css";
import { Sarabun } from "next/font/google";
import HeartsProvider from "../components/HeartsProvider";
import MemberAuthProvider from "../components/MemberAuthProvider";

const sarabun = Sarabun({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-sarabun"
});

export const metadata = {
  title: "HUAJAIY",
  description: "แพลตฟอร์มเบา โหลดไว — ร้านค้า เกม และอัปโหลดรูป",
  openGraph: {
    title: "HUAJAIY Mini Upload",
    description: "อัปโหลดรูปไว ใช้สะดวกบนมือถือ",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "HUAJAIY Mini Upload",
    description: "อัปโหลดรูปไว ใช้สะดวกบนมือถือ"
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
        className={`${sarabun.className} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        <MemberAuthProvider>
          <HeartsProvider>{children}</HeartsProvider>
        </MemberAuthProvider>
      </body>
    </html>
  );
}
