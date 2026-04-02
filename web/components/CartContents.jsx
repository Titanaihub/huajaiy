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
import { MEMBER_WORKSPACE_PATH } from "../lib/memberWorkspacePath";
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
      <div className="rounded-2xl border border-dashed border-hui-border bg-hui-surface p-8 text-center text-sm text-hui-muted">
        <p>ตะกร้าว่าง</p>
        <Link
          href="/shop"
          className="mt-3 inline-block font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
        >
          ไปเลือกสินค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {doneMsg ? (
        <div className="rounded-2xl border border-hui-border bg-hui-surface p-4 text-sm text-hui-body shadow-soft">
          {doneMsg}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/account/orders" className="hui-btn-primary px-3 py-1.5 text-sm">
              ออเดอร์ของฉัน
            </Link>
            <Link
              href="/shop"
              className="rounded-2xl border border-hui-border bg-white px-3 py-1.5 text-sm font-semibold text-hui-section shadow-soft hover:bg-hui-pageTop"
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
        <ul className="divide-y divide-hui-border rounded-2xl border border-hui-border bg-hui-surface shadow-soft">
          {rows.map(({ line, product }) => (
            <li
              key={line.productId}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="hui-card-title">{product.title}</p>
                <p className="hui-card-meta">{product.shopName}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-hui-body">
                  <span className="font-semibold text-hui-cta">
                    ฿{Number(product.priceThb).toLocaleString("th-TH")}
                  </span>
                  <span>/ ชิ้น</span>
                  {product.heartsBonus > 0 ? (
                    <>
                      <span>· แถม</span>
                      <InlineHeart size="sm" className="text-hui-pink" />
                      <span>{product.heartsBonus} / ชิ้น</span>
                    </>
                  ) : null}
                </p>
                <p className="text-sm text-hui-muted">สต็อก {product.stockQty} ชิ้น</p>
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
                  className="w-20 rounded-xl border border-hui-border px-2 py-1 text-sm text-hui-body"
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
        <div className="rounded-2xl border border-hui-border bg-hui-surface/95 p-4 text-sm space-y-3 shadow-soft">
          <div>
            <label className="hui-label block">ที่อยู่จัดส่ง</label>
            <textarea
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              rows={3}
              className="hui-input mt-1"
              placeholder="ชื่อ โทร ที่อยู่เต็ม"
            />
            <p className="mt-1 text-sm text-hui-muted">
              บันทึกถาวรในออเดอร์ — แก้ค่าเริ่มต้นได้ที่{" "}
              <Link
                href={MEMBER_WORKSPACE_PATH}
                className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                โปรไฟล์
              </Link>
            </p>
          </div>
          <p className="flex justify-between text-hui-body">
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
            <p className="text-sm text-hui-body">
              <Link
                href="/hui/login?next=/cart"
                className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                เข้าสู่ระบบ
              </Link>{" "}
              เพื่อยืนยันออเดอร์
            </p>
          ) : (
            <button
              type="button"
              disabled={busy || missingCount > 0}
              onClick={checkout}
              className="hui-btn-primary w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "กำลังดำเนินการ…" : "ยืนยันออเดอร์ (รอชำระเงิน)"}
            </button>
          )}
          <p className="text-sm text-hui-muted">
            ระบบตัดสต็อกทันที · ชำระเงินหลายช่องทางตามที่วางแผนในขั้นถัดไป
          </p>
        </div>
      ) : null}
    </div>
  );
}
