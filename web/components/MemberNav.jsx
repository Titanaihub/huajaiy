"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useMemberAuth } from "./MemberAuthProvider";

const dropItem =
  "block w-full px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-900 sm:py-2";

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
        className="flex min-w-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-900 sm:py-1"
      >
        {label}
        <span className="text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className={
            fixedBox != null
              ? "fixed left-3 right-3 z-[200] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
              : "absolute left-0 top-full z-[200] min-w-[13.5rem] pt-1"
          }
          style={
            fixedBox != null
              ? { top: fixedBox.top, maxHeight: fixedBox.maxHeight }
              : undefined
          }
        >
          {fixedBox == null ? (
            <div className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
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
  const { user, loading, logout } = useMemberAuth();
  const [openMenu, setOpenMenu] = useState(null);

  if (loading) {
    return (
      <span className="text-xs font-medium text-slate-400" aria-live="polite">
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
                className={`${cls} ${isActivePath(p, "/account") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                ภาพรวม
              </Link>
              <Link
                href="/account/prizes"
                className={`${cls} ${isActivePath(p, "/account/prizes") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                รางวัลของฉัน
              </Link>
              <Link
                href="/account/my-hearts"
                className={`${cls} ${isActivePath(p, "/account/my-hearts") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
                title="หัวใจจากรหัสห้อง แยกตามเจ้าของเกม"
              >
                หัวใจของฉัน
              </Link>
              <Link
                href="/account/profile"
                className={`${cls} ${isActivePath(p, "/account/profile") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                ข้อมูลส่วนตัว
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
                className={`${cls} ${isActivePath(p, "/account/create-game") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                สร้างเกม
              </Link>
              <Link
                href="/account/my-games"
                className={`${cls} ${isActivePath(p, "/account/my-games") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                เกมของฉัน
              </Link>
              <Link
                href="/account/creator-withdrawals"
                className={`${cls} ${isActivePath(p, "/account/creator-withdrawals") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                คำขอรางวัล
              </Link>
              <Link
                href="/account/hearts-shop"
                className={`${cls} ${isActivePath(p, "/account/hearts-shop") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                ซื้อหัวใจแดง
              </Link>
              <Link
                href="/account/give-hearts"
                className={`${cls} ${isActivePath(p, "/account/give-hearts") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
                title="แดงแจกผู้เล่น · สร้างรหัสห้อง / แลกรหัส"
              >
                แจกหัวใจแดง
              </Link>
            </>
          )}
        </NavDropdown>

        {user.role === "admin" ? (
          <Link
            href="/admin"
            className="font-medium text-slate-700 transition hover:text-brand-900"
          >
            แอดมิน
          </Link>
        ) : null}
        {user.role === "owner" || user.role === "admin" ? (
          <Link
            href="/owner"
            className="font-medium text-slate-700 transition hover:text-brand-900"
          >
            เจ้าของร้าน
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => logout()}
          className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
        >
          ออกจากระบบ
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href="/register"
        className="font-medium text-slate-600 transition hover:text-brand-800"
      >
        สมัครสมาชิก
      </Link>
      <span className="text-slate-300">|</span>
      <Link
        href="/login"
        className="font-medium text-slate-600 transition hover:text-brand-800"
      >
        เข้าสู่ระบบ
      </Link>
    </span>
  );
}
