import "./globals.css";
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
import { SITE_SHARE_DESCRIPTION } from "../lib/siteShareMetadata";

const site = getSiteUrl() || "https://www.huajaiy.com";
let metadataBase;
try {
  metadataBase = site ? new URL(`${site}/`) : undefined;
} catch {
  metadataBase = undefined;
}

export const metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: "HUAJAIY",
  description: SITE_SHARE_DESCRIPTION,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
  },
  openGraph: {
    title: "HUAJAIY",
    description: SITE_SHARE_DESCRIPTION,
    type: "website",
    locale: "th_TH",
    images: [
      {
        url: "/og-share.png",
        width: 1200,
        height: 630,
        alt: "HUAJAIY",
        type: "image/png"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "HUAJAIY",
    description: SITE_SHARE_DESCRIPTION,
    images: ["/og-share.png"]
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
    <html lang="th" style={htmlBgStyle}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* ฟอนต์เดียวทั้งเว็บ — Niramit (รองรับไทย + Latin) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Niramit:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="hui-root flex flex-col bg-transparent font-sans antialiased">
        <Providers>
          <SiteThemeProvider value={siteTheme}>
            <HtmlBackgroundSync />
            <MemberAuthProvider>
              <ImpersonationBanner />
              <HeartsProvider>
                {/* ไม่ใส่ overflow-y-auto ที่นี่ — กันสกอร์บาร์ซ้อนกับหน้าเอกสาร; หน้าแรกเลื่อนเฉพาะใน iframe */}
                <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
              </HeartsProvider>
            </MemberAuthProvider>
          </SiteThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
