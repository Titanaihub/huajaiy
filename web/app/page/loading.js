import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

/** สเกเลตันเทมเพลตเพจชุมชนใหม่ */
export default function CommunityPageLoading() {
  return (
    <>
      <SiteHeader />
      <main className="relative flex-1 overflow-hidden" aria-busy="true">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(42vh,320px)] bg-gradient-to-b from-rose-200/35 via-pink-100/15 to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="mb-12 animate-pulse border-b border-rose-900/10 pb-10">
            <div className="mb-3 h-3 w-32 rounded-full bg-rose-200/60" />
            <div className="h-10 max-w-md rounded-lg bg-rose-200/50" />
            <div className="mt-3 h-4 max-w-lg rounded bg-rose-100/80" />
            <div className="mt-6 h-12 w-40 rounded-full bg-rose-200/55 sm:ml-auto sm:mt-0" />
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="overflow-hidden rounded-3xl border border-white/80 bg-white/60 shadow-lg shadow-rose-900/5"
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-rose-100/80 to-pink-50/80" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/2 rounded-full bg-rose-100" />
                  <div className="h-5 w-full rounded bg-rose-200/40" />
                  <div className="h-3 w-full rounded bg-rose-100/90" />
                  <div className="h-3 w-4/5 rounded bg-rose-100/90" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-14 text-center text-sm text-rose-950/45">กำลังโหลดเพจชุมชน…</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
