import PublicOrganicShell from "../../components/PublicOrganicShell";

/** สเกเลตันโครงเดียวกับหน้า /game — เชลล์หัว/ท้าย + การ์ด */
export default function CommunityPageLoading() {
  return (
    <PublicOrganicShell>
      <main className="mx-auto max-w-5xl px-4 py-8" aria-busy="true">
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-black/[0.08]" />
          <div className="mt-3 h-4 max-w-md rounded bg-black/[0.06]" />
        </div>
        <div className="mb-6 space-y-3 animate-pulse">
          <div className="h-4 w-56 rounded bg-black/[0.07]" />
          <div className="h-12 w-full rounded-2xl bg-black/[0.06]" />
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2].map((k) => (
            <li key={k} className="animate-pulse overflow-hidden rounded-2xl border border-black/[0.08] bg-white/90 shadow-sm">
              <div className="aspect-video bg-black/[0.06]" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-black/[0.08]" />
                <div className="h-3 w-1/2 rounded bg-black/[0.06]" />
                <div className="h-3 w-full rounded bg-black/[0.05]" />
                <div className="h-3 w-5/6 rounded bg-black/[0.05]" />
                <div className="mt-4 border-t border-black/[0.06] pt-3">
                  <div className="mx-auto h-4 w-28 rounded bg-black/[0.07]" />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-sm text-slate-500">กำลังโหลดเพจชุมชน…</p>
      </main>
    </PublicOrganicShell>
  );
}
