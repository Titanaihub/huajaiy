import Link from "next/link";
import CartContents from "../../components/CartContents";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "ตะกร้า | HUAJAIY",
  description: "ตะกร้าและยืนยันออเดอร์มาร์เก็ตเพลส"
};

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">ตะกร้า</h1>
        <p className="mt-2 text-sm text-slate-600">
          ยืนยันออเดอร์จะบันทึกที่บัญชี ตัดสต็อก และสถานะ「รอชำระเงิน» ·{" "}
          <Link href="/account/orders" className="text-blue-600 underline hover:text-blue-800">
            ออเดอร์ของฉัน
          </Link>
        </p>
        <div className="mt-6">
          <CartContents />
        </div>
        <Link
          href="/shop"
          className="mt-8 inline-block text-sm text-blue-600 underline"
        >
          ← กลับร้านค้า
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
