import Link from "next/link";
import ProductGrid from "../../components/ProductGrid";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "ร้านค้า | HUAJAIY",
  description: "มาร์เก็ตเพลส — หลายร้าน ค้นหาและกรอง"
};

export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">ร้านค้า</h1>
        <p className="mt-2 text-sm text-slate-600">
          สินค้าจากหลายร้าน — ค้นหา เลือกหมวดหรือร้าน ใส่ตะกร้าแล้วยืนยันออเดอร์ (ต้องล็อกอิน) · สถานะรอชำระเงิน
        </p>
        <ProductGrid />
        <p className="mt-6 text-xs text-slate-500">
          แอดมินสร้างร้านได้ที่{" "}
          <Link href="/admin?tab=shops" className="text-brand-800 underline">
            /admin?tab=shops
          </Link>
          · เจ้าของลงสินค้าที่บัญชี → ร้านของฉัน
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-600 underline">
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
