import Link from "next/link";
import ContactForm from "../../components/ContactForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "ติดต่อ | HUAJAIY",
  description: "ส่งข้อความถึงทีม HUAJAIY"
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">ติดต่อ</h1>
        <p className="mt-2 text-sm text-slate-600">
          ส่งคำถามหรือข้อความมาที่นี่ — ระบบรับผ่านเว็บไซต์นี้โดยตรง และบันทึกใน log
          ของเซิร์ฟเวอร์ (เช่น ดูใน Render Dashboard → Logs) จนกว่าจะต่ออีเมลหรือ
          LINE Notify ภายหลัง
        </p>
        <ContactForm />
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
