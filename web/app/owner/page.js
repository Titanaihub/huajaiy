"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { useMemberAuth } from "../../components/MemberAuthProvider";
import { getMemberToken } from "../../lib/memberApi";
import { apiOwnerPing, apiOwnerShops } from "../../lib/rolesApi";

export default function OwnerPage() {
  const { user, loading } = useMemberAuth();
  const [ping, setPing] = useState(null);
  const [shops, setShops] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || (user.role !== "owner" && user.role !== "admin")) return;
    const token = getMemberToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, s] = await Promise.all([apiOwnerPing(token), apiOwnerShops(token)]);
        if (!cancelled) {
          setPing(p);
          setShops(s.shops || []);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || String(e));
          setShops([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allowed = user && (user.role === "owner" || user.role === "admin");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-xl font-bold text-slate-900">เจ้าของร้าน</h1>
        <p className="mt-2 text-sm text-slate-600">
          โครงสร้าง API: <code className="rounded bg-brand-50 px-1">GET /api/owner/shops</code>{" "}
          (บทบาท <strong>owner</strong> หรือ <strong>admin</strong>)
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">กำลังโหลด...</p>
        ) : !user ? (
          <p className="mt-6 text-sm">
            <Link href="/login" className="font-medium text-brand-800 underline">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อน
          </p>
        ) : !allowed ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-medium">บัญชีนี้ยังไม่ใช่เจ้าของร้าน</p>
            <p className="mt-2 text-amber-900/90">
              ตั้งค่าในฐานข้อมูล:{" "}
              <code className="rounded bg-white/80 px-1">
                {`UPDATE users SET role = 'owner' WHERE username = '...';`}
              </code>
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-700">
              <strong>{user.username}</strong> — บทบาท:{" "}
              <span className="font-semibold text-brand-800">{user.role}</span>
            </p>
            {err ? (
              <p className="text-sm text-red-600">{err}</p>
            ) : null}
            {ping ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ทดสอบ /api/owner/ping
                </p>
                <pre className="mt-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-800">
                  {JSON.stringify(ping, null, 2)}
                </pre>
              </div>
            ) : !err ? (
              <p className="text-sm text-slate-500">กำลังโหลดสถานะ...</p>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ร้านของคุณ (ตาราง shops)
              </p>
              {shops === null ? (
                <p className="mt-2 text-sm text-slate-500">กำลังโหลดรายการร้าน...</p>
              ) : shops.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  ยังไม่มีร้านในฐานข้อมูล — โครงตารางพร้อมแล้ว รอ UI/ฟังก์ชันสร้างร้านต่อได้
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {shops.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{s.name}</span>{" "}
                      <span className="text-slate-500">({s.slug})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
