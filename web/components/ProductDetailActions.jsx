"use client";

import { useState } from "react";
import { addToCart } from "../lib/cart";
import { useHearts } from "./HeartsProvider";
import InlineHeart from "./InlineHeart";

export default function ProductDetailActions({ product }) {
  const { addHearts } = useHearts();
  const [hint, setHint] = useState(null);

  function putInCart() {
    addToCart(product.id, 1);
    setHint("cart");
  }

  function grantHearts() {
    addHearts(product.hearts);
    setHint("hearts");
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={putInCart}
          className="flex-1 rounded-xl bg-brand-800 py-3 text-sm font-medium text-white hover:bg-brand-900"
        >
          ใส่ตะกร้า
        </button>
        <button
          type="button"
          onClick={grantHearts}
          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-medium text-rose-900 hover:bg-rose-100"
        >
          รับหัวใจทันที (สาธิต)
        </button>
      </div>
      {hint === "cart" ? (
        <p className="text-center text-xs text-blue-700">ใส่ตะกร้าแล้ว</p>
      ) : null}
      {hint === "hearts" ? (
        <p className="flex items-center justify-center gap-1 text-center text-xs text-brand-700">
          <span>+{product.hearts}</span>
          <InlineHeart size="md" />
          <span>แล้ว</span>
        </p>
      ) : null}
    </div>
  );
}
