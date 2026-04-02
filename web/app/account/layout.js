import AccountBackOfficeShell from "../../components/AccountBackOfficeShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { normalizePathnameForTheme } from "../../lib/pathnameNormalize";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "หลังบ้านสมาชิก | HUAJAIY",
  description: "ภาพรวมบัญชี หัวใจ เกม และข้อมูลส่วนตัว"
};

export default async function AccountLayout({ children }) {
  const h = await headers();
  const pathname = normalizePathnameForTheme(h.get("x-huajaiy-pathname") || "/");
  /** โปรไฟล์ = TailAdmin เต็มจอ — ไม่ครอบด้วยหัวเว็บ/ฟุตเตอร์/ชั้นกล่องเดิม */
  if (pathname === "/account/profile") {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <AccountBackOfficeShell>{children}</AccountBackOfficeShell>
      <SiteFooter />
    </>
  );
}
