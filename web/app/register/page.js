import { redirect } from "next/navigation";
import RegisterForm from "../../components/RegisterForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "สมัครสมาชิก | HUAJAIY",
  description:
    "สมัครสมาชิก — 1 คนต่อ 1 บัญชี กรอกข้อมูลตามบัตรประชาชน เบอร์โทร ชื่อผู้ใช้ รหัสผ่าน"
};

/** ปิดสมัครแบบฟอร์มโดยค่าเริ่มต้น — เปิดกลับด้วย ALLOW_PUBLIC_REGISTER=1 บนเว็บ + API */
export default function RegisterPage() {
  if (process.env.ALLOW_PUBLIC_REGISTER !== "1") {
    redirect("/login/line");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <RegisterForm />
      </main>
      <SiteFooter />
    </>
  );
}
