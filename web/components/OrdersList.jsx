"use client";

import { useEffect, useState } from "react";
import InlineHeart from "./InlineHeart";
import { getOrders, subscribeOrders } from "../lib/orderHistory";
import { fetchServerOrders } from "../lib/ordersApi";

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

function orderStatusLabel(o) {
  if (o.orderKind === "marketplace") {
    if (o.status === "pending_payment") return "รอชำระเงิน";
    if (o.status === "paid") return "ชำระแล้ว";
    if (o.status === "shipped") return "จัดส่งแล้ว";
    if (o.status === "delivered") return "ส่งถึงแล้ว";
    return o.status || "—";
  }
  if (o.status === "demo_completed") return "สำเร็จ (สาธิต)";
  return o.status || "—";
}

export default function OrdersList() {
  const [localOrders, setLocalOrders] = useState([]);
  const [serverOrders, setServerOrders] = useState([]);
  const [serverNote, setServerNote] = useState(null);

  useEffect(() => {
    setLocalOrders(getOrders());
    return subscribeOrders(() => setLocalOrders(getOrders()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchServerOrders();
      if (cancelled) return;
      if (res.ok && res.orders?.length) {
        setServerOrders(res.orders);
      }
      if (res.error) {
        setServerNote(res.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasLocal = localOrders.length > 0;
  const hasServer = serverOrders.length > 0;

  if (!hasLocal && !hasServer) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          ยังไม่มีออเดอร์ — ไปที่ตะกร้าแล้วยืนยันออเดอร์เพื่อบันทึกในประวัติ
        </p>
        {serverNote ? (
          <p className="text-center text-xs text-amber-700">{serverNote}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasServer ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-900">ออเดอร์ที่บันทึกในระบบ</h2>
          <p className="mt-1 text-xs text-slate-500">ยืนยันแล้วจากตะกร้าขณะล็อกอิน</p>
          <ul className="mt-3 space-y-4">
            {serverOrders.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-brand-100 pb-2">
                  <span className="font-mono text-xs text-slate-600">{o.id}</span>
                  <time
                    className="text-xs text-slate-500"
                    dateTime={new Date(o.createdAt).toISOString()}
                  >
                    {formatThaiDate(o.createdAt)}
                  </time>
                </div>
                <ul className="mt-3 space-y-1 text-slate-700">
                  {(o.items || []).map((it, i) => (
                    <li key={i}>
                      {it.name} × {it.qty}{" "}
                      <span className="text-slate-500">
                        (฿{Number(it.lineSubtotal).toLocaleString("th-TH")})
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-600">
                  สถานะ: <strong>{orderStatusLabel(o)}</strong>
                  {o.orderKind === "marketplace" ? (
                    <span className="ml-2 text-slate-500">(มาร์เก็ตเพลส)</span>
                  ) : null}
                </p>
                {o.shippingSnapshot ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white/60 p-2 text-xs text-slate-700">
                    <span className="font-semibold text-slate-800">จัดส่ง: </span>
                    {o.shippingSnapshot}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-brand-100 pt-2 text-slate-800">
                  <span>ยอดรวม</span>
                  <span className="font-semibold">
                    ฿{Number(o.totalPrice).toLocaleString("th-TH")}
                  </span>
                </div>
                {Number(o.heartsGranted) > 0 ? (
                  <p className="mt-1 flex flex-wrap items-center justify-end gap-1 text-right text-rose-800">
                    <span>แถมหัวใจ</span>
                    <InlineHeart size="sm" className="text-rose-700" />
                    <span>
                      {Number(o.heartsGranted).toLocaleString("th-TH")}
                    </span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasLocal ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            ประวัติในเครื่อง (สาธิต)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            เก็บในเบราว์เซอร์ — ไม่ต้องล็อกอิน
          </p>
          <ul className="mt-3 space-y-4">
            {localOrders.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-mono text-xs text-slate-500">{o.id}</span>
                  <time
                    className="text-xs text-slate-500"
                    dateTime={new Date(o.at).toISOString()}
                  >
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
                <p className="mt-1 flex flex-wrap items-center justify-end gap-1 text-right text-rose-800">
                  <span>แถมหัวใจ</span>
                  <InlineHeart size="sm" className="text-rose-700" />
                  <span>{Number(o.hearts).toLocaleString("th-TH")}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
