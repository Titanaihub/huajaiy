import Link from "next/link";
import { notFound } from "next/navigation";
import ProductDetailActions from "../../../components/ProductDetailActions";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { mockProducts } from "../../../lib/mockProducts";

export function generateStaticParams() {
  return mockProducts.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }) {
  const p = mockProducts.find((x) => x.id === params.id);
  return {
    title: p ? `${p.name} | HUAJAIY` : "สินค้า | HUAJAIY",
    description: p ? `รายละเอียด ${p.name} — ตัวอย่าง` : "ร้านค้า"
  };
}

export default function ProductDetailPage({ params }) {
  const p = mockProducts.find((x) => x.id === params.id);
  if (!p) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs text-slate-500">
          <Link href="/shop" className="text-blue-600 underline hover:text-blue-800">
            ร้านค้า
          </Link>
          <span className="mx-1 text-slate-400">/</span>
          <span className="text-slate-700">{p.name}</span>
        </p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded-2xl bg-slate-100 text-7xl text-slate-600">
            {p.emoji ?? "🛒"}
          </div>
          <div className="min-w-0 flex-1">
            {p.badge ? (
              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {p.badge}
              </span>
            ) : null}
            <h1 className="mt-2 text-xl font-semibold text-slate-900">{p.name}</h1>
            <p className="mt-2 text-2xl font-medium text-slate-800">
              ฿{p.price.toLocaleString("th-TH")}
            </p>
            <p className="mt-2 text-sm text-rose-700">
              แถมหัวใจร้าน {p.hearts} ดวงต่อชิ้น (ตัวอย่าง)
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              หน้ารายละเอียดสินค้าตัวอย่าง — รายละเอียดเต็ม รูปจริง และการชำระเงินจะต่อในขั้นถัดไป
            </p>
            <ProductDetailActions product={p} />
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/shop" className="text-blue-600 underline hover:text-blue-800">
            ← กลับร้านค้า
          </Link>
          <Link href="/cart" className="text-blue-600 underline hover:text-blue-800">
            ไปตะกร้า
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
