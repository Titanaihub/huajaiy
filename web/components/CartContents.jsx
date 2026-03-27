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
import { mockProducts } from "../lib/mockProducts";
import { addOrder } from "../lib/orderHistory";
import { useHearts } from "./HeartsProvider";

function resolveProduct(id) {
  return mockProducts.find((p) => p.id === id) || null;
}

export default function CartContents() {
  const { addHearts } = useHearts();
  const [lines, setLines] = useState([]);
  const [doneMsg, setDoneMsg] = useState("");

  useEffect(() => {
    setLines(getCart());
    return subscribeCart(() => setLines(getCart()));
  }, []);

  const rows = useMemo(() => {
    return lines
      .map((line) => {
        const product = resolveProduct(line.productId);
        if (!product) return null;
        return { line, product };
      })
      .filter(Boolean);
  }, [lines]);

  const totals = useMemo(() => {
    let price = 0;
    let hearts = 0;
    for (const r of rows) {
      price += r.product.price * r.line.qty;
      hearts += r.product.hearts * r.line.qty;
    }
    return { price, hearts };
  }, [rows]);

  function checkoutDemo() {
    if (rows.length === 0) return;
    addOrder({
      totalPrice: totals.price,
      hearts: totals.hearts,
      items: rows.map(({ line, product }) => ({
        name: product.name,
        qty: line.qty,
        lineSubtotal: product.price * line.qty,
        hearts: product.hearts * line.qty
      }))
    });
    addHearts(totals.hearts);
    clearCart();
    setDoneMsg(
      `ยืนยันออเดอร์สาธิตแล้ว — ได้รับหัวใจ ${totals.hearts} ดวงจากสินค้าในตะกร้า`
    );
  }

  if (rows.length === 0 && !doneMsg) {
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {doneMsg}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/game"
              className="rounded-lg bg-emerald-800 px-3 py-1.5 text-white hover:bg-emerald-900"
            >
              ไปเล่นเกม
            </Link>
            <Link
              href="/shop"
              className="rounded-lg border border-emerald-300 px-3 py-1.5 text-emerald-900 hover:bg-emerald-100"
            >
              ช้อปต่อ
            </Link>
            <Link
              href="/orders"
              className="rounded-lg border border-emerald-300 px-3 py-1.5 text-emerald-900 hover:bg-emerald-100"
            >
              ดูประวัติออเดอร์
            </Link>
          </div>
        </div>
      ) : null}

      {!doneMsg ? (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {rows.map(({ line, product }) => (
            <li
              key={line.productId}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{product.name}</p>
                <p className="text-sm text-slate-600">
                  ฿{product.price.toLocaleString("th-TH")} / ชิ้น · แถม ♥{" "}
                  {product.hearts} / ชิ้น
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`qty-${line.productId}`}>
                  จำนวน
                </label>
                <input
                  id={`qty-${line.productId}`}
                  type="number"
                  min={1}
                  max={99}
                  value={line.qty}
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="flex justify-between text-slate-800">
            <span>ยอดรวม (สาธิต)</span>
            <span className="font-semibold">
              ฿{totals.price.toLocaleString("th-TH")}
            </span>
          </p>
          <p className="mt-1 flex justify-between text-rose-800">
            <span>หัวใจที่จะได้เมื่อยืนยัน</span>
            <span className="font-semibold">♥ {totals.hearts}</span>
          </p>
          <button
            type="button"
            onClick={checkoutDemo}
            className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            ยืนยันออเดอร์ (สาธิต — ยังไม่ชำระเงินจริง)
          </button>
          <p className="mt-2 text-xs text-slate-500">
            จำลองการแจกหัวใจหลังออเดอร์ — ต่อระบบชำระเงินและ webhook ภายหลัง
          </p>
        </div>
      ) : null}
    </div>
  );
}
