import Link from "next/link";
import FlipGameDemo from "../../components/FlipGameDemo";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "เกมเปิดป้าย | HUAJAIY",
  description: "เกมสะสมภาพ — ตัวอย่างฝั่งเบราว์เซอร์"
};

export default function GamePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">เกมเปิดป้าย (สาธิต)</h1>
        <p className="mt-2 text-sm text-slate-600">
          โหมดสะสมครบก่อนชนะ — ต่อด้วยหักหัวใจต่อรอบ + API แบบสุ่มฝั่งเซิร์ฟเวอร์ภายหลัง
        </p>
        <FlipGameDemo />
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-blue-600 underline hover:text-blue-800">
            ← หน้าแรก
          </Link>
          <Link href="/shop" className="text-blue-600 underline hover:text-blue-800">
            ร้านค้า
          </Link>
          <Link href="/cart" className="text-blue-600 underline hover:text-blue-800">
            ตะกร้า
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
