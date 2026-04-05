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
    if (!user) return;
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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-xl font-bold text-hui-section">ขายสินค้า (เจ้าของร้าน)</h1>
        <p className="mt-2 max-w-2xl text-sm text-hui-body">
          ระบบขายทำงานแบบมาร์เก็ตเพลส: แอดมินสร้างร้านและผูกบัญชีคุณ → คุณลงสินค้า → ลูกค้าเปิดลิงก์สินค้าโดยตรง
          (/shop/รหัส) หรือไป{" "}
          <Link href="/page" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
            เพจชุมชน
          </Link>{" "}
          แล้วยืนยันตะกร้าเป็นออเดอร์
        </p>

        <section className="mt-6 rounded-xl border border-hui-border bg-hui-pageTop/40 p-4 text-sm text-hui-body">
          <p className="font-semibold text-hui-section">ขั้นตอนสั้น ๆ</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-hui-body">
            <li>
              แอดมินไป{" "}
              <Link href="/admin?tab=shops" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
                แอดมิน → ร้านทั้งหมด
              </Link>{" "}
              สร้างร้าน และใส่ยูสเซอร์เจ้าของ (ถ้ามี)
            </li>
            <li>
              คุณล็อกอินแล้วไป{" "}
              <Link href="/account/shops" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
                ร้านของฉัน
              </Link>{" "}
              → <strong>จัดการสินค้า</strong> เพิ่มชื่อ ราคา รูป สต็อก
            </li>
            <li>
              สินค้าที่เปิดใช้มี URL ของตัวเอง (/shop/รหัส) — แชร์ลิงก์ได้ · ลูกค้าสั่งผ่านตะกร้า
            </li>
          </ol>
        </section>

        {loading ? (
          <p className="mt-6 text-sm text-hui-muted">กำลังโหลด...</p>
        ) : !user ? (
          <p className="mt-6 text-sm">
            <Link href="/login" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อน แล้วค่อยลงสินค้าได้หลังแอดมินผูกร้านให้
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-hui-body">
              เข้าสู่ระบบเป็น <strong>{user.username}</strong> · บทบาท{" "}
              <span className="font-semibold text-hui-cta">{user.role}</span>
            </p>
            {user.role === "admin" ? (
              <p className="text-sm text-hui-body">
                คุณเป็นแอดมิน — สร้างร้านได้ที่{" "}
                <Link href="/admin?tab=shops" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
                  สร้างร้านใหม่ (แอดมิน)
                </Link>
              </p>
            ) : null}
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <div>
              <h2 className="text-sm font-semibold text-hui-section">ร้านที่คุณดูแล</h2>
              {shops === null ? (
                <p className="mt-2 text-sm text-hui-muted">กำลังโหลดรายการร้าน...</p>
              ) : shops.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-hui-border bg-hui-pageTop/95 p-4 text-sm text-hui-body">
                  <p>ยังไม่มีร้านในชื่อคุณ — ยังลงสินค้าไม่ได้</p>
                  <p className="mt-2">
                    {user.role === "admin" ? (
                      <>
                        สร้างร้านและผูกเจ้าของได้ที่{" "}
                        <Link href="/admin?tab=shops" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
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
                      className="rounded-xl border border-hui-border bg-white p-4 text-sm shadow-sm"
                    >
                      <p className="font-semibold text-hui-section">{s.name}</p>
                      <p className="mt-1 font-mono text-sm text-hui-muted">{s.slug}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Link
                          href={`/member/shops/${s.id}/products`}
                          className="hui-btn-primary inline-flex px-3 py-1.5 text-sm"
                        >
                          จัดการสินค้า (ลงขาย)
                        </Link>
                        <Link
                          href="/page"
                          className="inline-flex rounded-lg border border-hui-border px-3 py-1.5 text-sm font-medium text-hui-body hover:bg-hui-pageTop"
                        >
                          ไปเพจชุมชน
                        </Link>
                        <Link
                          href="/account/shops"
                          className="inline-flex text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
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
