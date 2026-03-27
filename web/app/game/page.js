import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "เกมเปิดป้าย | HUAJAIY",
  description: "เกมสะสมภาพ — กำลังพัฒนา"
};

export default function GamePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">เกมเปิดป้าย</h1>
        <p className="mt-2 text-sm text-slate-600">
          โครงหน้าเตรียมไว้ — จะเชื่อมกติกา 2 โหมด (เปิดเจอได้ทันที / สะสมครบก่อน) กับ API
          ในขั้นถัดไป
        </p>
        <ul className="mt-4 list-inside list-disc text-sm text-slate-700">
          <li>กระดานป้าย / รอบการเล่น</li>
          <li>รางวัลสิ่งของ / เงินสด + การอนุมัติ</li>
          <li>ห้องแจกแต้ม (เจ้าของห้องกำหนดแต้มต่อคน)</li>
        </ul>
        <Link href="/" className="mt-6 inline-block text-sm text-blue-600 underline">
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
