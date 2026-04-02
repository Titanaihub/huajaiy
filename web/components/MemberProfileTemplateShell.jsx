import Link from "next/link";

/**
 * เทมเพลตโปรไฟล์แบบ TailAdmin-style — ยังไม่ดึงข้อมูลจาก API
 * พัฒนาต่อทีละส่วน (การ์ด / แถบข้าง / ฟิลด์จริง)
 */
export default function MemberProfileTemplateShell() {
  return (
    <div className="flex min-h-[72vh] flex-col overflow-hidden rounded-2xl border border-hui-border bg-white shadow-soft md:flex-row">
      <aside className="w-full shrink-0 border-b border-hui-border bg-white md:w-56 md:border-b-0 md:border-r lg:w-64">
        <div className="flex items-center gap-2 border-b border-hui-border px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">
            H
          </span>
          <div>
            <p className="text-sm font-semibold text-hui-section">HUAJAIY</p>
            <p className="text-xs text-hui-muted">สมาชิก</p>
          </div>
        </div>
        <nav className="space-y-0.5 p-3 text-sm" aria-label="เมนูหลังบ้าน">
          <Link
            href="/account"
            className="block rounded-lg px-3 py-2.5 text-hui-body transition hover:bg-hui-pageTop"
          >
            แดชบอร์ด
          </Link>
          <span
            className="block rounded-lg bg-sky-50 px-3 py-2.5 font-medium text-sky-900"
            aria-current="page"
          >
            โปรไฟล์
          </span>
          <span className="block rounded-lg px-3 py-2.5 text-hui-muted">ร้านค้า (เร็วๆ นี้)</span>
          <span className="block rounded-lg px-3 py-2.5 text-hui-muted">เกมของฉัน (เร็วๆ นี้)</span>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 bg-slate-50/90">
        <header className="flex flex-col gap-3 border-b border-hui-border bg-white/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <nav className="text-xs text-hui-muted">
              <Link href="/" className="hover:text-hui-section">
                หน้าแรก
              </Link>
              <span className="mx-1.5 text-hui-border">/</span>
              <span className="text-hui-section">โปรไฟล์สมาชิก</span>
            </nav>
            <h1 className="hui-h2 mt-1 font-bold tracking-tight text-hui-section sm:text-2xl">
              โปรไฟล์สมาชิก
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-9 max-w-xs flex-1 items-center rounded-xl border border-hui-border bg-hui-pageTop px-3 text-sm text-hui-muted sm:flex">
              ค้นหา…
            </div>
            <button
              type="button"
              className="rounded-xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-section shadow-sm transition hover:bg-hui-pageTop"
            >
              แก้ไขโปรไฟล์
            </button>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <p className="text-sm text-hui-muted">
            โครงหน้านี้อ้างอิงแทมเพลตแดชบอร์ด — ยังไม่เชื่อมข้อมูลจากระบบเดิม จะต่อ API / ฟอร์มในขั้นถัดไป
          </p>

          {/* Card 1 — สรุปโปรไฟล์ */}
          <section className="rounded-2xl border border-hui-border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-hui-border bg-hui-pageTop text-sm font-medium text-hui-muted"
                  aria-hidden
                >
                  รูป
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-lg font-semibold text-hui-section">ชื่อสมาชิก</p>
                  <p className="mt-1 text-sm text-hui-muted">ตำแหน่ง / ที่อยู่สั้นๆ — ใส่ภายหลัง</p>
                  <div className="mt-3 flex justify-center gap-3 text-hui-muted sm:justify-start">
                    <span className="text-xs font-medium">FB</span>
                    <span className="text-xs font-medium">X</span>
                    <span className="text-xs font-medium">IN</span>
                    <span className="text-xs font-medium">IG</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="self-start rounded-lg border border-hui-border p-2 text-hui-muted hover:bg-hui-pageTop"
                aria-label="แก้ไข"
              >
                ✎
              </button>
            </div>
          </section>

          {/* Card 2 — ข้อมูลส่วนบุคคล */}
          <section className="rounded-2xl border border-hui-border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-hui-section">ข้อมูลส่วนบุคคล</h2>
              <button
                type="button"
                className="rounded-lg border border-hui-border px-3 py-1.5 text-sm font-medium text-hui-section hover:bg-hui-pageTop"
              >
                แก้ไข
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="ชื่อจริง" value="—" />
              <Field label="นามสกุล" value="—" />
              <Field label="อีเมล" value="—" />
              <Field label="โทรศัพท์" value="—" />
              <Field label="เกี่ยวกับฉัน" value="ข้อความแนะนำตัวจะอยู่ตรงนี้" className="sm:col-span-2" />
            </div>
          </section>

          {/* Card 3 — ที่อยู่ */}
          <section className="rounded-2xl border border-hui-border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-hui-section">ที่อยู่จัดส่ง</h2>
              <button
                type="button"
                className="rounded-lg border border-hui-border px-3 py-1.5 text-sm font-medium text-hui-section hover:bg-hui-pageTop"
              >
                แก้ไข
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="ประเทศ" value="—" />
              <Field label="จังหวัด / เขต" value="—" />
              <Field label="รหัสไปรษณีย์" value="—" />
              <Field label="เลขประจำตัวผู้เสียภาษี (ถ้ามี)" value="—" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-hui-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-hui-section">{value}</p>
    </div>
  );
}
