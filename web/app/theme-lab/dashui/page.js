export const metadata = {
  title: "Theme Lab — DashUI (Next.js) | HUAJAIY",
  description: "ดูเทมเพลต DashUI สำหรับพิจารณาเป็นหลังบ้านแอดมิน/ยูสเซอร์"
};

export default function ThemeLabDashuiPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100">
      <iframe
        title="DashUI admin template"
        src="/dashui-template/index.html"
        className="h-full w-full border-0"
      />
    </main>
  );
}
