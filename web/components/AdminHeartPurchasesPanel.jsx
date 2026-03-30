"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminApproveHeartPurchase,
  apiAdminPendingHeartPurchases,
  apiAdminRejectHeartPurchase
} from "../lib/rolesApi";

function statusThai(s) {
  if (s === "pending") return "รออนุมัติ";
  if (s === "approved") return "อนุมัติแล้ว";
  if (s === "rejected") return "ปฏิเสธ";
  return s;
}

export default function AdminHeartPurchasesPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const data = await apiAdminPendingHeartPurchases(token);
      setList(data.purchases || []);
    } catch (e) {
      setErr(e.message || String(e));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id) {
    const token = getMemberToken();
    if (!token) return;
    setBusyId(id);
    try {
      await apiAdminApproveHeartPurchase(token, id, note.trim() || undefined);
      setNote("");
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    const token = getMemberToken();
    if (!token) return;
    setBusyId(id);
    try {
      await apiAdminRejectHeartPurchase(token, id, note.trim() || undefined);
      setNote("");
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600">
        คำขอที่รอแอดมินตรวจสลิป — อนุมัติแล้วระบบจะเติมหัวใจชมพู/แดงตามแพ็กเกจที่ซื้อ (ตอนสั่งซื้อ)
      </p>
      <div>
        <label className="text-xs font-medium text-slate-600">
          หมายเหตุถึงสมาชิก (ไม่บังคับ)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full max-w-lg rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="ใช้ร่วมกับปุ่มอนุมัติ/ปฏิเสธ"
        />
      </div>
      <button
        type="button"
        onClick={() => load()}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
      >
        รีเฟรช
      </button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">กำลังโหลด…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">ไม่มีคำขอที่รออนุมัติ</p>
      ) : (
        <ul className="space-y-4">
          {list.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">
                @{p.buyerUsername || "?"} — {p.buyerFirstName} {p.buyerLastName}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                แพ็กเกจ: <span className="font-medium">{p.packageTitle}</span>
                {p.pinkQty > 0 ? (
                  <>
                    {" "}
                    · ชมพู <span className="text-rose-600">{p.pinkQty}</span> แดง{" "}
                    <span className="text-red-700">{p.redQty}</span>
                  </>
                ) : (
                  <>
                    {" "}
                    · แดงแจก <span className="text-red-700">{p.redQty}</span>
                  </>
                )}{" "}
                · ราคาตอนซื้อ ฿{p.priceThbSnapshot?.toLocaleString("th-TH")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(p.createdAt).toLocaleString("th-TH")} · {statusThai(p.status)}
              </p>
              <p className="mt-2">
                <a
                  href={p.slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-800 underline"
                >
                  เปิดดูสลิปโอนเงิน
                </a>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => approve(p.id)}
                  className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  อนุมัติและเติมหัวใจ
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => reject(p.id)}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
                >
                  ปฏิเสธ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
