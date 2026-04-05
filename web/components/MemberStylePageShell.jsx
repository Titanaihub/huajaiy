"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BrandLogo from "./BrandLogo";
import HomeStylePublicHeader from "./HomeStylePublicHeader";
import { useMemberAuth } from "./MemberAuthProvider";
import { MEMBER_SHELL_MENU_ITEMS } from "../lib/memberSidebarNav";
import {
  MEMBER_TAIL_TO_SLUG,
  normalizeMemberTailPath,
  parseAdminAppPath,
  parseMemberAppPath,
  workspaceShellUrl
} from "../lib/memberWorkspacePath";

const PUBLIC_USER_RE = /^[a-z0-9_]{3,32}$/;

function normPath(p) {
  const x = (p || "").split("?")[0].replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  return x;
}

function workspaceSlugFromPathname(pathname) {
  const p = normPath(pathname);
  const m = parseMemberAppPath(p);
  if (m) return m.segments.length ? m.segments[0] : "";
  const a = parseAdminAppPath(p);
  if (a) return a.segments.length ? a.segments[0] : "";
  return null;
}

function isShellMenuActive(pathname, tailStart) {
  const slug = MEMBER_TAIL_TO_SLUG[normalizeMemberTailPath(tailStart)];
  const cur = workspaceSlugFromPathname(pathname);
  if (cur === null) return false;
  if (slug === "") return cur === "";
  return cur === slug;
}

/**
 * เชลล์ React ให้โทนเดียวกับ `/member` — หัว HomeStyle + เมนูซ้าย 290px
 * @param {{ children: import('react').ReactNode }} props
 */
export default function MemberStylePageShell({ children }) {
  const pathname = usePathname() || "/";
  const { user } = useMemberAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, closeMobileNav]);

  const onHamburgerClick = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width:1024px)").matches) {
      setDesktopNavCollapsed((c) => !c);
    } else {
      setMobileNavOpen((o) => !o);
    }
  }, []);

  const menuItems = useMemo(() => {
    const loginNext = encodeURIComponent("/member");
    const pathN = normPath(pathname);
    return MEMBER_SHELL_MENU_ITEMS.map((item) => {
      if (item.kind === "empty") {
        return { ...item, href: null, active: false, disabled: true };
      }
      if (item.kind === "legacy" && item.href) {
        const h = item.href.split("?")[0];
        return {
          ...item,
          href: item.href,
          active: pathN === normPath(h),
          disabled: false
        };
      }
      if (item.kind === "publicPage") {
        const raw = user?.username != null ? String(user.username).trim().toLowerCase() : "";
        const ok = PUBLIC_USER_RE.test(raw);
        const href = ok ? "/account/my-page" : null;
        return {
          ...item,
          href,
          active: pathN === "/account/my-page" || pathN.startsWith("/account/my-page/"),
          disabled: !ok,
          disabledTitle: ok ? undefined : "ตั้งชื่อผู้ใช้ในโปรไฟล์ก่อน"
        };
      }
      if (item.kind === "shell" || item.kind === "closed") {
        const href = user
          ? workspaceShellUrl(item.tailStart, user.role)
          : `/login?next=${loginNext}`;
        return {
          ...item,
          href,
          active: user ? isShellMenuActive(pathname, item.tailStart) : false,
          disabled: false
        };
      }
      return { ...item, href: "/member", active: false, disabled: false };
    });
  }, [user, pathname]);

  const linkClass = (active) =>
    `flex items-center rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors ${
      active
        ? "bg-rose-50 text-rose-700"
        : "text-gray-800 hover:bg-gray-100"
    }`;

  const sidebarInner = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 lg:hidden">
        <BrandLogo variant="header" tone="organic" />
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          onClick={closeMobileNav}
        >
          ปิด
        </button>
      </div>
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="เมนูสมาชิก"
      >
        <h2 className="mb-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          เมนู
        </h2>
        <ul className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <li key={item.key}>
              {item.disabled && !item.href ? (
                <span
                  className={`${linkClass(false)} cursor-default opacity-50`}
                  title={item.disabledTitle}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={linkClass(item.active)}
                  onClick={closeMobileNav}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-400">
        <Link href="/" className="font-medium text-rose-600 hover:underline">
          หน้าแรกเว็บไซต์
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white">
      <HomeStylePublicHeader onHamburgerClick={onHamburgerClick} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-slate-100">
        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-[1000] bg-black/40 lg:hidden"
            aria-label="ปิดเมนู"
            onClick={closeMobileNav}
          />
        ) : null}
        <aside
          className={[
            "flex flex-col border-r border-gray-200 bg-white shadow-xl transition-[transform,width,min-width,max-width] duration-300 ease-out",
            "fixed left-0 top-14 z-[1001] h-[calc(100dvh-3.5rem)] w-[290px] max-w-[85vw] sm:top-[3.75rem] sm:h-[calc(100dvh-3.75rem)]",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
            "lg:relative lg:top-auto lg:z-0 lg:h-auto lg:max-h-none lg:min-h-0 lg:max-w-none lg:translate-x-0 lg:shadow-none",
            desktopNavCollapsed
              ? "lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden lg:border-transparent"
              : "lg:w-[290px] lg:min-w-[290px] lg:max-w-[290px]"
          ].join(" ")}
        >
          {sidebarInner}
        </aside>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
