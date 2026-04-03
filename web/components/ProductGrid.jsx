"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { addToCart } from "../lib/cart";
import {
  fetchMarketplaceCategories,
  fetchMarketplaceProducts,
  fetchMarketplaceShops
} from "../lib/marketplaceApi";

export default function ProductGrid() {
  const [q, setQ] = useState("");
  const [qApply, setQApply] = useState("");
  const [category, setCategory] = useState("");
  const [shopId, setShopId] = useState("");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cartHint, setCartHint] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    const res = await fetchMarketplaceProducts({
      q: qApply,
      category,
      shopId,
      limit: 48,
      offset: 0
    });
    if (!res.ok) {
      setErr(res.error || "โหลดไม่สำเร็จ");
      setProducts([]);
      setTotal(0);
    } else {
      setProducts(res.products);
      setTotal(res.total);
      if (res.products.length === 0 && res.ok) {
        setErr("");
      }
    }
    setLoading(false);
  }, [qApply, category, shopId]);

  useEffect(() => {
    let c = false;
    (async () => {
      const [cats, shps] = await Promise.all([
        fetchMarketplaceCategories(),
        fetchMarketplaceShops()
      ]);
      if (c) return;
      setCategories(cats.categories || []);
      setShops(shps.shops || []);
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const s = params.get("shopId") || "";
    if (s) setShopId(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function putInCart(p) {
    if ((p.stockQty ?? 0) < 1) return;
    addToCart(p.id, 1);
    setCartHint(p.id);
    window.setTimeout(() => setCartHint((x) => (x === p.id ? null : x)), 2000);
  }

  function applySearch(e) {
    e?.preventDefault?.();
    setQApply(q.trim());
  }

  return (
    <div className="mt-6 space-y-4">
      <form
        onSubmit={applySearch}
        className="flex flex-col gap-3 rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label className="hui-label">ค้นหา</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hui-border px-3 py-2.5 text-base text-hui-body sm:text-sm"
            placeholder="ชื่อหรือรายละเอียด"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="hui-label">หมวด</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hui-border px-3 py-2.5 text-base text-hui-body sm:text-sm"
          >
            <option value="">ทั้งหมด</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="hui-label">ร้าน</label>
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hui-border px-3 py-2.5 text-base text-hui-body sm:text-sm"
          >
            <option value="">ทุกร้าน</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="hui-btn-primary px-4 py-2 text-sm"
        >
          ค้นหา
        </button>
      </form>

      {err ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {err}
        </p>
      ) : null}
      {!loading && !err && products.length === 0 ? (
        <div className="rounded-2xl border border-hui-border bg-hui-surface p-5 text-sm text-hui-body shadow-soft">
          <p className="font-semibold text-hui-section">ยังไม่มีสินค้าโชว์ — ทำตามนี้ 3 ขั้น</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <strong>แอดมิน</strong> ไป{" "}
              <Link
                href="/admin?tab=shops"
                className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                แอดมิน → แท็บร้านทั้งหมด
              </Link>{" "}
              กด <strong>สร้างร้าน</strong> (ใส่ชื่อร้าน + ยูสเซอร์เจ้าของถ้ามี)
            </li>
            <li>
              <strong>เจ้าของร้าน</strong> ล็อกอิน →{" "}
              <Link
                href="/member/shops"
                className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                พื้นที่สมาชิก → ร้านค้าของฉัน
              </Link>{" "}
              → <strong>จัดการสินค้า</strong> → เพิ่มสินค้า
            </li>
            <li>
              รีเฟรชหน้านี้ — จะเห็นการ์ดสินค้าจริง
            </li>
          </ol>
        </div>
      ) : null}
      {loading ? <p className="text-sm text-hui-muted">กำลังโหลดสินค้า…</p> : null}
      {!loading && products.length > 0 ? (
        <p className="text-sm text-hui-muted">พบ {total} รายการ</p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-col rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft"
          >
            <Link
              href={`/shop/${p.id}`}
              className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-hui-pageTop text-5xl text-hui-muted"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>🛒</span>
              )}
            </Link>
            <h2 className="hui-card-title mt-3">
              <Link href={`/shop/${p.id}`} className="hover:text-hui-cta hover:underline">
                {p.title}
              </Link>
            </h2>
            <p className="hui-card-meta mt-0.5">{p.shopName}</p>
            <p className="hui-price mt-1">
              ฿{Number(p.priceThb).toLocaleString("th-TH")}
            </p>
            <p className="hui-card-meta">เหลือ {p.stockQty} ชิ้น</p>
            {p.heartsBonus > 0 ? (
              <p className="mt-1 text-sm font-medium text-hui-pink">แถมหัวใจ {p.heartsBonus}/ชิ้น</p>
            ) : null}
            <button
              type="button"
              disabled={(p.stockQty ?? 0) < 1}
              onClick={() => putInCart(p)}
              className="hui-btn-primary mt-4 w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {(p.stockQty ?? 0) < 1 ? "หมด" : "ใส่ตะกร้า"}
            </button>
            {cartHint === p.id ? (
              <p className="mt-2 text-center text-sm font-medium text-hui-section">ใส่ตะกร้าแล้ว</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
