"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InlineHeart from "./InlineHeart";
import {
  apiGetMyShops,
  getMemberToken
} from "../lib/memberApi";
import { fetchServerOrders } from "../lib/ordersApi";
import { useMemberAuth } from "./MemberAuthProvider";

function formatThai(ts) {
  try {
    return new Date(ts).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "—";
  }
}

export default function AccountDashboardOverview() {
  const router = useRouter();
  const { user, loading, refresh } = useMemberAuth();
  const [orders, setOrders] = useState([]);
  const [ordersErr, setOrdersErr] = useState("");
  const [shops, setShops] = useState([]);
  const [shopsLoaded, setShopsLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await fetchServerOrders();
      if (cancelled) return;
      if (res.ok) setOrders(res.orders || []);
      if (res.error) setOrdersErr(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = getMemberToken();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetMyShops(token);
        if (!cancelled) setShops(data.shops || []);
      } catch {
        if (!cancelled) setShops([]);
      } finally {
        if (!cancelled) setShopsLoaded(true);
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

  const pink = Number(user.pinkHeartsBalance ?? 0);
  const red = Number(user.redHeartsBalance ?? 0);
  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">สวัสดี {user.firstName}</h2>
        <p className="mt-1 text-sm text-slate-600">
          @{user.username} · เบอร์ {user.phone}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-rose-800/80">
              หัวใจชมพู (เซิร์ฟเวอร์)
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-rose-900">
              <InlineHeart className="text-rose-400" />
              {pink.toLocaleString("th-TH")}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase text-red-900/80">หัวใจแดง</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-800">
              <InlineHeart className="text-red-600" />
              {red.toLocaleString("th-TH")}
            </p>
            <p className="mt-2 text-xs text-rose-900/70">
              รวม { (pink + red).toLocaleString("th-TH") } — มุมจออาจมีหัวใจสาธิตในเครื่องแยกต่างหาก
            </p>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-3 text-xs font-semibold text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
            >
              รีเฟรชยอด
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">ทางลัด</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/account/profile" className="font-medium text-brand-800 hover:underline">
                  แก้ที่อยู่จัดส่ง / ข้อมูลส่วนตัว
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="font-medium text-brand-800 hover:underline">
                  ดูออเดอร์ทั้งหมด
                </Link>
              </li>
              <li>
                <Link href="/account/hearts-shop" className="font-medium text-brand-800 hover:underline">
                  ซื้อหัวใจ (แนบสลิป)
                </Link>
              </li>
              <li>
                <Link href="/shop" className="font-medium text-brand-800 hover:underline">
                  ไปช้อปปิ้ง
                </Link>
              </li>
              <li>
                <Link href="/account/shops" className="font-medium text-brand-800 hover:underline">
                  ร้านของฉัน — ลงสินค้าขาย
                </Link>
              </li>
              {(user.role === "owner" || user.role === "admin") && (
                <li>
                  <Link href="/owner" className="font-medium text-brand-800 hover:underline">
                    คู่มือขั้นตอนขาย (เจ้าของร้าน)
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">ออเดอร์ล่าสุด</h2>
          <Link href="/account/orders" className="text-sm font-medium text-brand-800 hover:underline">
            ดูทั้งหมด
          </Link>
        </div>
        {ordersErr ? (
          <p className="mt-2 text-sm text-amber-800">{ordersErr}</p>
        ) : null}
        {recent.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
            ยังไม่มีออเดอร์บนเซิร์ฟเวอร์ — ยืนยันตะกร้าขณะล็อกอินเพื่อบันทึก
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recent.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-2 text-slate-600">
                  <span className="font-mono text-xs">{o.id.slice(0, 8)}…</span>
                  <time dateTime={new Date(o.createdAt).toISOString()}>
                    {formatThai(o.createdAt)}
                  </time>
                </div>
                <p className="mt-2 font-semibold text-slate-900">
                  ฿{Number(o.totalPrice).toLocaleString("th-TH")}{" "}
                  <span className="font-normal text-slate-600">
                    · แถมหัวใจ {Number(o.heartsGranted).toLocaleString("th-TH")}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">ร้านของฉัน</h2>
          {shops.length > 0 ? (
            <Link href="/account/shops" className="text-sm font-medium text-brand-800 hover:underline">
              จัดการ
            </Link>
          ) : null}
        </div>
        {!shopsLoaded ? (
          <p className="mt-3 text-sm text-slate-500">กำลังโหลด…</p>
        ) : shops.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
            <p>ยังไม่มีร้านในชื่อคุณ — ระบบลงขายจะใช้ได้หลังแอดมินสร้างร้านและผูกบัญชี</p>
            <p className="mt-2">
              <Link href="/account/shops" className="font-medium text-brand-800 hover:underline">
                ไปหน้าร้านของฉัน
              </Link>
              {user.role === "owner" || user.role === "admin" ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href="/owner" className="font-medium text-brand-800 hover:underline">
                    ดูขั้นตอนขาย
                  </Link>
                </>
              ) : null}
              {user.role === "admin" ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href="/admin?tab=shops" className="font-medium text-brand-800 hover:underline">
                    สร้างร้าน (แอดมิน)
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {shops.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span>
                  <span className="font-medium text-slate-900">{s.name}</span>{" "}
                  <span className="text-slate-500">({s.slug})</span>
                </span>
                <Link
                  href={`/account/shops/${s.id}/products`}
                  className="shrink-0 font-medium text-brand-800 hover:underline"
                >
                  จัดการสินค้า
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
