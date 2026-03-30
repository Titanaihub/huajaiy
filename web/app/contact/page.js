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
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
      กำลังโหลดฟอร์ม…
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">ติดต่อ</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          ส่งคำถามหรือข้อความมาที่นี่ — ระบบรับผ่านเว็บไซต์นี้โดยตรง และบันทึกใน log
          ของเซิร์ฟเวอร์ (เช่น ดูใน Render Dashboard → Logs) จนกว่าจะต่ออีเมลหรือ
          LINE Notify ภายหลัง
        </p>
        <p className="mt-2 text-xs text-slate-500">
          หากมาจาก「ถอนเงินรางวัล」ลิงก์จะเติมหัวข้อและร่างข้อความให้อัตโนมัติ — ตรวจสอบก่อนส่ง
        </p>
        <Suspense fallback={<ContactFormFallback />}>
          <ContactForm />
        </Suspense>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-blue-600 underline hover:text-blue-800"
        >
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
