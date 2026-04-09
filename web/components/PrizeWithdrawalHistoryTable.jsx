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
  const base = "inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold";
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
      <span className={`${base} bg-hui-border/35 text-hui-body ring-1 ring-hui-border/80`}>
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
    <span className={`${base} bg-hui-pageTop text-hui-body ring-1 ring-hui-border/80`}>
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
          ? "mt-4 rounded-xl border border-hui-border bg-white p-3 shadow-sm sm:p-4"
          : "rounded-2xl border border-hui-border/90 bg-white p-4 shadow-sm sm:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hui-border/70 pb-3">
        <div>
          <h3
            className={
              compactTitle ? "text-sm font-semibold text-hui-section" : "text-base font-semibold text-hui-section"
            }
          >
            ประวัติการขอถอน
          </h3>
          <p className="mt-0.5 text-sm text-hui-muted">
            ถอนจากผู้สร้าง{" "}
            <span className="font-medium text-hui-body">@{String(creatorRefLabel || "").replace(/^@+/, "")}</span>{" "}
            (ผู้โอนเงินให้คุณ)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-hui-border bg-white px-3 py-1.5 text-sm font-semibold text-hui-body transition hover:bg-hui-pageTop disabled:opacity-50"
        >
          {loading ? "กำลังโหลด…" : "รีเฟรชรายการ"}
        </button>
      </div>
      {loading && withdrawals.length === 0 ? (
        <p className="mt-4 text-sm text-hui-muted">กำลังโหลดประวัติ…</p>
      ) : withdrawals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-hui-border bg-hui-pageTop/90 px-4 py-6 text-center text-sm text-hui-body">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-hui-border/70">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hui-border bg-hui-pageTop/95">
                <th className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-hui-body">
                  วันที่สั่งถอน
                </th>
                <th className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-hui-body">
                  ถอนจาก
                </th>
                <th className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-hui-body">
                  จำนวน
                </th>
                <th className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-hui-body">
                  สถานะ
                </th>
                <th className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-hui-body">
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
                    <tr className="border-b border-hui-border/70 transition hover:bg-hui-pageTop/60">
                      <td className="whitespace-nowrap px-3 py-3 text-hui-body">
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
                          className="font-medium text-hui-section"
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
                            className="w-fit text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                          >
                            {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                          </button>
                          {allowCancel && pending && onCancelRequest ? (
                            <button
                              type="button"
                              disabled={cancelingId === wid}
                              onClick={() => void handleCancelClick(wid)}
                              className="w-fit text-sm font-semibold text-rose-700 underline decoration-rose-400/50 hover:text-rose-900 disabled:opacity-50"
                            >
                              {cancelingId === w.id ? "กำลังยกเลิก…" : "ยกเลิกการถอน"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-hui-border/70 bg-gradient-to-b from-hui-pageTop/90 to-white">
                        <td colSpan={5} className="px-3 py-4 sm:px-4">
                          <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-hui-border bg-white p-4 text-sm text-hui-body shadow-sm">
                            {w.requesterNote ? (
                              <p className="rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-2 text-sm text-sky-950">
                                <span className="font-medium text-hui-body">หมายเหตุของคุณ (ตอนส่งคำขอ):</span>{" "}
                                {w.requesterNote}
                              </p>
                            ) : null}
                            <div>
                              <p className="text-sm font-bold uppercase tracking-wide text-hui-muted">
                                บัญชีรับเงิน (ตอนส่งคำขอ)
                              </p>
                              <ul className="mt-2 space-y-1 text-hui-body">
                                <li>
                                  <span className="text-hui-muted">ชื่อบัญชี</span>{" "}
                                  <span className="font-medium">{w.accountHolderName || "—"}</span>
                                </li>
                                <li>
                                  <span className="text-hui-muted">เลขบัญชี</span>{" "}
                                  <span className="font-mono tabular-nums">{w.accountNumber || "—"}</span>
                                </li>
                                <li>
                                  <span className="text-hui-muted">ธนาคาร</span> {w.bankName || "—"}
                                </li>
                              </ul>
                            </div>
                            {w.creatorNote && w.status !== "rejected" && w.status !== "cancelled" ? (
                              <p className="rounded-lg bg-hui-pageTop px-3 py-2 text-sm">
                                <span className="font-medium text-hui-body">หมายเหตุผู้สร้าง:</span>{" "}
                                {w.creatorNote}
                              </p>
                            ) : null}
                            {w.status === "approved" ? (
                              <div className="space-y-2 border-t border-hui-border/70 pt-3">
                                <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                                  ยืนยันจากผู้สร้าง
                                </p>
                                {w.transferDate ? (
                                  <p className="text-hui-body">
                                    <span className="text-hui-muted">วันที่โอนเงิน</span>{" "}
                                    {new Date(`${w.transferDate}T12:00:00`).toLocaleDateString("th-TH", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric"
                                    })}
                                  </p>
                                ) : (
                                  <p className="text-sm text-hui-muted">ไม่ได้ระบุวันที่โอนในฟอร์ม</p>
                                )}
                                {w.transferSlipUrl ? (
                                  <a
                                    href={w.transferSlipUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                                  >
                                    เปิดดูสลิปโอนเงิน
                                  </a>
                                ) : (
                                  <p className="text-sm text-hui-muted">ไม่มีสลิปแนบ</p>
                                )}
                              </div>
                            ) : w.status === "pending" ? (
                              <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                                รอผู้สร้างโอนและกดอนุมัติ — เมื่ออนุมัติแล้ว วันที่โอนและสลิป (ถ้ามี) จะแสดงที่นี่
                              </p>
                            ) : w.status === "cancelled" ? (
                              <p className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-sm text-violet-950">
                                คุณยกเลิกคำขอถอนนี้แล้ว — ยอดถอนได้จะไม่ถูกหักจากคำขอนี้อีก
                              </p>
                            ) : (
                              <div className="rounded-lg border border-hui-border bg-hui-pageTop px-3 py-2 text-sm text-hui-body">
                                <p className="font-medium text-hui-body">คำขอถูกปฏิเสธ</p>
                                {w.creatorNote ? (
                                  <p className="mt-1 text-hui-body">{w.creatorNote}</p>
                                ) : (
                                  <p className="mt-1 text-hui-muted">ไม่มีหมายเหตุเพิ่มเติม</p>
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
