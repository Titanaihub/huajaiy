"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminApproveHeartPurchase,
  apiAdminHeartPurchaseHistory,
  apiAdminPendingHeartPurchases,
  apiAdminRejectHeartPurchase
} from "../lib/rolesApi";

const HISTORY_PAGE = 40;

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

  const [hist, setHist] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histErr, setHistErr] = useState("");
  const [histStatus, setHistStatus] = useState("");
  const [histQ, setHistQ] = useState("");
  const [histQSubmit, setHistQSubmit] = useState("");
  const [histOffset, setHistOffset] = useState(0);
  const [histTotal, setHistTotal] = useState(0);
  const [histSummary, setHistSummary] = useState({
    sumPriceThb: 0,
    sumRedApproved: 0
  });

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

  const loadHistory = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setHistLoading(true);
    setHistErr("");
    try {
      const data = await apiAdminHeartPurchaseHistory(token, {
        limit: HISTORY_PAGE,
        offset: histOffset,
        status: histStatus || undefined,
        q: histQSubmit || undefined
      });
      setHist(data.purchases || []);
      setHistTotal(typeof data.total === "number" ? data.total : 0);
      if (data.summary) {
        setHistSummary({
          sumPriceThb: Number(data.summary.sumPriceThb) || 0,
          sumRedApproved: Number(data.summary.sumRedApproved) || 0
        });
      }
    } catch (e) {
      setHistErr(e.message || String(e));
      setHist([]);
      setHistTotal(0);
    } finally {
      setHistLoading(false);
    }
  }, [histOffset, histStatus, histQSubmit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function approve(id) {
    const token = getMemberToken();
    if (!token) return;
    setBusyId(id);
    try {
      await apiAdminApproveHeartPurchase(token, id, note.trim() || undefined);
      setNote("");
      await load();
      await loadHistory();
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
      await loadHistory();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  function applyHistoryFilters() {
    setHistOffset(0);
    setHistQSubmit(histQ.trim());
  }

  const histEnd = Math.min(histOffset + hist.length, histTotal);
  const canPrev = histOffset > 0;
  const canNext = histOffset + HISTORY_PAGE < histTotal;

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-hui-section">คำขอที่รออนุมัติ</h3>
        <p className="text-sm text-hui-body">
          คำขอที่รอแอดมินตรวจสลิป — อนุมัติแล้วระบบจะเติม<strong className="font-semibold">หัวใจแดงแจกผู้เล่น</strong>ตามแพ็กเท่านั้น
          (ไม่มีหัวใจชมพูจากช่องทางนี้)
        </p>
        <div>
          <label className="text-sm font-medium text-hui-body">
            หมายเหตุถึงสมาชิก (ไม่บังคับ)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full max-w-lg rounded-xl border border-hui-border px-3 py-2 text-sm"
            placeholder="ใช้ร่วมกับปุ่มอนุมัติ/ปฏิเสธ"
          />
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg border border-hui-border bg-white px-3 py-1.5 text-sm font-semibold text-hui-body"
        >
          รีเฟรช
        </button>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {loading ? (
          <p className="text-sm text-hui-muted">กำลังโหลด…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-hui-muted">ไม่มีคำขอที่รออนุมัติ</p>
        ) : (
          <ul className="space-y-4">
            {list.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-hui-border bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-hui-section">
                  @{p.buyerUsername || "?"} — {p.buyerFirstName} {p.buyerLastName}
                </p>
                <p className="mt-1 text-sm text-hui-body">
                  แพ็กเกจ: <span className="font-medium">{p.packageTitle}</span>
                  {" "}
                  · แดงแจก <span className="text-red-700">{p.redQty}</span>
                  {" "}
                  · ราคาตอนซื้อ ฿{p.priceThbSnapshot?.toLocaleString("th-TH")}
                </p>
                <p className="mt-1 text-sm text-hui-muted">
                  {new Date(p.createdAt).toLocaleString("th-TH")} · {statusThai(p.status)}
                </p>
                <p className="mt-2">
                  <a
                    href={p.slipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                  >
                    เปิดดูสลิปโอนเงิน
                  </a>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => approve(p.id)}
                    className="hui-btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    อนุมัติและเติมแดงแจก
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
      </div>

      <div className="border-t border-hui-border pt-8">
        <h3 className="text-base font-semibold text-hui-section">ประวัติการสั่งซื้อหัวใจ</h3>
        <p className="mt-1 text-sm text-hui-body">
          ตรวจสอบย้อนหลังว่ามีใครสั่งซื้อ มูลค่าเท่าใด และสถานะอนุมัติ — ตัวเลขสรุปด้านล่างคิดจากตัวกรองปัจจุบัน (ทุกหน้า)
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-hui-border bg-hui-pageTop/90 px-4 py-3">
            <p className="text-sm font-medium text-hui-body">รายการที่ตรงตัวกรอง</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-hui-section">
              {histTotal.toLocaleString("th-TH")} รายการ
            </p>
          </div>
          <div className="rounded-xl border border-hui-border bg-hui-pageTop/90 px-4 py-3">
            <p className="text-sm font-medium text-hui-body">ยอดสั่งซื้อ (ราคาในรายการที่กรอง)</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-hui-section">
              ฿{histSummary.sumPriceThb.toLocaleString("th-TH")}
            </p>
          </div>
          <div className="rounded-xl border border-hui-border bg-hui-pageTop/90 px-4 py-3">
            <p className="text-sm font-medium text-hui-body">หัวใจที่อนุมัติจ่ายแล้ว (ในรายการที่กรอง)</p>
            <p className="mt-1 text-sm tabular-nums text-hui-section">
              แดงแจก <span className="font-semibold text-red-700">{histSummary.sumRedApproved}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-sm font-medium text-hui-body">สถานะ</label>
            <select
              value={histStatus}
              onChange={(e) => {
                setHistStatus(e.target.value);
                setHistOffset(0);
              }}
              className="mt-1 block rounded-lg border border-hui-border px-3 py-2 text-sm"
            >
              <option value="">ทั้งหมด</option>
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ปฏิเสธ</option>
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-sm font-medium text-hui-body">ค้นหาผู้ใช้ (ยูสเซอร์ / ชื่อ)</label>
            <input
              type="search"
              value={histQ}
              onChange={(e) => setHistQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyHistoryFilters();
              }}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              placeholder="เช่น member01"
            />
          </div>
          <button
            type="button"
            onClick={applyHistoryFilters}
            className="hui-btn-primary px-4 py-2 text-sm"
          >
            ค้นหา
          </button>
          <button
            type="button"
            onClick={() => {
              setHistOffset(0);
              loadHistory();
            }}
            className="rounded-lg border border-hui-border bg-white px-3 py-2 text-sm font-semibold text-hui-body"
          >
            รีเฟรชประวัติ
          </button>
        </div>

        {histErr ? <p className="mt-3 text-sm text-red-600">{histErr}</p> : null}

        {histLoading ? (
          <p className="mt-4 text-sm text-hui-muted">กำลังโหลดประวัติ…</p>
        ) : hist.length === 0 ? (
          <p className="mt-4 text-sm text-hui-muted">ไม่มีรายการตามตัวกรอง</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-hui-muted">
              แสดง {histOffset + 1}–{histEnd} จาก {histTotal.toLocaleString("th-TH")}
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-hui-border">
              <table className="min-w-full divide-y divide-hui-border text-left text-sm">
                <thead className="bg-hui-pageTop">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-hui-body">วันที่สั่ง</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">ผู้ซื้อ</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">แพ็ก</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">หัวใจ</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">บาท</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">สถานะ</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">แก้โดย</th>
                    <th className="px-3 py-2 font-semibold text-hui-body">สลิป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hui-border/70 bg-white">
                  {hist.map((p) => (
                    <tr key={p.id} className="hover:bg-hui-pageTop/90">
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-hui-body">
                        {new Date(p.createdAt).toLocaleString("th-TH")}
                      </td>
                      <td className="px-3 py-2 text-hui-body">
                        <span className="font-medium">@{p.buyerUsername || "?"}</span>
                        <br />
                        <span className="text-sm text-hui-muted">
                          {p.buyerFirstName} {p.buyerLastName}
                        </span>
                      </td>
                      <td className="max-w-[140px] px-3 py-2 text-sm text-hui-body">
                        {p.packageTitle}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm">
                        แดงแจก {p.redQty}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-hui-body">
                        ฿{Number(p.priceThbSnapshot || 0).toLocaleString("th-TH")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm">
                        {statusThai(p.status)}
                        {p.resolvedAt ? (
                          <span className="block text-hui-muted">
                            {new Date(p.resolvedAt).toLocaleString("th-TH")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-sm text-hui-body">
                        {p.resolverUsername ? `@${p.resolverUsername}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {p.slipUrl ? (
                          <a
                            href={p.slipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                          >
                            เปิด
                          </a>
                        ) : (
                          <span className="text-sm text-hui-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canPrev || histLoading}
                onClick={() => setHistOffset((o) => Math.max(0, o - HISTORY_PAGE))}
                className="rounded-lg border border-hui-border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                disabled={!canNext || histLoading}
                onClick={() => setHistOffset((o) => o + HISTORY_PAGE)}
                className="rounded-lg border border-hui-border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
