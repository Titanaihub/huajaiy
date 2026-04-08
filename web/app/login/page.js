export const metadata = {
  title: "เข้าสู่ระบบ | HUAJAIY",
  description: "เข้าสู่ระบบด้วย LINE — สมัครสมาชิกผ่าน LINE เท่านั้น"
};

export default function LoginPage({ searchParams }) {
  const expand = searchParams?.expand;
  const admin = searchParams?.admin;
  const params = new URLSearchParams();
  if (expand != null && String(expand).length > 0) {
    params.set("expand", String(expand));
  }
  if (admin === "1" || admin === "true") {
    params.set("admin", "1");
  }
  const q = params.toString();
  const src = q
    ? `/organic-template/huajaiy-login.html?${q}`
    : "/organic-template/huajaiy-login.html";

  return (
    <main className="h-dvh min-h-0 w-full overflow-hidden bg-slate-100">
      <iframe
        title="เข้าสู่ระบบ HUAJAIY"
        src={src}
        className="h-full w-full border-0"
      />
    </main>
  );
}
