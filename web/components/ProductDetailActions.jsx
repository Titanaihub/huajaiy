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
        className="hui-btn-primary w-full py-3 text-sm sm:max-w-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        {canBuy ? "ใส่ตะกร้า" : "สินค้าหมด"}
      </button>
      {hint === "cart" ? (
        <p className="text-center text-xs font-medium text-hui-section">ใส่ตะกร้าแล้ว</p>
      ) : null}
    </div>
  );
}
