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
      router.replace("/login");
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
      <p className="text-sm text-hui-body" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const canOwnerPanel = user.role === "owner" || user.role === "admin";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-hui-section">ร้านของฉัน</h2>
      <p className="text-sm text-hui-body">
        ที่นี่คือจุด<strong>ลงสินค้าเพื่อขาย</strong>: เลือกร้านแล้วกด <strong>จัดการสินค้า</strong> (ต้องมีร้านในชื่อคุณแล้ว
        — แอดมินสร้างที่ <Link href="/admin?tab=shops" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">แอดมิน → ร้านทั้งหมด</Link>)
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {busy ? (
        <p className="text-sm text-hui-muted">กำลังโหลด…</p>
      ) : shops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hui-border bg-hui-pageTop/90 p-6 text-sm text-hui-body">
          <p className="font-medium text-hui-body">ยังไม่มีร้าน — ยังลงขายไม่ได้</p>
          <p className="mt-2 text-hui-body">
            ระบบขายทำงานเมื่อแอดมินสร้างร้านและผูกบัญชีคุณแล้ว จากนั้นจะเห็นรายการร้านที่นี่และปุ่มจัดการสินค้า
          </p>
          {canOwnerPanel ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-hui-body">
              <li>
                <Link href="/owner" className="font-semibold text-hui-cta hover:underline">
                  หน้าขายสินค้า (เจ้าของร้าน)
                </Link>{" "}
                — สรุปขั้นตอน
              </li>
              {user?.role === "admin" ? (
                <li>
                  <Link href="/admin?tab=shops" className="font-semibold text-hui-cta hover:underline">
                    สร้างร้าน (แอดมิน)
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-3 text-hui-muted">
              ติดต่อแอดมินให้ตั้งบทบาท <span className="font-mono text-sm">owner</span> และสร้างร้านผูกยูสเซอร์คุณ
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {shops.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-hui-border bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-hui-section">{s.name}</p>
              <p className="mt-1 font-mono text-sm text-hui-body">{s.slug}</p>
              <p className="mt-2 text-sm text-hui-muted">
                สร้าง{" "}
                {s.createdAt
                  ? new Date(s.createdAt).toLocaleString("th-TH")
                  : "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href="/shop" className="font-medium text-hui-cta hover:underline">
                  ไปหน้าร้านค้า
                </Link>
                <Link
                  href={`/account/shops/${s.id}/products`}
                  className="font-medium text-hui-cta hover:underline"
                >
                  จัดการสินค้า
                </Link>
                {canOwnerPanel ? (
                  <Link href="/owner" className="font-medium text-hui-cta hover:underline">
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
