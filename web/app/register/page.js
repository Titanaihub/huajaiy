import RegisterForm from "../../components/RegisterForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "สมัครสมาชิก | HUAJAIY",
  description: "สมัครสมาชิก — ชื่อนามสกุลภาษาไทย เบอร์โทร ชื่อผู้ใช้ รหัสผ่าน"
};

export default function RegisterPage() {
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
