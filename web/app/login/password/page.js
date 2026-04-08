import Link from "next/link";
import LoginForm from "../../../components/LoginForm";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";

export const metadata = {
  title: "เข้าด้วยรหัสผ่าน / รหัสสมาชิก | HUAJAIY",
  description: "ผู้ดูแลระบบหรือสมาชิกรหัส 6 หลัก — แนะนำให้ใช้ LINE"
};

/** เข้าลึก — ไม่โฆษณาบนหน้าเข้าสู่ระบบหลัก */
export default function LoginPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900">เข้าสู่ระบบแบบอื่น</h1>
        <p className="mt-2 text-sm text-gray-600">
          สำหรับผู้ดูแลระบบหรือสมาชิกที่มีรหัส 6 หลัก — ผู้ใช้ทั่วไปแนะนำให้ใช้ LINE
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-sm text-gray-600">
          <Link
            href="/login/line"
            className="font-semibold text-[#06C755] underline decoration-[#06C755]/40 underline-offset-2 hover:brightness-95"
          >
            เข้าสู่ระบบด้วย LINE
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
