"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearCart,
  getCart,
  removeLine,
  setLineQty,
  subscribeCart
} from "../lib/cart";
import { fetchMarketplaceResolve } from "../lib/marketplaceApi";
import { postMarketplaceOrder } from "../lib/ordersApi";
import { getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";
import InlineHeart from "./InlineHeart";

export default function CartContents() {
  const { user, refresh } = useMemberAuth();
  const [lines, setLines] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [resolveErr, setResolveErr] = useState("");
  const [shipping, setShipping] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [checkoutErr, setCheckoutErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLines(getCart());
    return subscribeCart(() => setLines(getCart()));
  }, []);

  useEffect(() => {
    if (user?.shippingAddress && !shipping) {
      setShipping(user.shippingAddress);
    }
  }, [user, shipping]);

  useEffect(() => {
    const ids = lines.map((l) => l.productId);
    if (ids.length === 0) {
      setProductsById({});
      setResolveErr("");
      return;
    }
    let cancelled = false;
    (async () => {
      setResolveErr("");
      const res = await fetchMarketplaceResolve(ids);
      if (cancelled) return;
      if (!res.ok) {
        setResolveErr(res.error || "โหลดข้อมูลสินค้าไม่สำเร็จ");
        setProductsById({});
        return;
      }
      const map = {};
      for (const p of res.products) {
        map[p.id] = p;
      }
      setProductsById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [lines]);

  const rows = useMemo(() => {
    return lines
      .map((line) => {
        const product = productsById[line.productId];
        if (!product) return { line, product: null };
        return { line, product };
      })
      .filter((x) => x.product);
  }, [lines, productsById]);

  const missingCount = useMemo(() => {
    return lines.filter((l) => !productsById[l.productId]).length;
  }, [lines, productsById]);

  const totals = useMemo(() => {
    let price = 0;
    let hearts = 0;
    for (const r of rows) {
      const maxQ = r.product.stockQty ?? 0;
      const q = Math.min(r.line.qty, maxQ);
      price += r.product.priceThb * q;
      hearts += (r.product.heartsBonus || 0) * q;
    }
    return { price, hearts };
  }, [rows]);

  async function checkout() {
    setCheckoutErr("");
    if (rows.length === 0) return;
    if (!getMemberToken()) {
      setCheckoutErr("กรุณาเข้าสู่ระบบก่อนยืนยันออเดอร์");
      return;
    }
    const addr = shipping.trim();
    if (addr.length < 10) {
      setCheckoutErr("กรุณากรอกที่อยู่จัดส่งให้ครบ (อย่างน้อย 10 ตัวอักษร)");
      return;
    }
    for (const r of rows) {
      if (r.line.qty > (r.product.stockQty ?? 0)) {
        setCheckoutErr(
          `จำนวน「${r.product.title}» เกินสต็อก (เหลือ ${r.product.stockQty})`
        );
        return;
      }
    }
    setBusy(true);
    try {
      const res = await postMarketplaceOrder({
        lines: rows.map((r) => ({
          productId: r.line.productId,
          qty: r.line.qty
        })),
        shippingAddress: addr
      });
      if (!res.ok) {
        setCheckoutErr(res.error || "ยืนยันไม่สำเร็จ");
        return;
      }
      await refresh?.();
      clearCart();
      setDoneMsg(
        `สร้างออเดอร์แล้ว — สถานะ「รอชำระเงิน» · ยอด ฿${totals.price.toLocaleString("th-TH")}` +
          (totals.hearts > 0 ? ` · ได้รับหัวใจชมพู ${totals.hearts} ดวง` : "")
      );
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0 && !doneMsg) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        <p>ตะกร้าว่าง</p>
        <Link
          href="/shop"
          className="mt-3 inline-block text-blue-600 underline hover:text-blue-800"
        >
          ไปเลือกสินค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {doneMsg ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          {doneMsg}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/account/orders"
              className="rounded-lg bg-brand-800 px-3 py-1.5 text-white hover:bg-brand-900"
            >
              ออเดอร์ของฉัน
            </Link>
            <Link
              href="/shop"
              className="rounded-lg border border-brand-300 px-3 py-1.5 text-brand-900 hover:bg-brand-100"
            >
              ช้อปต่อ
            </Link>
          </div>
        </div>
      ) : null}

      {missingCount > 0 && !doneMsg ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          มี {missingCount} รายการในตะกร้าที่ไม่พบในระบบ (อาจถูกลบหรือปิดขาย) —{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              for (const l of lines) {
                if (!productsById[l.productId]) removeLine(l.productId);
              }
            }}
          >
            เอารายการเสียออก
          </button>
        </p>
      ) : null}
      {resolveErr ? (
        <p className="text-sm text-red-600">{resolveErr}</p>
      ) : null}

      {!doneMsg ? (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {rows.map(({ line, product }) => (
            <li
              key={line.productId}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{product.title}</p>
                <p className="text-xs text-slate-500">{product.shopName}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-slate-600">
                  <span>฿{Number(product.priceThb).toLocaleString("th-TH")} / ชิ้น</span>
                  {product.heartsBonus > 0 ? (
                    <>
                      <span>· แถม</span>
                      <InlineHeart size="sm" className="text-brand-700" />
                      <span>{product.heartsBonus} / ชิ้น</span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">สต็อก {product.stockQty} ชิ้น</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`qty-${line.productId}`}>
                  จำนวน
                </label>
                <input
                  id={`qty-${line.productId}`}
                  type="number"
                  min={1}
                  max={Math.max(1, product.stockQty)}
                  value={Math.min(line.qty, product.stockQty)}
                  onChange={(e) =>
                    setLineQty(line.productId, Number(e.target.value))
                  }
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.productId)}
                  className="text-sm text-rose-600 underline hover:text-rose-800"
                >
                  ลบ
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!doneMsg && rows.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-700">
              ที่อยู่จัดส่ง
            </label>
            <textarea
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="ชื่อ โทร ที่อยู่เต็ม"
            />
            <p className="mt-1 text-xs text-slate-500">
              บันทึกถาวรในออเดอร์ — แก้ค่าเริ่มต้นได้ที่{" "}
              <Link href="/account/profile" className="text-brand-800 underline">
                โปรไฟล์
              </Link>
            </p>
          </div>
          <p className="flex justify-between text-slate-800">
            <span>ยอดรวม</span>
            <span className="font-semibold">
              ฿{totals.price.toLocaleString("th-TH")}
            </span>
          </p>
          {totals.hearts > 0 ? (
            <p className="flex flex-wrap items-center justify-between gap-1 text-rose-800">
              <span>หัวใจชมพูหลังยืนยัน (ตามสินค้า)</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <InlineHeart size="sm" className="text-rose-700" />
                {totals.hearts}
              </span>
            </p>
          ) : null}
          {checkoutErr ? (
            <p className="text-sm text-red-600">{checkoutErr}</p>
          ) : null}
          {!user ? (
            <p className="text-sm text-slate-700">
              <Link href="/login?next=/cart" className="font-semibold text-brand-800 underline">
                เข้าสู่ระบบ
              </Link>{" "}
              เพื่อยืนยันออเดอร์
            </p>
          ) : (
            <button
              type="button"
              disabled={busy || missingCount > 0}
              onClick={checkout}
              className="w-full rounded-xl bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:bg-slate-400"
            >
              {busy ? "กำลังดำเนินการ…" : "ยืนยันออเดอร์ (รอชำระเงิน)"}
            </button>
          )}
          <p className="text-xs text-slate-500">
            ระบบตัดสต็อกทันที · ชำระเงินหลายช่องทางตามที่วางแผนในขั้นถัดไป
          </p>
        </div>
      ) : null}
    </div>
  );
}
