export const metadata = {
  title: "Theme Lab Purdue | HUAJAIY",
  description: "ดูเทมเพลต Purdue Education ต้นฉบับแบบเต็มหน้า"
};

export default function ThemeLabPurduePage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-white">
      <iframe
        title="Purdue education template original"
        src="/purdue-template/index.html"
        className="h-full w-full border-0"
      />
    </main>
  );
}
