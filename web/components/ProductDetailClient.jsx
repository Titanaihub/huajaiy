"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMarketplaceProduct } from "../lib/marketplaceApi";
import ProductDetailActions from "./ProductDetailActions";

export default function ProductDetailClient({ productId }) {
  const [product, setProduct] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      const res = await fetchMarketplaceProduct(productId);
      if (cancelled) return;
      if (!res.ok) {
        setErr(res.error || "ไม่พบสินค้า");
        setProduct(null);
      } else {
        setProduct(res.product);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-hui-muted">กำลังโหลดสินค้า…</p>
      </main>
    );
  }

  if (err || !product) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-red-600">{err || "ไม่พบสินค้า"}</p>
        <Link
          href="/shop"
          className="mt-4 inline-block text-sm font-medium text-hui-cta underline decoration-hui-cta/40"
        >
          ← กลับร้านค้า
        </Link>
      </main>
    );
  }

  const p = product;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs text-hui-muted">
        <Link href="/shop" className="font-medium text-hui-cta underline decoration-hui-cta/40">
          ร้านค้า
        </Link>
        <span className="mx-1 text-hui-border">/</span>
        <Link
          href={`/shop?shopId=${encodeURIComponent(p.shopId)}`}
          className="font-medium text-hui-cta underline decoration-hui-cta/40"
        >
          {p.shopName}
        </Link>
        <span className="mx-1 text-hui-border">/</span>
        <span className="text-hui-body">{p.title}</span>
      </p>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex aspect-square w-full max-w-[220px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-hui-pageTop text-7xl text-hui-muted">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>🛒</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {p.category ? (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {p.category}
            </span>
          ) : null}
          <h1 className="mt-2 text-xl font-semibold text-slate-900">{p.title}</h1>
          <p className="mt-2 text-2xl font-medium text-slate-800">
            ฿{Number(p.priceThb).toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            คงเหลือ {p.stockQty} ชิ้น · ร้าน {p.shopName}
          </p>
          {p.heartsBonus > 0 ? (
            <p className="mt-2 text-sm text-rose-700">
              แถมหัวใจชมพู {p.heartsBonus} ดวงต่อชิ้น (หลังยืนยันออเดอร์)
            </p>
          ) : null}
          {p.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {p.description}
            </p>
          ) : null}
          <ProductDetailActions product={p} />
        </div>
      </div>
      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href="/shop" className="font-medium text-hui-cta underline decoration-hui-cta/40">
          ← กลับร้านค้า
        </Link>
        <Link href="/cart" className="font-medium text-hui-cta underline decoration-hui-cta/40">
          ไปตะกร้า
        </Link>
      </div>
    </main>
  );
}
