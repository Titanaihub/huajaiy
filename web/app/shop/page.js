import Link from "next/link";
import ProductGrid from "../../components/ProductGrid";
import { siteNavLinkClass } from "../../lib/siteNavLinkClass";
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
        <h1 className="hui-h2">ร้านค้า</h1>
        <p className="mt-2 text-base text-hui-body">
          สินค้าจากหลายร้าน — ค้นหา เลือกหมวดหรือร้าน ใส่ตะกร้าแล้วยืนยันออเดอร์ (ต้องล็อกอิน) · สถานะรอชำระเงิน
        </p>
        <aside className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
          <p className="font-semibold text-emerald-900">ต้องการขายสินค้า?</p>
          <p className="mt-1 text-emerald-900/90">
            เจ้าของร้านลงสินค้าได้ที่{" "}
            <Link
              href="/account/shops"
              className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              บัญชี → ร้านของฉัน → จัดการสินค้า
            </Link>
            · แอดมินสร้างร้านและผูกบัญชีคุณที่{" "}
            <Link
              href="/admin?tab=shops"
              className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              แอดมิน → ร้านทั้งหมด
            </Link>
            · สรุปขั้นตอน:{" "}
            <Link href="/owner" className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
              หน้าขายสินค้า (เจ้าของร้าน)
            </Link>
          </p>
        </aside>
        <ProductGrid />
        <p className="hui-note mt-6">
          แอดมินสร้างร้านได้ที่{" "}
          <Link href="/admin?tab=shops" className="text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
            /admin?tab=shops
          </Link>
          · เจ้าของลงสินค้าที่บัญชี → ร้านของฉัน
        </p>
        <Link href="/" className={`${siteNavLinkClass} mt-4 inline-flex`}>
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
