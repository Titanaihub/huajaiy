import "./globals.css";
import { Prompt } from "next/font/google";
import HeartsProvider from "../components/HeartsProvider";
import ImpersonationBanner from "../components/ImpersonationBanner";
import MemberAuthProvider from "../components/MemberAuthProvider";
import { fetchSiteThemeForLayout } from "../lib/fetchSiteTheme";
import { buildSiteRootBackgroundStyle } from "../lib/siteThemeStyle";
import { getSiteUrl } from "../lib/siteUrl";

const prompt = Prompt({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-prompt"
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

/** ห้าม static-generate layout — ไม่งั้นพื้นหลังจาก API จะติดค่าตอน build แล้วไม่อัปเดต */
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
  const siteTheme = await fetchSiteThemeForLayout();
  const bodyBgStyle = buildSiteRootBackgroundStyle(siteTheme);

  return (
    <html lang="th" className={prompt.variable}>
      <body className={`${prompt.className} hui-root flex flex-col`} style={bodyBgStyle}>
        <MemberAuthProvider>
          <ImpersonationBanner />
          <HeartsProvider>
            {/* sticky footer: middle row grows so footer stays at viewport bottom */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 w-full flex-1 grid-rows-[auto_1fr_auto]">
                {children}
              </div>
            </div>
          </HeartsProvider>
        </MemberAuthProvider>
      </body>
    </html>
  );
}
