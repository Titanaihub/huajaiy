import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "ร้านค้า | HUAJAIY",
  description: "ร้านค้าและสินค้า — กำลังพัฒนา"
};

export default function ShopPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">ร้านค้า</h1>
        <p className="mt-2 text-sm text-slate-600">
          โครงหน้าเตรียมไว้ — จะเชื่อมสินค้า ราคา แต้ม/หัวใจ และออเดอร์ในขั้นถัดไป
        </p>
        <ul className="mt-4 list-inside list-disc text-sm text-slate-700">
          <li>รายการสินค้า / ตะกร้า</li>
          <li>ยืนยันออเดอร์ → แจกหัวใจ/แต้ม</li>
          <li>โค้ดแจกแต้ม (ขายนอกเว็บ)</li>
        </ul>
        <Link href="/" className="mt-6 inline-block text-sm text-blue-600 underline">
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
