"use client";

import { useEffect, useState } from "react";
import { getOrders, subscribeOrders } from "../lib/orderHistory";

function formatThaiDate(ts) {
  try {
    return new Date(ts).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "";
  }
}

export default function OrdersList() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(getOrders());
    return subscribeOrders(() => setOrders(getOrders()));
  }, []);

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        ยังไม่มีออเดอร์สาธิต — ไปที่ตะกร้าแล้วยืนยันออเดอร์เพื่อบันทึกในประวัติ
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li
          key={o.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
            <span className="font-mono text-xs text-slate-500">{o.id}</span>
            <time className="text-xs text-slate-500" dateTime={new Date(o.at).toISOString()}>
              {formatThaiDate(o.at)}
            </time>
          </div>
          <ul className="mt-3 space-y-1 text-slate-700">
            {(o.items || []).map((it, i) => (
              <li key={i}>
                {it.name} × {it.qty}{" "}
                <span className="text-slate-500">
                  (฿{it.lineSubtotal?.toLocaleString("th-TH") ?? "—"})
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 text-slate-800">
            <span>ยอดรวม</span>
            <span className="font-semibold">
              ฿{Number(o.totalPrice).toLocaleString("th-TH")}
            </span>
          </div>
          <p className="mt-1 text-right text-rose-800">
            แถมหัวใจ ♥ {Number(o.hearts).toLocaleString("th-TH")}
          </p>
        </li>
      ))}
    </ul>
  );
}
