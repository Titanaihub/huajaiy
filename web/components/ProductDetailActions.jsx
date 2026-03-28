"use client";

import { useState } from "react";
import { addToCart } from "../lib/cart";

export default function ProductDetailActions({ product }) {
  const [hint, setHint] = useState(null);
  const canBuy = (product.stockQty ?? 0) > 0;

  function putInCart() {
    if (!canBuy) return;
    addToCart(product.id, 1);
    setHint("cart");
    window.setTimeout(() => setHint(null), 2000);
  }

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={putInCart}
        disabled={!canBuy}
        className="w-full rounded-xl bg-brand-800 py-3 text-sm font-medium text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-300 sm:max-w-xs"
      >
        {canBuy ? "ใส่ตะกร้า" : "สินค้าหมด"}
      </button>
      {hint === "cart" ? (
        <p className="text-center text-xs text-blue-700">ใส่ตะกร้าแล้ว</p>
      ) : null}
    </div>
  );
}
