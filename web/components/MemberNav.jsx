"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { ADMIN_HOME_PATH } from "../lib/memberWorkspacePath";
import { useMemberAuth } from "./MemberAuthProvider";

const dropItem =
  "block w-full px-3 py-2.5 text-left text-sm text-hui-body transition hover:bg-hui-pageTop hover:text-hui-section sm:py-2";

function isActivePath(pathname, href) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDropdown({ label, menuKey, openKey, setOpenKey, children }) {
  const pathname = usePathname();
  const containerRef = useRef(null);
  const btnRef = useRef(null);
  const open = openKey === menuKey;
  const [fixedBox, setFixedBox] = useState(null);

  const close = useCallback(() => setOpenKey(null), [setOpenKey]);

  useEffect(() => {
    setOpenKey(null);
  }, [pathname, setOpenKey]);

  useLayoutEffect(() => {
    if (!open) {
      setFixedBox(null);
      return;
    }
    function place() {
      const narrow = window.matchMedia("(max-width: 639px)").matches;
      if (!narrow) {
        setFixedBox(null);
        return;
      }
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setFixedBox({
        top: r.bottom + 8,
        maxHeight: `min(70vh, calc(100vh - ${r.bottom + 20}px))`
      });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpenKey((k) => (k === menuKey ? null : menuKey))}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex min-w-0 items-center gap-0.5 sm:py-1 ${siteNavLinkClass}`}
      >
        {label}
        <span className="text-sm opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className={
            fixedBox != null
              ? "fixed left-3 right-3 z-[200] overflow-y-auto rounded-xl border border-hui-border bg-hui-surface py-1 shadow-lg ring-1 ring-hui-border/40"
              : "absolute left-0 top-full z-[200] min-w-[13.5rem] pt-1"
          }
          style={
            fixedBox != null
              ? { top: fixedBox.top, maxHeight: fixedBox.maxHeight }
              : undefined
          }
        >
          {fixedBox == null ? (
            <div className="rounded-xl border border-hui-border bg-hui-surface py-1 shadow-lg ring-1 ring-hui-border/40">
              {typeof children === "function"
                ? children({ pathname, dropItem })
                : children}
            </div>
          ) : (
            <div>
              {typeof children === "function"
                ? children({ pathname, dropItem })
                : children}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function MemberNav() {
  const { user, loading } = useMemberAuth();
  const [openMenu, setOpenMenu] = useState(null);

  if (loading) {
    return (
      <span className="text-sm font-medium text-hui-muted" aria-live="polite">
        …
      </span>
    );
  }

  if (user) {
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:gap-x-3">
        <NavDropdown
          label="ผู้ใช้งาน"
          menuKey="member"
          openKey={openMenu}
          setOpenKey={setOpenMenu}
        >
          {({ pathname: p, dropItem: cls }) => (
            <>
              <Link
                href="/account"
                className={`${cls} ${isActivePath(p, "/account") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                ภาพรวม
              </Link>
              <Link
                href="/account/prizes"
                className={`${cls} ${isActivePath(p, "/account/prizes") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                รางวัลของฉัน
              </Link>
              <Link
                href="/account/my-hearts"
                className={`${cls} ${isActivePath(p, "/account/my-hearts") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
                title="หัวใจจากรหัสห้อง แยกตามเจ้าของเกม"
              >
                หัวใจแดงห้องเกม
              </Link>
              <Link
                href="/member/profile"
                className={`${cls} ${isActivePath(p, "/member/profile") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                ข้อมูลส่วนตัว
              </Link>
              <Link
                href="/account/profile/legacy"
                className={`${cls} ${p === "/account/profile/legacy" ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                แก้ข้อมูลระบบ (เวอร์ชันเดิม)
              </Link>
            </>
          )}
        </NavDropdown>

        <NavDropdown
          label="ผู้สร้าง"
          menuKey="creator"
          openKey={openMenu}
          setOpenKey={setOpenMenu}
        >
          {({ pathname: p, dropItem: cls }) => (
            <>
              <Link
                href="/account/create-game"
                className={`${cls} ${isActivePath(p, "/account/create-game") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                สร้างเกม
              </Link>
              <Link
                href="/account/my-games"
                className={`${cls} ${isActivePath(p, "/account/my-games") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                เกมของฉัน
              </Link>
              <Link
                href="/account/creator-withdrawals"
                className={`${cls} ${isActivePath(p, "/account/creator-withdrawals") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                คำขอรางวัล
              </Link>
              <Link
                href="/account/hearts-shop"
                className={`${cls} ${isActivePath(p, "/account/hearts-shop") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
              >
                ซื้อหัวใจแดง
              </Link>
              <Link
                href="/account/give-hearts"
                className={`${cls} ${isActivePath(p, "/account/give-hearts") ? "bg-hui-pageTop font-semibold text-hui-section" : ""}`}
                role="menuitem"
                title="แดงแจกผู้เล่น · สร้างรหัสห้อง / แลกรหัส"
              >
                แจกหัวใจแดง
              </Link>
            </>
          )}
        </NavDropdown>

        {user.role === "admin" ? (
          <Link href={ADMIN_HOME_PATH} className={siteNavLinkClass}>
            แอดมิน
          </Link>
        ) : null}
        {user.role === "owner" || user.role === "admin" ? (
          <Link href="/owner" className={siteNavLinkClass}>
            เจ้าของร้าน
          </Link>
        ) : null}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
      <Link href="/login/line" className={siteNavLinkClass}>
        เข้าสู่ระบบด้วย LINE
      </Link>
      <span className="self-center text-hui-border" aria-hidden>
        |
      </span>
      <Link href="/login?expand=1" className={siteNavLinkClass}>
        เข้าด้วยยูสเซอร์
      </Link>
    </span>
  );
}
