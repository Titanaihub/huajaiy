"use client";

import Link from "next/link";
import { GLOBAL_PRIMARY_NAV_BASE } from "../lib/globalPrimaryNav";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";
import { useMemberAuth } from "./MemberAuthProvider";

export default function GlobalPrimaryNav() {
  const { user, loading, logout } = useMemberAuth();

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8">
      {GLOBAL_PRIMARY_NAV_BASE.map((item) => (
        <Link key={item.href} href={item.href} className={siteNavLinkClass}>
          {item.label}
        </Link>
      ))}
      {loading ? (
        <span
          className={`${siteNavLinkClass} inline-block min-w-[5rem] text-hui-muted`}
          aria-hidden
        >
          …
        </span>
      ) : user ? (
        <button
          type="button"
          onClick={() => logout()}
          className={`${siteNavLinkClass} cursor-pointer border-0 bg-transparent p-0`}
        >
          ออกจากระบบ
        </button>
      ) : (
        <Link href="/login" className={siteNavLinkClass}>
          เข้าสู่ระบบ
        </Link>
      )}
    </div>
  );
}
