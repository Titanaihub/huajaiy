import AccountProfileForm from "../../components/AccountProfileForm";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "บัญชีของฉัน | HUAJAIY",
  description: "ข้อมูลส่วนตัว คำขอเปลี่ยนชื่อ–นามสกุล"
};

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">บัญชีของฉัน</h1>
        <div className="mt-6">
          <AccountProfileForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
