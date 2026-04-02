import SiteHeader from "../components/SiteHeader";

export const metadata = {
  title: "หน้าแรก | HUAJAIY",
  description: "HUAJAIY — หน้าแรก"
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-0 w-full flex-1 overflow-hidden bg-white">
        <iframe
          title="หน้าแรก — Organic template"
          src="/organic-template/index.html"
          className="h-full min-h-[50dvh] w-full border-0"
        />
      </main>
    </>
  );
}
