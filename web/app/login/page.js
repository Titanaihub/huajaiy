import LoginForm from "../../components/LoginForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { safeRedirectPath } from "../../lib/safeRedirectPath";

export const metadata = {
  title: "เข้าสู่ระบบ | HUAJAIY",
  description: "เข้าสู่ระบบสมาชิก HUAJAIY"
};

export default function LoginPage({ searchParams }) {
  const redirectAfterLogin = safeRedirectPath(searchParams?.next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        <LoginForm redirectAfterLogin={redirectAfterLogin} />
      </main>
      <SiteFooter />
    </>
  );
}
