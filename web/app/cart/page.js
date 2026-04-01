import Link from "next/link";
import CartContents from "../../components/CartContents";
import { siteNavLinkClass } from "../../lib/siteNavLinkClass";
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
        <h1 className="hui-h2">ตะกร้า</h1>
        <p className="mt-2 text-base text-hui-body">
          ยืนยันออเดอร์จะบันทึกที่บัญชี ตัดสต็อก และสถานะ「รอชำระเงิน» ·{" "}
          <Link
            href="/account/orders"
            className="font-medium text-hui-cta underline decoration-hui-cta/40"
          >
            ออเดอร์ของฉัน
          </Link>
        </p>
        <div className="mt-6">
          <CartContents />
        </div>
        <Link href="/shop" className={`${siteNavLinkClass} mt-8 inline-flex`}>
          ← กลับร้านค้า
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
