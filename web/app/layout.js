import "./globals.css";

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
    <html lang="th">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
