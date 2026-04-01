import Providers from "../../providers";

export const metadata = {
  title: "เข้าสู่ระบบด้วย LINE | HUAJAIY",
  description: "ล็อกอินสมาชิก HUAJAIY ผ่านบัญชี LINE (LINE Login)"
};

export default function LineLoginLayout({ children }) {
  return <Providers>{children}</Providers>;
}
