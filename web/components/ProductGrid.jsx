import { mockProducts } from "../lib/mockProducts";

export default function ProductGrid() {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {mockProducts.map((p) => (
        <li
          key={p.id}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex h-28 items-center justify-center rounded-xl bg-slate-100 text-4xl text-slate-400">
            🛒
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">{p.name}</h2>
          <p className="mt-1 text-lg font-medium text-slate-800">
            ฿{p.price.toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-xs text-rose-600">แถมหัวใจร้าน {p.hearts} ดวง (ตัวอย่าง)</p>
          {p.badge ? (
            <span className="mt-2 inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {p.badge}
            </span>
          ) : null}
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-400"
            title="รอเชื่อมตะกร้า/ชำระเงิน"
          >
            ใส่ตะกร้า (เร็วๆ นี้)
          </button>
        </li>
      ))}
    </ul>
  );
}
