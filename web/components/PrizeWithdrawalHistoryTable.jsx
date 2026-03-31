"use client";

import { Fragment, useEffect, useState } from "react";

function formatBaht(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString("th-TH");
}

function withdrawalStatusThai(s) {
  if (s === "pending") return "รออนุมัติ";
  if (s === "approved") return "อนุมัติแล้ว";
  if (s === "rejected") return "ปฏิเสธ";
  if (s === "cancelled") return "ยกเลิกแล้ว";
  return s || "—";
}

function StatusBadge({ status }) {
  const base = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold";
  if (status === "pending") {
    return (
      <span className={`${base} bg-amber-100 text-amber-950 ring-1 ring-amber-200/80`}>
        {withdrawalStatusThai(status)}
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80`}>
        {withdrawalStatusThai(status)}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className={`${base} bg-slate-200 text-slate-800 ring-1 ring-slate-300/80`}>
        {withdrawalStatusThai(status)}
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className={`${base} bg-violet-100 text-violet-950 ring-1 ring-violet-200/80`}>
        {withdrawalStatusThai(status)}
      </span>
    );
  }
  return (
    <span className={`${base} bg-slate-100 text-slate-800 ring-1 ring-slate-200/80`}>
      {withdrawalStatusThai(status)}
    </span>
  );
}

/**
 * @param {{
 *   withdrawals: Array<Record<string, unknown>>,
 *   loading: boolean,
 *   creatorRefLabel: string,
 *   onRefresh: () => void | Promise<void>,
 *   allowCancel?: boolean,
 *   onCancelRequest?: (id: string) => Promise<void>,
 *   cancelingId?: string | null,
 *   emptyMessage?: string,
 *   compactTitle?: boolean,
 *   focusRowId?: string | null
 * }} props
 */
export default function PrizeWithdrawalHistoryTable({
  withdrawals,
  loading,
  creatorRefLabel,
  onRefresh,
  allowCancel = false,
  onCancelRequest,
  cancelingId = null,
  emptyMessage = "ยังไม่มีรายการ",
  compactTitle = false,
  focusRowId = null
}) {
  const [detailOpenId, setDetailOpenId] = useState(null);

  useEffect(() => {
    if (focusRowId) setDetailOpenId(String(focusRowId));
  }, [focusRowId]);

  async function handleCancelClick(id) {
    if (!onCancelRequest) return;
    if (
      !confirm(
        "ยกเลิกคำขอถอนนี้? ยอดถอนได้จะกลับมาตามยอดรางวัล (ไม่หักคำขอนี้อีก)"
      )
    ) {
      return;
    }
    await onCancelRequest(id);
  }

  return (
    <div
      className={
        compactTitle
          ? "mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          : "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3
            className={
              compactTitle ? "text-sm font-semibold text-slate-900" : "text-base font-semibold text-slate-900"
            }
          >
            ประวัติการขอถอน
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            ถอนจากผู้สร้าง{" "}
            <span className="font-medium text-slate-700">@{String(creatorRefLabel || "").replace(/^@+/, "")}</span>{" "}
            (ผู้โอนเงินให้คุณ)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "กำลังโหลด…" : "รีเฟรชรายการ"}
        </button>
      </div>
      {loading && withdrawals.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">กำลังโหลดประวัติ…</p>
      ) : withdrawals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  วันที่สั่งถอน
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  ถอนจาก
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  จำนวน
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  สถานะ
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => {
                const wid = String(w.id);
                const open = detailOpenId === wid;
                const pending = w.status === "pending";
                return (
                  <Fragment key={wid}>
                    <tr className="border-b border-slate-100 transition hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        {w.createdAt
                          ? new Date(w.createdAt).toLocaleString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="font-medium text-slate-900"
                          title="ยูสเซอร์ผู้สร้างที่รับผิดชอบโอน"
                        >
                          @{String(w.creatorUsername || "").replace(/^@+/, "")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums font-semibold text-emerald-800">
                        ฿{formatBaht(w.amountThb)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={w.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setDetailOpenId(open ? null : wid)}
                            className="w-fit text-sm font-semibold text-brand-800 underline decoration-brand-800/30 underline-offset-2 hover:text-brand-950"
                          >
                            {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                          </button>
                          {allowCancel && pending && onCancelRequest ? (
                            <button
                              type="button"
                              disabled={cancelingId === wid}
                              onClick={() => void handleCancelClick(wid)}
                              className="w-fit text-xs font-semibold text-rose-700 underline decoration-rose-400/50 hover:text-rose-900 disabled:opacity-50"
                            >
                              {cancelingId === w.id ? "กำลังยกเลิก…" : "ยกเลิกการถอน"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white">
                        <td colSpan={5} className="px-3 py-4 sm:px-4">
                          <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                บัญชีรับเงิน (ตอนส่งคำขอ)
                              </p>
                              <ul className="mt-2 space-y-1 text-slate-800">
                                <li>
                                  <span className="text-slate-500">ชื่อบัญชี</span>{" "}
                                  <span className="font-medium">{w.accountHolderName || "—"}</span>
                                </li>
                                <li>
                                  <span className="text-slate-500">เลขบัญชี</span>{" "}
                                  <span className="font-mono tabular-nums">{w.accountNumber || "—"}</span>
                                </li>
                                <li>
                                  <span className="text-slate-500">ธนาคาร</span> {w.bankName || "—"}
                                </li>
                              </ul>
                            </div>
                            {w.creatorNote && w.status !== "rejected" && w.status !== "cancelled" ? (
                              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <span className="font-medium text-slate-600">หมายเหตุผู้สร้าง:</span>{" "}
                                {w.creatorNote}
                              </p>
                            ) : null}
                            {w.status === "approved" ? (
                              <div className="space-y-2 border-t border-slate-100 pt-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                                  ยืนยันจากผู้สร้าง
                                </p>
                                {w.transferDate ? (
                                  <p className="text-slate-800">
                                    <span className="text-slate-500">วันที่โอนเงิน</span>{" "}
                                    {new Date(`${w.transferDate}T12:00:00`).toLocaleDateString("th-TH", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric"
                                    })}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500">ไม่ได้ระบุวันที่โอนในฟอร์ม</p>
                                )}
                                {w.transferSlipUrl ? (
                                  <a
                                    href={w.transferSlipUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-brand-800 underline"
                                  >
                                    เปิดดูสลิปโอนเงิน
                                  </a>
                                ) : (
                                  <p className="text-xs text-slate-500">ไม่มีสลิปแนบ</p>
                                )}
                              </div>
                            ) : w.status === "pending" ? (
                              <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                                รอผู้สร้างโอนและกดอนุมัติ — เมื่ออนุมัติแล้ว วันที่โอนและสลิป (ถ้ามี) จะแสดงที่นี่
                              </p>
                            ) : w.status === "cancelled" ? (
                              <p className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
                                คุณยกเลิกคำขอถอนนี้แล้ว — ยอดถอนได้จะไม่ถูกหักจากคำขอนี้อีก
                              </p>
                            ) : (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                <p className="font-medium text-slate-800">คำขอถูกปฏิเสธ</p>
                                {w.creatorNote ? (
                                  <p className="mt-1 text-slate-700">{w.creatorNote}</p>
                                ) : (
                                  <p className="mt-1 text-slate-500">ไม่มีหมายเหตุเพิ่มเติม</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
