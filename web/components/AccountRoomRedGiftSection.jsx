"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiCreateRoomRedGiftCode,
  apiListRoomRedGiftCodes,
  apiRedeemRoomRedGiftCode,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountRoomRedGiftSection() {
  const { refresh } = useMemberAuth();
  const [codes, setCodes] = useState([]);
  const [listErr, setListErr] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [redAmount, setRedAmount] = useState(1);
  const [maxUses, setMaxUses] = useState(1);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");

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

  async function onCreate(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setCreateBusy(true);
    setCreateMsg("");
    try {
      const data = await apiCreateRoomRedGiftCode(token, {
        redAmount: Math.max(1, Math.floor(Number(redAmount) || 1)),
        maxUses: Math.max(1, Math.floor(Number(maxUses) || 1))
      });
      setCreateMsg(`สร้างรหัส ${data.code?.code || ""} แล้ว — แจกให้ผู้เล่นกรอกด้านล่าง`);
      await loadCodes();
    } catch (ex) {
      setCreateMsg(ex?.message || "สร้างไม่สำเร็จ");
    } finally {
      setCreateBusy(false);
    }
  }

  async function onRedeem(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setRedeemBusy(true);
    setRedeemMsg("");
    try {
      const data = await apiRedeemRoomRedGiftCode(token, redeemCode.trim());
      if (data.user) {
        /* sync ยอดในบริบทสมาชิก */
        await refresh();
      }
      setRedeemMsg(
        `แลกสำเร็จ — ได้หัวใจแดงห้อง ${data.redAdded || 0} ดวง · ใช้เล่นได้เฉพาะเกมของเจ้าของห้องที่ออกรหัส หรือเกมที่เปิดตัวเลือกรับแดงจากรหัสห้อง`
      );
      setRedeemCode("");
      await loadCodes();
    } catch (ex) {
      setRedeemMsg(ex?.message || "แลกไม่สำเร็จ");
    } finally {
      setRedeemBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">รหัสหัวใจแดงห้องเกม</h3>
      <p className="mt-2 text-sm text-slate-600">
        <strong>เจ้าของห้อง:</strong> สร้างรหัสแจกผู้เล่น — ผู้เล่นแลกในช่องด้านล่าง หัวใจแดงจากรหัสจะใช้เล่นได้เฉพาะ
        <strong> เกมของคุณ</strong> หรือเกมที่ผู้ดูแลเปิดตัวเลือก「รับแดงจากรหัสห้อง」ในหน้าตั้งค่าเกม
      </p>

      <form onSubmit={onCreate} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">แดงต่อการแลก 1 ครั้ง</label>
          <input
            type="number"
            min={1}
            value={redAmount}
            onChange={(e) => setRedAmount(e.target.value)}
            className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">จำนวนครั้งที่แลกได้ทั้งรหัส</label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={createBusy}
          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
        >
          {createBusy ? "กำลังสร้าง…" : "สร้างรหัสใหม่"}
        </button>
      </form>
      {createMsg ? (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          {createMsg}
        </p>
      ) : null}

      <div className="mt-6 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-semibold text-slate-800">แลกรหัส (ผู้เล่น)</h4>
        <form onSubmit={onRedeem} className="mt-2 flex flex-wrap items-end gap-2">
          <input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder="กรอกรหัส เช่น RABC12DE3"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
          />
          <button
            type="submit"
            disabled={redeemBusy || !redeemCode.trim()}
            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
          >
            {redeemBusy ? "กำลังแลก…" : "แลกรหัส"}
          </button>
        </form>
        {redeemMsg ? (
          <p className="mt-2 text-sm text-slate-700" role="status">
            {redeemMsg}
          </p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800">รหัสที่คุณสร้าง</h4>
          <button
            type="button"
            onClick={() => loadCodes()}
            className="text-xs font-medium text-brand-800 underline"
          >
            รีเฟรช
          </button>
        </div>
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
                <span className="text-xs text-slate-600">
                  แดง {c.redAmount} · ใช้แล้ว {c.usesCount}/{c.maxUses}
                  {c.expired ? " · หมดอายุ" : ""}
                  {c.exhausted ? " · เต็ม" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
