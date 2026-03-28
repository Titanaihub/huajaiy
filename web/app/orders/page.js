import Link from "next/link";
import OrdersList from "../../components/OrdersList";
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
        <h1 className="text-xl font-semibold text-slate-900">ประวัติออเดอร์</h1>
        <p className="mt-2 text-sm text-slate-600">
          มีทั้งประวัติในคอมพิวเตอร์ (สาธิต) และออเดอร์บนเซิร์ฟเวอร์เมื่อล็อกอิน — สมาชิกใช้{" "}
          <Link href="/account/orders" className="font-medium text-brand-800 underline hover:text-brand-950">
            ออเดอร์ของฉัน
          </Link>{" "}
          ในหลังบ้านได้
        </p>
        <div className="mt-6">
          <OrdersList />
        </div>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/cart" className="text-blue-600 underline hover:text-blue-800">
            ไปตะกร้า
          </Link>
          <Link href="/shop" className="text-blue-600 underline hover:text-blue-800">
            ไปร้านค้า
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
