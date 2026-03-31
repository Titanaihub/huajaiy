"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiCreateRoomRedGiftCode,
  apiDeleteRoomRedGiftCode,
  apiListRoomRedGiftCodes,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountRoomRedGiftSection() {
  const { user, refresh } = useMemberAuth();
  const [codes, setCodes] = useState([]);
  const [listErr, setListErr] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [redAmount, setRedAmount] = useState(50);
  const [codeCount, setCodeCount] = useState(3);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState("");
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const loadCodes = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setListErr("");
    setListLoading(true);
    try {
      const data = await apiListRoomRedGiftCodes(token);
      setCodes(data.codes || []);
    } catch (e) {
      setListErr(e?.message || "โหลดรายการรหัสไม่สำเร็จ");
      setCodes([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const estimatedRedDeduction = useMemo(() => {
    const ra = Math.max(1, Math.floor(Number(redAmount) || 1));
    const n = Math.min(100, Math.max(1, Math.floor(Number(codeCount) || 1)));
    return ra * n;
  }, [redAmount, codeCount]);

  async function onCreate(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setCreateBusy(true);
    setCreateMsg("");
    try {
      const ra = Math.max(1, Math.floor(Number(redAmount) || 1));
      const n = Math.min(100, Math.max(1, Math.floor(Number(codeCount) || 1)));
      const data = await apiCreateRoomRedGiftCode(token, {
        redAmount: ra,
        codeCount: n,
        maxUses: 1
      });
      const list = data.codes || (data.code ? [data.code] : []);
      const preview = list
        .slice(0, 5)
        .map((c) => c.code)
        .join(", ");
      const more = list.length > 5 ? ` … อีก ${list.length - 5} รหัส` : "";
      const ded = Math.max(0, Math.floor(Number(data.redDeducted) || 0));
      setCreateMsg(
        `สร้าง ${list.length} รหัสแล้ว (แต่ละรหัส ${ra} แดง · คนละครั้ง) — ${preview}${more} · หักแดงจากคุณ ${ded.toLocaleString("th-TH")} ดวง`
      );
      await refresh();
      await loadCodes();
    } catch (ex) {
      setCreateMsg(ex?.message || "สร้างไม่สำเร็จ");
    } finally {
      setCreateBusy(false);
    }
  }

  async function onDeleteCode(c) {
    const token = getMemberToken();
    if (!token || !c?.id) return;
    setDeleteErr("");
    setDeleteBusyId(String(c.id));
    try {
      await apiDeleteRoomRedGiftCode(token, c.id);
      await refresh();
      await loadCodes();
    } catch (ex) {
      setDeleteErr(ex?.message || "ลบรหัสไม่สำเร็จ");
    } finally {
      setDeleteBusyId("");
    }
  }

  async function onDeleteAllCodes() {
    const token = getMemberToken();
    if (!token || codes.length === 0) return;
    if (
      !window.confirm(
        `ลบรหัสทั้ง ${codes.length} รายการ? ระบบจะคืนหัวใจแดงเฉพาะส่วนที่ยังไม่ถูกแลก (ตามจำนวนครั้งที่เหลือ)`
      )
    ) {
      return;
    }
    setDeleteErr("");
    setDeleteAllBusy(true);
    try {
      for (const c of codes) {
        await apiDeleteRoomRedGiftCode(token, c.id);
      }
      await refresh();
      await loadCodes();
    } catch (ex) {
      setDeleteErr(ex?.message || "ลบรหัสบางรายการไม่สำเร็จ — ลองรีเฟรชแล้วลบที่เหลือ");
      await loadCodes();
      await refresh();
    } finally {
      setDeleteAllBusy(false);
    }
  }

  const giveawayBal = Math.max(0, Math.floor(Number(user?.redGiveawayBalance) || 0));
  function exportCsv() {
    const rows = [
      ["code", "redAmount", "maxUses", "usesCount", "status", "redeemedBy"],
      ...codes.map((c) => [
        c.code || "",
        String(c.redAmount ?? ""),
        String(c.maxUses ?? ""),
        String(c.usesCount ?? ""),
        c.cancelled ? "cancelled" : c.exhausted ? "used-up" : c.expired ? "expired" : "active",
        Array.isArray(c.redeemedByUsernames) ? c.redeemedByUsernames.join(";") : ""
      ])
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `room-red-codes-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printCodes() {
    const stamp = new Date().toLocaleString("th-TH");
    const rows = codes
      .map((c) => {
        const status = c.cancelled
          ? "ยกเลิกแล้ว"
          : c.exhausted
            ? "ใช้ครบแล้ว"
            : c.expired
              ? "หมดอายุ"
              : "พร้อมใช้";
        return `<tr><td>${c.code || ""}</td><td>${c.redAmount || 0}</td><td>${c.maxUses || 1}</td><td>${c.usesCount || 0}</td><td>${status}</td></tr>`;
      })
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>พิมพ์รหัสหัวใจแดง</title><style>body{font-family:Tahoma,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}h1{font-size:20px} .muted{color:#666;font-size:12px}</style></head><body><h1>รายการรหัสหัวใจแดงสำหรับแจก</h1><p class="muted">พิมพ์เมื่อ ${stamp}</p><table><thead><tr><th>รหัส</th><th>แดง/ครั้ง</th><th>สิทธิ์ใช้</th><th>ใช้แล้ว</th><th>สถานะ</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>ยังไม่มีรหัส</td></tr>"}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2 text-sm text-rose-950">
        <p className="font-semibold text-rose-900">หัวใจแดงทั้งหมด (สำหรับแจกเล่นเกม)</p>
        <p className="mt-1 tabular-nums text-lg font-bold text-red-800">
          {giveawayBal.toLocaleString("th-TH")} ดวง
        </p>
      </div>

      <form onSubmit={onCreate} className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">หัวใจแดง ที่จะแจกต่อรหัส</label>
            <input
              type="number"
              min={1}
              value={redAmount}
              onChange={(e) => setRedAmount(e.target.value)}
              className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              จำนวนรหัสที่ต้องการสร้าง (รหัสใช้ได้ครั้งเดียว)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={codeCount}
              onChange={(e) => setCodeCount(e.target.value)}
              className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
          >
            {createBusy ? "กำลังสร้าง…" : "สร้างรหัส"}
          </button>
        </div>
        <p className="text-xs text-amber-900/90">
          คาดว่าจะหักหัวใจแดงรวม <strong>{estimatedRedDeduction.toLocaleString("th-TH")} ดวง</strong>
        </p>
      </form>
      {createMsg ? (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          {createMsg}
        </p>
      ) : null}

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800">
            รหัสที่คุณสร้าง
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              รหัสที่ยังไม่ถูกใช้งานสามารถกดยกเลิกได้
            </span>
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              ดาวน์โหลดไฟล์ Excel
            </button>
            <button
              type="button"
              onClick={printCodes}
              className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              พิมพ์รายการรหัส
            </button>
            {codes.length > 1 ? (
              <button
                type="button"
                disabled={deleteAllBusy || listLoading}
                onClick={() => void onDeleteAllCodes()}
                className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
              >
                {deleteAllBusy ? "กำลังยกเลิกทั้งหมด…" : "ยกเลิกทั้งหมด"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => loadCodes()}
              className="text-xs font-medium text-brand-800 underline"
            >
              รีเฟรช
            </button>
          </div>
        </div>
        {deleteErr ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {deleteErr}
          </p>
        ) : null}
        {listErr ? <p className="mt-2 text-sm text-red-600">{listErr}</p> : null}
        {listLoading ? (
          <p className="mt-2 text-sm text-slate-500">กำลังโหลด…</p>
        ) : codes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">ยังไม่มีรหัส</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {codes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <code className="font-mono font-semibold text-slate-900">{c.code}</code>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600">
                    แดง {c.redAmount} ·{" "}
                    {Number(c.maxUses) <= 1
                      ? `ใช้แล้ว ${c.usesCount}/1 (ครั้งเดียวต่อรหัส)`
                      : `ใช้แล้ว ${c.usesCount}/${c.maxUses}`}
                    {c.cancelled ? " · ยกเลิกแล้ว" : ""}
                    {c.expired ? " · หมดอายุ" : ""}
                    {c.exhausted ? " · เต็ม" : ""}
                    {Array.isArray(c.redeemedByUsernames) && c.redeemedByUsernames.length > 0
                      ? ` · ผู้ใช้: ${c.redeemedByUsernames.map((u) => `@${u}`).join(", ")}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    disabled={Boolean(deleteBusyId) || deleteAllBusy || c.cancelled || c.exhausted}
                    onClick={() => void onDeleteCode(c)}
                    className="rounded border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleteBusyId === String(c.id) ? "กำลังยกเลิก…" : "ยกเลิก"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
