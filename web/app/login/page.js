import LoginForm from "../../components/LoginForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "เข้าสู่ระบบ | HUAJAIY",
  description: "เข้าสู่ระบบสมาชิก HUAJAIY"
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <LoginForm />
      </main>
      <SiteFooter />
    </>
  );
}
