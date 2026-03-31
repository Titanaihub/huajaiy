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
  const [multiUseSingleCode, setMultiUseSingleCode] = useState(false);
  const [maxUses, setMaxUses] = useState(3);
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
    if (multiUseSingleCode) {
      const mu = Math.max(1, Math.floor(Number(maxUses) || 1));
      return ra * mu;
    }
    const n = Math.min(100, Math.max(1, Math.floor(Number(codeCount) || 1)));
    return ra * n;
  }, [redAmount, codeCount, maxUses, multiUseSingleCode]);

  async function onCreate(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setCreateBusy(true);
    setCreateMsg("");
    try {
      const ra = Math.max(1, Math.floor(Number(redAmount) || 1));
      let data;
      if (multiUseSingleCode) {
        const mu = Math.max(1, Math.floor(Number(maxUses) || 1));
        data = await apiCreateRoomRedGiftCode(token, {
          redAmount: ra,
          maxUses: mu,
          codeCount: 1
        });
        const ded = Math.max(0, Math.floor(Number(data.redDeducted) || 0));
        setCreateMsg(
          `สร้างรหัส ${data.code?.code || ""} แล้ว — แดง ${ra} ต่อการแลก · รหัสเดียวแลกได้ ${mu} ครั้ง (แจกได้หลายคน) · หักแดงจากคุณ ${ded.toLocaleString("th-TH")} ดวง`
        );
      } else {
        const n = Math.min(100, Math.max(1, Math.floor(Number(codeCount) || 1)));
        data = await apiCreateRoomRedGiftCode(token, {
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
      }
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">รหัสหัวใจแดงห้องเกม</h3>
      <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2 text-sm text-rose-950">
        <p className="font-semibold text-rose-900">หัวใจแดงทั้งหมด (สำหรับแจกเล่นเกม)</p>
        <p className="mt-1 tabular-nums text-lg font-bold text-red-800">
          {giveawayBal.toLocaleString("th-TH")} ดวง
        </p>
      </div>

      <form onSubmit={onCreate} className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={multiUseSingleCode}
            onChange={(e) => setMultiUseSingleCode(e.target.checked)}
            className="mt-1"
          />
          <span>
            <strong>โหมดพิเศษ:</strong> รหัสเดียว แต่หลายคนแลกได้ (กรอกจำนวนครั้ง) — คนละครั้งให้ใช้ช่อง「จำนวนรหัส」ด้านล่างแทน
          </span>
        </label>

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
          {multiUseSingleCode ? (
            <div>
              <label className="block text-xs font-medium text-slate-600">
                รหัสเดียวนี้แลกได้กี่ครั้ง (หลายคน)
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          ) : (
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
          )}
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
          >
            {createBusy ? "กำลังสร้าง…" : "สร้างรหัส"}
          </button>
        </div>
        <p className="text-xs text-amber-900/90">
          คาดว่าจะหักรวม <strong>{estimatedRedDeduction.toLocaleString("th-TH")} ดวง</strong> (แดงแจกก่อน
          แล้วจึงแดงเล่นได้) — ถ้ารวมไม่พอระบบจะไม่สร้างรหัส
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
              กดลบเพื่อเอารหัสเก่าออกและคืนแดงส่วนที่ยังไม่ถูกแลก
            </span>
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {codes.length > 1 ? (
              <button
                type="button"
                disabled={deleteAllBusy || listLoading}
                onClick={() => void onDeleteAllCodes()}
                className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
              >
                {deleteAllBusy ? "กำลังลบทั้งหมด…" : "ลบทั้งหมด"}
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
                    {c.expired ? " · หมดอายุ" : ""}
                    {c.exhausted ? " · เต็ม" : ""}
                  </span>
                  <button
                    type="button"
                    disabled={Boolean(deleteBusyId) || deleteAllBusy}
                    onClick={() => void onDeleteCode(c)}
                    className="rounded border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleteBusyId === String(c.id) ? "กำลังลบ…" : "ลบ"}
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
