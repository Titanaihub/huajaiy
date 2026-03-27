import Link from "next/link";
import ProductGrid from "../../components/ProductGrid";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "ร้านค้า | HUAJAIY",
  description: "ร้านค้าและสินค้า — ตัวอย่าง"
};

export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">ร้านค้า</h1>
        <p className="mt-2 text-sm text-slate-600">
          ตัวอย่างสินค้าและการแถมหัวใจ — ต่อ API / ตะกร้า / ชำระเงินในขั้นถัดไป
        </p>
        <ProductGrid />
        <p className="mt-6 text-xs text-slate-500">
          โค้ดแจกแต้มจากกล่องพัสดุ / ยืนยันออเดอร์ → แจกหัวใจ — ออกแบบใน API ภายหลัง
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
