"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGetMyShops, getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountShopsSection() {
  const router = useRouter();
  const { user, loading } = useMemberAuth();
  const [shops, setShops] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/shops");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const token = getMemberToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const data = await apiGetMyShops(token);
        if (!cancelled) setShops(data.shops || []);
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || String(e));
          setShops([]);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const canOwnerPanel = user.role === "owner" || user.role === "admin";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">ร้านของฉัน</h2>
      <p className="text-sm text-slate-600">
        ร้านในตาราง <code className="rounded bg-slate-100 px-1 text-xs">shops</code> ที่เชื่อมกับบัญชีคุณ (
        <code className="rounded bg-slate-100 px-1 text-xs">owner_user_id</code>)
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {busy ? (
        <p className="text-sm text-slate-500">กำลังโหลด…</p>
      ) : shops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
          <p>ยังไม่มีร้านในชื่อบัญชีนี้</p>
          {canOwnerPanel ? (
            <p className="mt-3">
              <Link href="/owner" className="font-semibold text-brand-800 hover:underline">
                เปิดแผงเจ้าของร้าน
              </Link>
            </p>
          ) : (
            <p className="mt-3 text-slate-500">
              หากคุณเป็นเจ้าของร้าน ให้ติดต่อแอดมินเพื่อตั้งบทบาทและผูกร้าน
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {shops.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-slate-900">{s.name}</p>
              <p className="mt-1 font-mono text-xs text-slate-600">{s.slug}</p>
              <p className="mt-2 text-xs text-slate-500">
                สร้าง{" "}
                {s.createdAt
                  ? new Date(s.createdAt).toLocaleString("th-TH")
                  : "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href="/shop" className="font-medium text-brand-800 hover:underline">
                  ไปหน้าร้านค้า
                </Link>
                {canOwnerPanel ? (
                  <Link href="/owner" className="font-medium text-brand-800 hover:underline">
                    จัดการ (เจ้าของร้าน)
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
