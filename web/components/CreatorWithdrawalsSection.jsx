"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { uploadUrl } from "../lib/config";
import {
  apiGetIncomingPrizeAwards,
  apiGetIncomingPrizeWithdrawals,
  apiResolveIncomingItemAward,
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

function itemStatusLabel(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "ready_pickup") return "พร้อมให้รับเอง";
  if (s === "shipped") return "จัดส่งแล้ว";
  if (s === "completed") return "รับของเรียบร้อย";
  return "รอผู้สร้างกำหนดวิธีรับ";
}

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
    img.src = objectUrl;
  });
}

async function compressImage(originalFile) {
  const img = await loadImage(originalFile);
  const maxSide = 1600;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("บีบอัดรูปไม่สำเร็จ"));
        resolve(blob);
      },
      "image/jpeg",
      0.82
    );
  });
}

async function uploadSlipFile(file) {
  const body = new FormData();
  const compressed = await compressImage(file);
  const uploadFile = new File([compressed], `${Date.now()}.jpg`, {
    type: "image/jpeg"
  });
  body.append("image", uploadFile);
  const res = await fetch(uploadUrl(), { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "อัปโหลดสลิปไม่สำเร็จ");
  }
  return data.publicUrl;
}

export default function CreatorWithdrawalsSection({
  hideShellPageTitle = false
} = {}) {
  const { user, loading: authLoading } = useMemberAuth();
  const [rows, setRows] = useState([]);
  const [awardRows, setAwardRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [itemBusyId, setItemBusyId] = useState(null);
  const [transferDateById, setTransferDateById] = useState({});
  const [slipFileById, setSlipFileById] = useState({});
  const [expandedById, setExpandedById] = useState({});

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const [wdData, awardData] = await Promise.all([
        apiGetIncomingPrizeWithdrawals(token),
        apiGetIncomingPrizeAwards(token, { limit: 2000 })
      ]);
      const list = wdData && Array.isArray(wdData.withdrawals) ? wdData.withdrawals : [];
      const awards = awardData && Array.isArray(awardData.awards) ? awardData.awards : [];
      setRows(list);
      setAwardRows(awards);
    } catch (e) {
      setErr(e.message || String(e));
      setRows([]);
      setAwardRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  useEffect(() => {
    setExpandedById((prev) => {
      const next = {};
      for (const row of rows) {
        if (row?.status !== "pending") continue;
        const id = row?.id;
        if (id == null) continue;
        if (prev[id]) next[id] = true;
      }
      return next;
    });
  }, [rows]);

  async function resolveReject(id) {
    const token = getMemberToken();
    if (!token) return;
    setBusyId(id);
    setErr("");
    try {
      await apiResolvePrizeWithdrawal(token, id, { action: "reject" });
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function resolveApprove(id) {
    const token = getMemberToken();
    if (!token) return;
    setBusyId(id);
    setErr("");
    try {
      let transferSlipUrl;
      const file = slipFileById[id];
      if (file) {
        transferSlipUrl = await uploadSlipFile(file);
      }
      const td = transferDateById[id];
      const transferDate = td && String(td).trim() ? String(td).trim().slice(0, 10) : undefined;
      await apiResolvePrizeWithdrawal(token, id, {
        action: "approve",
        transferSlipUrl,
        transferDate
      });
      setSlipFileById((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      setTransferDateById((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function resolveItemAward(award, mode, status) {
    const token = getMemberToken();
    if (!token || !award?.id) return;
    setItemBusyId(String(award.id));
    setErr("");
    try {
      let trackingCode = "";
      if (mode === "ship" && status === "shipped") {
        trackingCode = window.prompt("กรอกเลขพัสดุ (ถ้ามี)", "") || "";
      }
      await apiResolveIncomingItemAward(token, award.id, {
        mode,
        status,
        trackingCode
      });
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setItemBusyId(null);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-hui-muted">กำลังโหลด…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">ต้องเข้าสู่ระบบ</p>
        <Link href="/login" className="mt-2 inline-block font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {hideShellPageTitle ? null : (
            <h2 className="text-lg font-semibold text-hui-section">คำขอถอนรางวัลถึงฉัน</h2>
          )}
          <p
            className={`text-sm text-hui-body ${hideShellPageTitle ? "" : "mt-1"}`}
          >
            โอนเงินแล้วกดอนุมัติ — ระบุ<strong>วันที่โอน</strong>หรือ<strong>แนบสลิป</strong> (หรือทั้งคู่) เพื่อให้ผู้ขอถอนเห็นในรายละเอียด
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-hui-border bg-white px-3 py-2 text-sm font-medium text-hui-body hover:bg-hui-pageTop disabled:opacity-50"
        >
          {loading ? "กำลังโหลด…" : "รีเฟรช"}
        </button>
      </div>

      {err ? (
        <p className="text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}

      <details className="rounded-xl border border-hui-border bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-3 py-2 marker:hidden [&::-webkit-details-marker]:hidden">
          <h3 className="text-sm font-semibold text-hui-section">
            ประวัติผู้เล่นที่ได้รับรางวัลจากเกมของฉัน
          </h3>
          <p className="mt-0.5 text-sm text-hui-muted">
            คลิกเพื่อขยายรายการว่าใครเล่นแล้วได้รับรางวัลอะไรในแต่ละเกม
          </p>
        </summary>
        <div className="overflow-x-auto border-t border-hui-border/70">
          {awardRows.length === 0 ? (
            <p className="px-4 py-5 text-sm text-hui-muted">ยังไม่มีผู้ได้รับรางวัลจากเกมของคุณ</p>
          ) : (
            <table className="min-w-full divide-y divide-hui-border text-sm">
              <thead className="bg-hui-pageTop text-left text-sm font-semibold uppercase tracking-wide text-hui-body">
                <tr>
                  <th className="px-3 py-2.5">เมื่อ</th>
                  <th className="px-3 py-2.5">เกม</th>
                  <th className="px-3 py-2.5">ผู้เล่น</th>
                  <th className="px-3 py-2.5">รางวัล</th>
                  <th className="px-3 py-2.5">จัดส่งรางวัลสิ่งของ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hui-border/70">
                {awardRows.map((a) => {
                  const player = [a.winnerFirstName, a.winnerLastName].filter(Boolean).join(" ").trim();
                  const prizeBits = [a.prizeTitle, a.prizeValueText, a.prizeUnit].filter(Boolean);
                  return (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap px-3 py-2.5 text-hui-body">{formatDate(a.wonAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-hui-section">{a.gameTitle || "เกม"}</div>
                        <div className="text-sm text-hui-muted">
                          ชุดที่ {Math.max(0, Math.floor(Number(a.setIndex)) || 0) + 1}
                          {a.gameCode ? ` · ${a.gameCode}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-hui-section">
                          @{String(a.winnerUsername || "").replace(/^@+/, "")}
                        </div>
                        <div className="text-sm text-hui-muted">{player || "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-hui-body">{prizeBits.join(" ") || "รางวัล"}</td>
                      <td className="px-3 py-2.5">
                        {a.prizeCategory !== "item" ? (
                          <span className="text-sm text-hui-muted">—</span>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-hui-body">
                              {itemStatusLabel(a.itemFulfillmentStatus)}
                            </p>
                            {a.prizeFulfillmentMode === "pickup" && a.winnerPickupAckAt ? (
                              <p className="text-sm font-semibold text-emerald-800">
                                ผู้เล่นกดรับรางวัล (มารับเอง): {formatDate(a.winnerPickupAckAt)}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={itemBusyId === a.id}
                                onClick={() => void resolveItemAward(a, "pickup", "ready_pickup")}
                                className="rounded border border-hui-border px-2 py-1 text-sm font-semibold text-hui-body hover:bg-hui-pageTop disabled:opacity-50"
                              >
                                นัดรับเอง
                              </button>
                              <button
                                type="button"
                                disabled={itemBusyId === a.id}
                                onClick={() => void resolveItemAward(a, "ship", "shipped")}
                                className="rounded border border-hui-cta/45 px-2 py-1 text-sm font-semibold text-hui-cta hover:bg-hui-pageTop disabled:opacity-50"
                              >
                                ส่งตามที่อยู่
                              </button>
                              <button
                                type="button"
                                disabled={itemBusyId === a.id}
                                onClick={() =>
                                  void resolveItemAward(
                                    a,
                                    a.itemFulfillmentMode === "pickup" ? "pickup" : "ship",
                                    "completed"
                                  )
                                }
                                className="rounded border border-emerald-300 px-2 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                รับของแล้ว
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </details>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-hui-muted">กำลังโหลดรายการ…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-hui-border bg-hui-pageTop px-4 py-6 text-center text-sm text-hui-body">
          ยังไม่มีคำขอถอนรางวัล
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hui-border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-hui-border text-sm">
            <thead className="bg-hui-pageTop text-left text-sm font-semibold uppercase tracking-wide text-hui-body">
              <tr>
                <th className="px-3 py-2.5">เมื่อ</th>
                <th className="px-3 py-2.5">สมาชิก</th>
                <th className="px-3 py-2.5 text-right">จำนวน</th>
                <th className="px-3 py-2.5">บัญชีรับเงิน</th>
                <th className="px-3 py-2.5">สถานะ</th>
                <th className="px-3 py-2.5">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hui-border/70">
              {rows.map((r) => {
                const pending = r.status === "pending";
                const expanded = pending && Boolean(expandedById[r.id]);
                return (
                  <Fragment key={r.id}>
                    <tr className="align-top">
                      <td className="whitespace-nowrap px-3 py-3 text-hui-body">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-hui-section">
                          @{String(r.requesterUsername || "").replace(/^@+/, "")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-emerald-800">
                        {formatBaht(r.amountThb)} ฿
                      </td>
                      <td className="max-w-[220px] px-3 py-3 text-hui-body">
                        <div className="text-sm text-hui-muted">ชื่อบัญชี</div>
                        <div className="font-medium">{r.accountHolderName || "—"}</div>
                        <div className="mt-1 text-sm text-hui-muted">เลขบัญชี / ธนาคาร</div>
                        <div className="font-mono text-sm">{r.accountNumber || "—"}</div>
                        <div>{r.bankName || "—"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            r.status === "pending"
                              ? "rounded-full bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200/80"
                              : r.status === "approved"
                                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200/80"
                                : r.status === "cancelled"
                                  ? "rounded-full bg-violet-100 px-2 py-0.5 text-sm font-semibold text-violet-950 ring-1 ring-violet-200/80"
                                  : "rounded-full bg-hui-border/35 px-2 py-0.5 text-sm font-semibold text-hui-body ring-1 ring-hui-border/80"
                          }
                        >
                          {r.status === "pending"
                            ? "รออนุมัติ"
                            : r.status === "approved"
                              ? "อนุมัติแล้ว"
                              : r.status === "rejected"
                                ? "ปฏิเสธ"
                                : r.status === "cancelled"
                                  ? "ยกเลิกโดยผู้ขอ"
                                  : r.status}
                        </span>
                        {r.resolvedAt ? (
                          <div className="mt-1 text-sm text-hui-muted">
                            {formatDate(r.resolvedAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-hui-body">
                        {pending ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedById((prev) => ({
                                ...prev,
                                [r.id]: !prev[r.id]
                              }))
                            }
                            className="rounded-lg border border-hui-border bg-white px-2.5 py-1 text-sm font-semibold text-hui-body hover:bg-hui-pageTop"
                            aria-expanded={expanded}
                            aria-controls={`wd-actions-${r.id}`}
                          >
                            {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                          </button>
                        ) : (
                          <span className="text-sm text-hui-muted">—</span>
                        )}
                      </td>
                    </tr>
                    {pending && expanded ? (
                      <tr className="bg-hui-pageTop/95" id={`wd-actions-${r.id}`}>
                        <td colSpan={6} className="px-3 py-4">
                          <div className="mx-auto max-w-3xl rounded-xl border border-hui-border bg-white p-4 shadow-sm">
                            <p className="text-sm font-semibold text-hui-body">
                              ยืนยันการโอนให้สมาชิก (อย่างใดอย่างหนึ่งหรือทั้งคู่)
                            </p>
                            <p className="mt-0.5 text-sm text-hui-muted">
                              ระบุวันที่โอน หรืออัปโหลดสลิป — ผู้ขอถอนจะเห็นในหน้ารายละเอียด
                            </p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              <div>
                                <label
                                  className="block text-sm font-medium text-hui-body"
                                  htmlFor={`wd-date-${r.id}`}
                                >
                                  วันที่โอนเงิน
                                </label>
                                <input
                                  id={`wd-date-${r.id}`}
                                  type="date"
                                  value={transferDateById[r.id] || ""}
                                  onChange={(e) =>
                                    setTransferDateById((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm shadow-sm focus:border-hui-cta focus:outline-none focus:ring-2 focus:ring-hui-cta/20"
                                />
                              </div>
                              <div>
                                <label
                                  className="block text-sm font-medium text-hui-body"
                                  htmlFor={`wd-slip-${r.id}`}
                                >
                                  แนบสลิปโอน
                                </label>
                                <input
                                  id={`wd-slip-${r.id}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) =>
                                    setSlipFileById((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.files?.[0] || undefined
                                    }))
                                  }
                                  className="mt-1 block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-hui-pageTop file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-hui-body"
                                />
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-hui-border/70 pt-4">
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                onClick={() => void resolveApprove(r.id)}
                                className="hui-btn-primary px-4 py-2 text-sm shadow-soft disabled:opacity-50"
                              >
                                {busyId === r.id ? "กำลังบันทึก…" : "อนุมัติ (จ่ายแล้ว)"}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                onClick={() => void resolveReject(r.id)}
                                className="rounded-lg border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-pageTop disabled:opacity-50"
                              >
                                ปฏิเสธ
                              </button>
                            </div>
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
    </section>
  );
}
