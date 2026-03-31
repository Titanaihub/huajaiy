"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemberAuth } from "./MemberAuthProvider";

const dropItem =
  "block px-3 py-2 text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-900";

function isActivePath(pathname, href) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDropdown({ label, children }) {
  const pathname = usePathname();

  return (
    <div className="group relative inline-block text-left">
      <button
        type="button"
        className="flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-900"
        aria-expanded="false"
        aria-haspopup="true"
      >
        {label}
        <span className="text-[10px] opacity-70" aria-hidden>
          ▾
        </span>
      </button>
      <div
        className="pointer-events-none invisible absolute left-0 top-full z-[200] min-w-[13.5rem] pt-1 opacity-0 transition duration-100 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
        role="menu"
      >
        <div className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
          {typeof children === "function" ? children({ pathname, dropItem }) : children}
        </div>
      </div>
    </div>
  );
}

export default function MemberNav() {
  const { user, loading, logout } = useMemberAuth();

  if (loading) {
    return (
      <span className="text-xs font-medium text-slate-400" aria-live="polite">
        …
      </span>
    );
  }

  if (user) {
    const label = `${user.firstName} ${user.lastName}`.trim() || user.username;
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:gap-x-3">
        <span
          className="max-w-[120px] truncate text-sm font-medium text-slate-800 sm:max-w-[160px]"
          title={label}
        >
          {label}
        </span>

        <NavDropdown label="ผู้ใช้งาน">
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
                href="/account/heart-history/play"
                className={`${cls} ${p.startsWith("/account/heart-history/play") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                ประวัติหัวใจ (เล่นเกม)
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

        <NavDropdown label="ผู้สร้าง">
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
                href="/account/prize-payouts"
                className={`${cls} ${isActivePath(p, "/account/prize-payouts") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
              >
                จ่ายรางวัล
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
              <Link
                href="/account/heart-history/purchases"
                className={`${cls} ${p.startsWith("/account/heart-history/purchases") ? "bg-brand-50 font-semibold text-brand-900" : ""}`}
                role="menuitem"
                title="การซื้อแพ็กแดงแจก และการสร้าง/ลบรหัสแจกห้อง"
              >
                ประวัติหัวใจแดง
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
