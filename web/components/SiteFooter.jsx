import BrandLogo from "./BrandLogo";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rose-900/80 bg-rose-950">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-start justify-between">
          <BrandLogo variant="footer" />
        </div>
        <p className="mt-10 border-t border-rose-900/60 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} HUAJAIY — สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}
