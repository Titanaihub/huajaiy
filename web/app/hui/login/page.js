import LoginForm from "../../../components/LoginForm";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { safeRedirectPath } from "../../../lib/safeRedirectPath";

export const metadata = {
  title: "เข้าสู่ระบบ (ยูสเซอร์/รหัส) | HUAJAIY",
  description: "เข้าสู่ระบบสมาชิกแบบเดิม — ยูสเซอร์และรหัสผ่าน"
};

export default function HuiLoginPage({ searchParams }) {
  const redirectAfterLogin = safeRedirectPath(searchParams?.next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="mb-4 text-sm text-hui-muted">
          หน้าเข้าสู่ระบบหลักของโดเมนคือเทมเพลต Organic ที่{" "}
          <a href="/login" className="font-medium text-hui-section underline">
            /login
          </a>
        </p>
        <LoginForm redirectAfterLogin={redirectAfterLogin} />
      </main>
      <SiteFooter />
    </>
  );
}
