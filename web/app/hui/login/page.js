import LoginForm from "../../../components/LoginForm";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
export const metadata = {
  title: "เข้าสู่ระบบ (ยูสเซอร์/รหัส) | HUAJAIY",
  description: "เข้าสู่ระบบสมาชิกแบบเดิม — ยูสเซอร์และรหัสผ่าน"
};

export default function HuiLoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="mb-4 text-sm text-hui-muted">
          แนะนำสมาชิกเข้าด้วย LINE ที่{" "}
          <a href="/login" className="font-medium text-hui-section underline">
            /login
          </a>
          {" "}— หน้านี้ใช้ <strong className="text-hui-body">ยูสเซอร์ + รหัสผ่าน</strong> (รวมบัญชีแอดมินที่สร้างจาก API)
        </p>
        <p className="mb-4 text-xs text-hui-muted">
          <a href="/" className="font-medium text-hui-section underline">
            หน้าแรก
          </a>
          <span className="text-hui-muted"> · </span>
          <a href="/login" className="font-medium text-hui-section underline">
            เข้าสู่ระบบ (LINE)
          </a>
        </p>
        <LoginForm />
      </main>
      <SiteFooter />
    </>
  );
}
