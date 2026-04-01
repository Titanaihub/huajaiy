import Link from "next/link";
import OrdersList from "../../components/OrdersList";
import { siteNavLinkClass } from "../../lib/siteNavLinkClass";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "ประวัติออเดอร์ | HUAJAIY",
  description: "ประวัติออเดอร์ในคอมพิวเตอร์และบนเซิร์ฟเวอร์"
};

export default function OrdersPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="hui-h2">ประวัติออเดอร์</h1>
        <p className="mt-2 text-base text-hui-body">
          มีทั้งประวัติในคอมพิวเตอร์ (สาธิต) และออเดอร์บนเซิร์ฟเวอร์เมื่อล็อกอิน — สมาชิกใช้{" "}
          <Link
            href="/account/orders"
            className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
          >
            ออเดอร์ของฉัน
          </Link>{" "}
          ในหลังบ้านได้
        </p>
        <div className="mt-6">
          <OrdersList />
        </div>
        <nav
          className="mt-8 flex flex-wrap items-center gap-x-1 gap-y-2"
          aria-label="ทางลัดจากประวัติออเดอร์"
        >
          <Link href="/cart" className={siteNavLinkClass}>
            ไปตะกร้า
          </Link>
          <Link href="/shop" className={siteNavLinkClass}>
            ไปร้านค้า
          </Link>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
