export const metadata = {
  title: "Theme Lab — TailAdmin (Vue) | HUAJAIY",
  description: "ดูเทมเพลต TailAdmin Vue สำหรับพิจารณาเป็นหลังบ้านแอดมิน/ยูสเซอร์"
};

export default function ThemeLabTailadminPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100">
      <iframe
        title="TailAdmin Vue admin template"
        src="/tailadmin-template/"
        className="h-full w-full border-0"
      />
    </main>
  );
}
