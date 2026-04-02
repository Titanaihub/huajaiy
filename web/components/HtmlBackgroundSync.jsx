"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import {
  buildSiteRootBackgroundStyle,
  buildThemeLabEmbedHtmlBackgroundStyle,
  isThemeLabFullPageEmbedPath,
  pickBackgroundSliceForPathname
} from "../lib/siteThemeStyle";
import { useSiteTheme } from "./SiteThemeProvider";

/**
 * ซิงค์พื้นหลัง <html> ตาม path จริงบน client — กันกรณีบางคำขอไม่มี x-huajaiy-pathname
 * ทำให้หน้าแรก (/) ใช้ชุดธีมหน้าแรกเสมอหลัง hydrate / นำทาง
 */
export default function HtmlBackgroundSync() {
  const pathname = usePathname();
  const theme = useSiteTheme();

  useLayoutEffect(() => {
    const el = document.documentElement;
    if (isThemeLabFullPageEmbedPath(pathname)) {
      Object.assign(el.style, buildThemeLabEmbedHtmlBackgroundStyle());
      el.style.minHeight = "100dvh";
      return;
    }
    if (!theme) return;
    const slice = pickBackgroundSliceForPathname(theme, pathname);
    const style = buildSiteRootBackgroundStyle(slice);
    Object.assign(el.style, style);
    el.style.minHeight = "100dvh";
  }, [pathname, theme]);

  return null;
}
