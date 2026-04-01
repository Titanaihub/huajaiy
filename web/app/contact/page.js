import Link from "next/link";
import { Suspense } from "react";
import ContactForm from "../../components/ContactForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "ติดต่อ | HUAJAIY",
  description: "ส่งข้อความถึงทีม HUAJAIY"
};

function ContactFormFallback() {
  return (
    <div className="mt-6 rounded-2xl border border-hui-border bg-hui-surface p-8 text-center text-sm text-hui-muted shadow-soft">
      กำลังโหลดฟอร์ม…
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="hui-h2">ติดต่อ</h1>
        <p className="mt-2 text-base leading-relaxed text-hui-body">
          ส่งคำถามหรือข้อความมาที่นี่ — ระบบรับผ่านเว็บไซต์นี้โดยตรง และบันทึกใน log
          ของเซิร์ฟเวอร์ (เช่น ดูใน Render Dashboard → Logs) จนกว่าจะต่ออีเมลหรือ
          LINE Notify ภายหลัง
        </p>
        <p className="hui-note mt-2">
          หากมาจาก「ถอนเงินรางวัล」ลิงก์จะเติมหัวข้อและร่างข้อความให้อัตโนมัติ — ตรวจสอบก่อนส่ง
        </p>
        <Suspense fallback={<ContactFormFallback />}>
          <ContactForm />
        </Suspense>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-hui-cta underline decoration-hui-cta/40"
        >
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
