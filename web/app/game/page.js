import Link from "next/link";
import FlipGameDemo from "../../components/FlipGameDemo";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { fetchPublicCentralGameMeta } from "../../lib/publicGameMeta";

export async function generateMetadata() {
  const m = await fetchPublicCentralGameMeta();
  if (m) {
    return {
      title: `${m.title} | HUAJAIY`,
      description: `เล่น ${m.title} — เกมเปิดป้ายบนเว็บ`
    };
  }
  return {
    title: "เกมเปิดป้าย | HUAJAIY",
    description: "เกมสะสมภาพ — ตัวอย่างฝั่งเบราว์เซอร์"
  };
}

export default async function GamePage() {
  const centralMeta = await fetchPublicCentralGameMeta();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">
          {centralMeta ? centralMeta.title : "เกมเปิดป้าย (สาธิต)"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {centralMeta
            ? "เกมส่วนกลางที่เผยแพร่แล้ว — เปิดป้ายตามกติกา ลุ้นรางวัล"
            : "โหมดสะสมครบก่อนชนะ — ต่อด้วยหักหัวใจต่อรอบ + API แบบสุ่มฝั่งเซิร์ฟเวอร์ภายหลัง"}
        </p>
        <FlipGameDemo serverCentralPublished={Boolean(centralMeta)} />
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
