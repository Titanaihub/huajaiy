import { headers } from "next/headers";
import AccountBackOfficeShell from "../../components/AccountBackOfficeShell";
import AccountHeartHistoryPageShell from "../../components/AccountHeartHistoryPageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { normalizePathnameForTheme } from "../../lib/pathnameNormalize";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "หลังบ้านสมาชิก | HUAJAIY",
  description: "ภาพรวมบัญชี หัวใจ เกม และข้อมูลส่วนตัว"
};

export default async function AccountLayout({ children }) {
  let pathname = "/";
  let minimalShell = false;
  try {
    const h = await headers();
    pathname = normalizePathnameForTheme(h.get("x-huajaiy-pathname") || "/");
    minimalShell = h.get("x-huajaiy-account-minimal-shell") === "1";
  } catch {
    pathname = "/";
  }
  /** ประวัติหัวใจ = เชลล์ใหม่ + พื้นรากเรียบ (ดู siteThemeStyle / root layout) */
  if (
    pathname === "/account/heart-history" ||
    pathname.startsWith("/account/heart-history/")
  ) {
    return <AccountHeartHistoryPageShell>{children}</AccountHeartHistoryPageShell>;
  }

  /** โปรไฟล์ = TailAdmin เต็มจอ — ไม่ครอบด้วยหัวเว็บ/ฟุตเตอร์/ชั้นกล่องเดิม */
  if (pathname === "/account/profile" || minimalShell) {
    return <>{children}</>;
  }

  /** ถอนเงินรางวัล = เทมเพลตกลาง HuajaiyCentralTemplate (เดียวกับ /central-template) — ไม่ใช้ SiteHeader/AccountBackOfficeShell เดิม */
  if (
    pathname === "/account/prize-withdraw" ||
    pathname.startsWith("/account/prize-withdraw/")
  ) {
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
