export const metadata = {
  title: "เข้าสู่ระบบ | HUAJAIY",
  description: "เข้าสู่ระบบ — แนะนำ LINE (เทมเพลต Organic)"
};

export default function LoginPage({ searchParams }) {
  const expand = searchParams?.expand;
  const src =
    expand != null && String(expand).length > 0
      ? `/organic-template/huajaiy-login.html?expand=${encodeURIComponent(String(expand))}`
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
