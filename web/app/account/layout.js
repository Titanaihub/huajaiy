import AccountBackOfficeShell from "../../components/AccountBackOfficeShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "หลังบ้านสมาชิก | HUAJAIY",
  description: "ภาพรวมบัญชี ออเดอร์ ร้าน และข้อมูลส่วนตัว"
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
