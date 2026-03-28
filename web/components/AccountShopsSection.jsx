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
        ที่นี่คือจุด<strong>ลงสินค้าเพื่อขาย</strong>: เลือกร้านแล้วกด <strong>จัดการสินค้า</strong> (ต้องมีร้านในชื่อคุณแล้ว
        — แอดมินสร้างที่ <Link href="/admin?tab=shops" className="font-medium text-brand-800 underline">แอดมิน → ร้านทั้งหมด</Link>)
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {busy ? (
        <p className="text-sm text-slate-500">กำลังโหลด…</p>
      ) : shops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">ยังไม่มีร้าน — ยังลงขายไม่ได้</p>
          <p className="mt-2 text-slate-600">
            ระบบขายทำงานเมื่อแอดมินสร้างร้านและผูกบัญชีคุณแล้ว จากนั้นจะเห็นรายการร้านที่นี่และปุ่มจัดการสินค้า
          </p>
          {canOwnerPanel ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
              <li>
                <Link href="/owner" className="font-semibold text-brand-800 hover:underline">
                  หน้าขายสินค้า (เจ้าของร้าน)
                </Link>{" "}
                — สรุปขั้นตอน
              </li>
              {user?.role === "admin" ? (
                <li>
                  <Link href="/admin?tab=shops" className="font-semibold text-brand-800 hover:underline">
                    สร้างร้าน (แอดมิน)
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-3 text-slate-500">
              ติดต่อแอดมินให้ตั้งบทบาท <span className="font-mono text-xs">owner</span> และสร้างร้านผูกยูสเซอร์คุณ
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
                <Link
                  href={`/account/shops/${s.id}/products`}
                  className="font-medium text-brand-800 hover:underline"
                >
                  จัดการสินค้า
                </Link>
                {canOwnerPanel ? (
                  <Link href="/owner" className="font-medium text-brand-800 hover:underline">
                    แผงเจ้าของร้าน
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
