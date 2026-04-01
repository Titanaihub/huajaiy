"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { useMemberAuth } from "../../components/MemberAuthProvider";
import { getMemberToken } from "../../lib/memberApi";
import { apiOwnerShops } from "../../lib/rolesApi";

export default function OwnerPage() {
  const { user, loading } = useMemberAuth();
  const [shops, setShops] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || (user.role !== "owner" && user.role !== "admin")) return;
    const token = getMemberToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await apiOwnerShops(token);
        if (!cancelled) setShops(s.shops || []);
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
        <h1 className="text-xl font-bold text-slate-900">ขายสินค้า (เจ้าของร้าน)</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          ระบบขายทำงานแบบมาร์เก็ตเพลส: แอดมินสร้างร้านและผูกบัญชีคุณ → คุณลงสินค้า → ลูกค้าช้อปที่หน้า{" "}
          <Link href="/shop" className="font-medium text-brand-800 underline">
            ร้านค้า
          </Link>{" "}
          และยืนยันตะกร้าเป็นออเดอร์
        </p>

        <section className="mt-6 rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm text-slate-800">
          <p className="font-semibold text-slate-900">ขั้นตอนสั้น ๆ</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
            <li>
              แอดมินไป{" "}
              <Link href="/admin?tab=shops" className="font-medium text-brand-800 underline">
                แอดมิน → ร้านทั้งหมด
              </Link>{" "}
              สร้างร้าน และใส่ยูสเซอร์เจ้าของ (ถ้ามี)
            </li>
            <li>
              คุณล็อกอินแล้วไป{" "}
              <Link href="/account/shops" className="font-medium text-brand-800 underline">
                ร้านของฉัน
              </Link>{" "}
              → <strong>จัดการสินค้า</strong> เพิ่มชื่อ ราคา รูป สต็อก
            </li>
            <li>สินค้าที่เปิดใช้จะโผล่ในหน้าร้านค้า — ลูกค้าสั่งผ่านตะกร้า</li>
          </ol>
        </section>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">กำลังโหลด...</p>
        ) : !user ? (
          <p className="mt-6 text-sm">
            <Link href="/login?next=/owner" className="font-medium text-brand-800 underline">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อน แล้วค่อยลงสินค้าได้หลังแอดมินผูกร้านให้
          </p>
        ) : !allowed ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-medium">บัญชีนี้ยังไม่ใช่เจ้าของร้านในระบบ</p>
            <p className="mt-2 text-amber-900/90">
              ให้แอดมินตั้งบทบาท <code className="rounded bg-white/80 px-1">owner</code> และสร้างร้านผูกกับยูสเซอร์คุณ
              ที่แผงแอดมิน — หรือสมัครสมาชิกแล้วแจ้งทีมงานให้เปิดร้านให้
            </p>
            <p className="mt-3">
              <Link href="/account/shops" className="font-medium text-brand-800 underline">
                ไปหน้าร้านของฉัน
              </Link>{" "}
              (จะว่างจนกว่าจะมีร้านในชื่อคุณ)
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-700">
              เข้าสู่ระบบเป็น <strong>{user.username}</strong> · บทบาท{" "}
              <span className="font-semibold text-brand-800">{user.role}</span>
            </p>
            {user.role === "admin" ? (
              <p className="text-sm text-slate-600">
                คุณเป็นแอดมิน — สร้างร้านได้ที่{" "}
                <Link href="/admin?tab=shops" className="font-medium text-brand-800 underline">
                  สร้างร้านใหม่ (แอดมิน)
                </Link>
              </p>
            ) : null}
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">ร้านที่คุณดูแล</h2>
              {shops === null ? (
                <p className="mt-2 text-sm text-slate-500">กำลังโหลดรายการร้าน...</p>
              ) : shops.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-700">
                  <p>ยังไม่มีร้านในชื่อคุณ — ยังลงสินค้าไม่ได้</p>
                  <p className="mt-2">
                    {user.role === "admin" ? (
                      <>
                        สร้างร้านและผูกเจ้าของได้ที่{" "}
                        <Link href="/admin?tab=shops" className="font-medium text-brand-800 underline">
                          /admin?tab=shops
                        </Link>
                      </>
                    ) : (
                      <>ให้แอดมินสร้างร้านและใส่ยูสเซอร์คุณเป็นผู้ดูแล</>
                    )}
                  </p>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {shops.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                    >
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{s.slug}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Link
                          href={`/account/shops/${s.id}/products`}
                          className="hui-btn-primary inline-flex px-3 py-1.5 text-sm"
                        >
                          จัดการสินค้า (ลงขาย)
                        </Link>
                        <Link
                          href="/shop"
                          className="inline-flex rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          ไปหน้าร้านค้า
                        </Link>
                        <Link
                          href="/account/shops"
                          className="inline-flex text-sm font-medium text-brand-800 underline"
                        >
                          ร้านของฉัน
                        </Link>
                      </div>
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
