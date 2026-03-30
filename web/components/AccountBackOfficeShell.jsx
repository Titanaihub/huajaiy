"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiGetCreatorWithdrawalStatus, getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

const linkBase =
  "block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-900";
const linkActive = "bg-brand-100 text-brand-900";
const linkIdle = "text-slate-700";

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/account" && pathname.startsWith(href));
  return (
    <Link href={href} className={`${linkBase} ${active ? linkActive : linkIdle}`}>
      {children}
    </Link>
  );
}

export default function AccountBackOfficeShell({ children }) {
  const { user } = useMemberAuth();
  const isOwner = user && (user.role === "owner" || user.role === "admin");
  const [isGameCreator, setIsGameCreator] = useState(false);

  const loadCreatorStatus = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setIsGameCreator(false);
      return;
    }
    try {
      const data = await apiGetCreatorWithdrawalStatus(token);
      setIsGameCreator(Boolean(data?.isGameCreator));
    } catch {
      setIsGameCreator(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setIsGameCreator(false);
      return;
    }
    void loadCreatorStatus();
  }, [user, loadCreatorStatus]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">หลังบ้านสมาชิก</h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <nav
          className="shrink-0 lg:w-56"
          aria-label="เมนูหลังบ้านสมาชิก"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            เมนู
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <NavLink href="/account">ภาพรวม</NavLink>
            </li>
            <li>
              <NavLink href="/account/prizes">รางวัลของฉัน</NavLink>
            </li>
            <li>
              <NavLink href="/account/my-games">เกมของฉัน</NavLink>
            </li>
            <li>
              <NavLink href="/account/create-game">สร้างเกม</NavLink>
            </li>
            <li>
              <NavLink href="/account/prize-payouts">จ่ายรางวัล</NavLink>
            </li>
            <li>
              <NavLink href="/account/profile">ข้อมูลส่วนตัว</NavLink>
            </li>
            {isGameCreator ? (
              <li>
                <NavLink href="/account/creator-withdrawals">คำขอถอนรางวัลถึงฉัน</NavLink>
              </li>
            ) : null}
            <li>
              <NavLink href="/account/my-hearts">หัวใจของฉัน</NavLink>
            </li>
            <li>
              <NavLink href="/account/hearts-shop">ซื้อหัวใจ</NavLink>
            </li>
            <li>
              <NavLink href="/account/heart-history">ประวัติหัวใจ</NavLink>
            </li>
            {isOwner ? (
              <li>
                <Link
                  href="/owner"
                  className={`${linkBase} ${linkIdle}`}
                >
                  แผงเจ้าของร้าน
                </Link>
              </li>
            ) : null}
            {user?.role === "admin" ? (
              <li>
                <Link
                  href="/admin"
                  className={`${linkBase} ${linkIdle}`}
                >
                  แอดมิน
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
