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
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label className="text-xs font-medium text-slate-600">ค้นหา</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="ชื่อหรือรายละเอียด"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="text-xs font-medium text-slate-600">หมวด</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
          <label className="text-xs font-medium text-slate-600">ร้าน</label>
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
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
        <p className="text-sm text-slate-600">
          ยังไม่มีสินค้าในระบบ — แอดมินสร้างร้านแล้วเจ้าของร้านเพิ่มสินค้าที่{" "}
          <Link href="/account/shops" className="font-medium text-brand-800 underline">
            ร้านของฉัน
          </Link>
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">กำลังโหลดสินค้า…</p> : null}
      {!loading && products.length > 0 ? (
        <p className="text-xs text-slate-500">พบ {total} รายการ</p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <Link
              href={`/shop/${p.id}`}
              className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-5xl text-slate-500"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>🛒</span>
              )}
            </Link>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              <Link href={`/shop/${p.id}`} className="hover:text-brand-800 hover:underline">
                {p.title}
              </Link>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{p.shopName}</p>
            <p className="mt-1 text-lg font-medium text-slate-800">
              ฿{Number(p.priceThb).toLocaleString("th-TH")}
            </p>
            <p className="text-xs text-slate-500">เหลือ {p.stockQty} ชิ้น</p>
            {p.heartsBonus > 0 ? (
              <p className="mt-1 text-xs text-rose-600">แถมหัวใจ {p.heartsBonus}/ชิ้น</p>
            ) : null}
            <button
              type="button"
              disabled={(p.stockQty ?? 0) < 1}
              onClick={() => putInCart(p)}
              className="mt-4 w-full rounded-xl bg-brand-800 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {(p.stockQty ?? 0) < 1 ? "หมด" : "ใส่ตะกร้า"}
            </button>
            {cartHint === p.id ? (
              <p className="mt-2 text-center text-xs text-blue-700">ใส่ตะกร้าแล้ว</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
