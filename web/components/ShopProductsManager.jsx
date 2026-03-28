"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  apiCreateShopProduct,
  apiDeleteShopProduct,
  apiListShopProducts,
  apiPatchShopProduct
} from "../lib/shopOwnerApi";
import { getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ShopProductsManager({ shopId }) {
  const router = useRouter();
  const { user, loading } = useMemberAuth();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    priceThb: 0,
    stockQty: 0,
    category: "",
    imageUrl: "",
    heartsBonus: 0
  });

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const data = await apiListShopProducts(token, shopId);
      setShop(data.shop);
      setProducts(data.products || []);
    } catch (e) {
      setErr(e.message || String(e));
      setShop(null);
      setProducts([]);
    } finally {
      setBusy(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=/account/shops/${shopId}/products`);
    }
  }, [loading, user, router, shopId]);

  useEffect(() => {
    if (!user || !UUID_RE.test(shopId)) return;
    load();
  }, [user, shopId, load]);

  async function createProduct(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setErr("");
    try {
      await apiCreateShopProduct(token, shopId, {
        title: draft.title,
        description: draft.description,
        priceThb: draft.priceThb,
        stockQty: draft.stockQty,
        category: draft.category,
        imageUrl: draft.imageUrl || null,
        heartsBonus: draft.heartsBonus
      });
      setDraft({
        title: "",
        description: "",
        priceThb: 0,
        stockQty: 0,
        category: "",
        imageUrl: "",
        heartsBonus: 0
      });
      await load();
    } catch (e2) {
      setErr(e2.message || String(e2));
    }
  }

  async function toggleActive(p) {
    const token = getMemberToken();
    if (!token) return;
    setErr("");
    try {
      await apiPatchShopProduct(token, shopId, p.id, { active: !p.active });
      await load();
    } catch (e2) {
      setErr(e2.message || String(e2));
    }
  }

  async function removeProduct(p) {
    if (!window.confirm(`ลบ (ปิดการขาย)「${p.title}」?`)) return;
    const token = getMemberToken();
    if (!token) return;
    setErr("");
    try {
      await apiDeleteShopProduct(token, shopId, p.id);
      await load();
    } catch (e2) {
      setErr(e2.message || String(e2));
    }
  }

  if (!UUID_RE.test(shopId)) {
    return <p className="text-sm text-red-600">รหัสร้านไม่ถูกต้อง</p>;
  }

  if (loading || !user) {
    return <p className="text-sm text-slate-600">กำลังโหลด…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">จัดการสินค้า</h2>
          {shop ? (
            <p className="text-sm text-slate-600">
              ร้าน <strong>{shop.name}</strong>{" "}
              <span className="font-mono text-xs text-slate-500">{shop.slug}</span>
            </p>
          ) : null}
        </div>
        <Link href="/account/shops" className="text-sm text-brand-800 underline">
          ← ร้านของฉัน
        </Link>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <form
        onSubmit={createProduct}
        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-slate-800">เพิ่มสินค้า</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-600">ชื่อ</label>
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-600">รายละเอียด</label>
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">ราคา (บาท)</label>
            <input
              type="number"
              min={0}
              value={draft.priceThb}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priceThb: Math.max(0, parseInt(e.target.value, 10) || 0)
                }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">สต็อก</label>
            <input
              type="number"
              min={0}
              value={draft.stockQty}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  stockQty: Math.max(0, parseInt(e.target.value, 10) || 0)
                }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">หมวด (ไม่บังคับ)</label>
            <input
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">URL รูป (ไม่บังคับ)</label>
            <input
              value={draft.imageUrl}
              onChange={(e) =>
                setDraft((d) => ({ ...d, imageUrl: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">แถมหัวใจชมพู/ชิ้น</label>
            <input
              type="number"
              min={0}
              value={draft.heartsBonus}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  heartsBonus: Math.max(0, parseInt(e.target.value, 10) || 0)
                }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
        >
          เพิ่มสินค้า
        </button>
      </form>

      {busy ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายการ…</p>
      ) : (
        <ul className="space-y-3">
          {products.length === 0 ? (
            <li className="text-sm text-slate-500">ยังไม่มีสินค้า</li>
          ) : null}
          {products.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {p.title}{" "}
                  {!p.active ? (
                    <span className="text-xs font-normal text-amber-700">(ปิดขาย)</span>
                  ) : null}
                </p>
                <p className="text-sm text-slate-600">
                  ฿{Number(p.priceThb).toLocaleString("th-TH")} · เหลือ {p.stockQty} ·{" "}
                  {p.category || "ไม่มีหมวด"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50"
                >
                  {p.active ? "ปิดการขาย" : "เปิดการขาย"}
                </button>
                <button
                  type="button"
                  onClick={() => removeProduct(p)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800"
                >
                  ลบ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
