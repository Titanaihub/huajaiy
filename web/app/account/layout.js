import AccountBackOfficeShell from "../../components/AccountBackOfficeShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "หลังบ้านสมาชิก | HUAJAIY",
  description: "ภาพรวมบัญชี หัวใจ เกม และข้อมูลส่วนตัว"
};

export default function AccountLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <AccountBackOfficeShell>{children}</AccountBackOfficeShell>
      <SiteFooter />
    </>
  );
}
