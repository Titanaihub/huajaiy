import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

/** สเกเลตันเดียวกับโครงเพจชุมชน — ไม่แสดงเทมเพลตร้านค้าเดิม */
export default function CommunityPageLoading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8" aria-busy="true">
        <div className="animate-pulse">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="h-9 w-48 rounded-lg bg-hui-border/35" />
              <div className="h-4 w-72 max-w-full rounded bg-hui-border/25" />
            </div>
            <div className="h-10 w-28 rounded-lg bg-hui-border/40" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="overflow-hidden rounded-2xl border border-hui-border/50 bg-hui-surface/50"
              >
                <div className="aspect-[16/10] bg-hui-border/25" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-2/3 rounded bg-hui-border/30" />
                  <div className="h-4 w-full rounded bg-hui-border/35" />
                  <div className="h-3 w-full rounded bg-hui-border/20" />
                  <div className="h-3 w-5/6 rounded bg-hui-border/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-8 text-sm text-hui-muted">กำลังโหลดเพจชุมชน…</p>
      </main>
      <SiteFooter />
    </>
  );
}
