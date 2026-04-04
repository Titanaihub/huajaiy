import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "./providers";
import HeartsProvider from "../components/HeartsProvider";
import ImpersonationBanner from "../components/ImpersonationBanner";
import MemberAuthProvider from "../components/MemberAuthProvider";
import HtmlBackgroundSync from "../components/HtmlBackgroundSync";
import { SiteThemeProvider } from "../components/SiteThemeProvider";
import { getPathnameForLayout } from "../lib/getPathnameForLayout";
import {
  FALLBACK_SITE_THEME,
  fetchSiteThemeForLayout
} from "../lib/fetchSiteTheme";
import {
  buildSiteRootBackgroundStyle,
  buildThemeLabEmbedHtmlBackgroundStyle,
  isHeartHistoryFlatBackgroundPath,
  isThemeLabFullPageEmbedPath,
  pickBackgroundSliceForPathname
} from "../lib/siteThemeStyle";
import { getSiteUrl } from "../lib/siteUrl";

/** ชุดเดียวกับหน้าแรก organic-template (Inter — style.css / Bootstrap) */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter"
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
  let siteTheme = { ...FALLBACK_SITE_THEME };
  let pathname = "/";
  try {
    const pair = await Promise.all([
      fetchSiteThemeForLayout(),
      getPathnameForLayout()
    ]);
    siteTheme =
      pair[0] && typeof pair[0] === "object" ? pair[0] : { ...FALLBACK_SITE_THEME };
    pathname = typeof pair[1] === "string" ? pair[1] : "/";
  } catch {
    siteTheme = { ...FALLBACK_SITE_THEME };
    pathname = "/";
  }

  let htmlBgStyle;
  try {
    const bgSlice = pickBackgroundSliceForPathname(siteTheme, pathname);
    /** วางที่ <html> — หน้าแรก (/) กับหน้าอื่นใช้ชุดพื้นหลังคนละชุดตามแอดมิน; Theme Lab / ประวัติหัวใจ = พื้นเรียบ */
    htmlBgStyle =
      isThemeLabFullPageEmbedPath(pathname) ||
      isHeartHistoryFlatBackgroundPath(pathname)
        ? { ...buildThemeLabEmbedHtmlBackgroundStyle(), minHeight: "100dvh" }
        : { ...buildSiteRootBackgroundStyle(bgSlice), minHeight: "100dvh" };
  } catch {
    htmlBgStyle = {
      ...buildThemeLabEmbedHtmlBackgroundStyle(),
      minHeight: "100dvh"
    };
  }

  return (
    <html lang="th" className={inter.variable} style={htmlBgStyle}>
      <body className={`${inter.className} hui-root flex flex-col bg-transparent font-sans`}>
        <Providers>
          <SiteThemeProvider value={siteTheme}>
            <HtmlBackgroundSync />
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
          </SiteThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
