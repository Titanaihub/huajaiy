"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  apiGetIncomingPrizeWithdrawals,
  apiResolvePrizeWithdrawal,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

function formatBaht(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString("th-TH");
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return String(iso);
  }
}

export default function CreatorWithdrawalsSection() {
  const { user, loading: authLoading } = useMemberAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const data = await apiGetIncomingPrizeWithdrawals(token);
      const list = data && Array.isArray(data.withdrawals) ? data.withdrawals : [];
      setRows(list);
    } catch (e) {
      setErr(e.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  async function resolve(id, action) {
    const token = getMemberToken();
    if (!token) return;
    setBusyId(id);
    setErr("");
    try {
      await apiResolvePrizeWithdrawal(token, id, { action });
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-slate-500">กำลังโหลด…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">ต้องเข้าสู่ระบบ</p>
        <Link href="/login" className="mt-2 inline-block font-semibold text-brand-800 underline">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">คำขอถอนรางวัลถึงฉัน</h2>
          <p className="mt-1 text-sm text-slate-600">
            สมาชิกที่ชนะรางวัลเงินสดจากเกมของคุณส่งคำขอถอน — โอนเงินแล้วกดอนุมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "กำลังโหลด…" : "รีเฟรช"}
        </button>
      </div>

      {err ? (
        <p className="text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายการ…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          ยังไม่มีคำขอถอนรางวัล
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2.5">เมื่อ</th>
                <th className="px-3 py-2.5">สมาชิก</th>
                <th className="px-3 py-2.5 text-right">จำนวน</th>
                <th className="px-3 py-2.5">บัญชีรับเงิน</th>
                <th className="px-3 py-2.5">สถานะ</th>
                <th className="px-3 py-2.5">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const pending = r.status === "pending";
                return (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-slate-900">
                        @{String(r.requesterUsername || "").replace(/^@+/, "")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-emerald-800">
                      {formatBaht(r.amountThb)} ฿
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-slate-700">
                      <div className="text-xs text-slate-500">ชื่อบัญชี</div>
                      <div className="font-medium">{r.accountHolderName || "—"}</div>
                      <div className="mt-1 text-xs text-slate-500">เลขบัญชี / ธนาคาร</div>
                      <div className="font-mono text-xs">{r.accountNumber || "—"}</div>
                      <div>{r.bankName || "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          r.status === "pending"
                            ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                            : r.status === "approved"
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900"
                              : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800"
                        }
                      >
                        {r.status === "pending"
                          ? "รอดำเนินการ"
                          : r.status === "approved"
                            ? "อนุมัติแล้ว"
                            : r.status === "rejected"
                              ? "ปฏิเสธ"
                              : r.status}
                      </span>
                      {r.resolvedAt ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(r.resolvedAt)}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {pending ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void resolve(r.id, "approve")}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {busyId === r.id ? "…" : "อนุมัติ (จ่ายแล้ว)"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void resolve(r.id, "reject")}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            ปฏิเสธ
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
