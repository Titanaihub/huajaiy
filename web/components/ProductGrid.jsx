"use client";

import Link from "next/link";
import { useState } from "react";
import { addToCart } from "../lib/cart";
import { mockProducts } from "../lib/mockProducts";
import { useHearts } from "./HeartsProvider";

export default function ProductGrid() {
  const { addHearts } = useHearts();
  const [lastId, setLastId] = useState(null);

  function grantDemo(p) {
    addHearts(p.hearts);
    setLastId(p.id);
  }

  function putInCart(p) {
    addToCart(p.id, 1);
    setLastId(`cart-${p.id}`);
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {mockProducts.map((p) => (
        <li
          key={p.id}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex h-28 items-center justify-center rounded-xl bg-slate-100 text-5xl text-slate-500">
            {p.emoji ?? "🛒"}
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">
            <Link
              href={`/shop/${p.id}`}
              className="hover:text-blue-700 hover:underline"
            >
              {p.name}
            </Link>
          </h2>
          <p className="mt-1 text-lg font-medium text-slate-800">
            ฿{p.price.toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-xs text-rose-600">แถมหัวใจร้าน {p.hearts} ดวง (ตัวอย่าง)</p>
          {p.badge ? (
            <span className="mt-2 inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {p.badge}
            </span>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => putInCart(p)}
              className="w-full rounded-xl bg-brand-800 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              ใส่ตะกร้า
            </button>
            <button
              type="button"
              onClick={() => grantDemo(p)}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
            >
              รับหัวใจทันที (สาธิต)
            </button>
          </div>
          {lastId === p.id ? (
            <p className="mt-2 text-center text-xs text-brand-700">+{p.hearts} ♥ แล้ว</p>
          ) : null}
          {lastId === `cart-${p.id}` ? (
            <p className="mt-2 text-center text-xs text-blue-700">ใส่ตะกร้าแล้ว</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
