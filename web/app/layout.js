import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "HUAJAIY Mini Upload",
  description: "Fast lightweight uploader for LINE/FB mini app use",
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
