import Link from "next/link";
import { siteNavLinkClass } from "../../lib/siteNavLinkClass";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { CENTRAL_GAME_ADMIN_LINE_URL } from "../../lib/centralGameLimits";

export const metadata = {
  title: "ติดต่อ | HUAJAIY",
  description: "ติดต่อทีมงานผ่าน LINE แอดมิน"
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="hui-h2">ติดต่อ</h1>
        <p className="mt-2 text-base leading-relaxed text-hui-body">
          กรุณาติดต่อผ่าน LINE แอดมิน เพื่อให้ตอบกลับได้รวดเร็วและตามงานได้ต่อเนื่อง
        </p>
        <a
          href={CENTRAL_GAME_ADMIN_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hui-btn-primary mt-5 inline-flex"
        >
          เปิด LINE แอดมิน
        </a>
        <Link href="/" className={`${siteNavLinkClass} mt-8 inline-flex`}>
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
