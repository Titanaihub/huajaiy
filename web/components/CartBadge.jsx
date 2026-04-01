"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCartItemCount, subscribeCart } from "../lib/cart";

export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCartItemCount());
    return subscribeCart(() => setCount(getCartItemCount()));
  }, []);

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-1 rounded-full border border-hui-border bg-white px-2.5 py-1 text-xs font-semibold text-hui-body shadow-sm transition hover:border-hui-border hover:bg-hui-pageTop"
      title="ตะกร้า"
    >
      <span aria-hidden>🛒</span>
      <span>{count > 0 ? count.toLocaleString("th-TH") : "0"}</span>
    </Link>
  );
}
