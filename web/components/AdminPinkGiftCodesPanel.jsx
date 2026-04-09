"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCancelPinkGiftCode,
  apiAdminCreatePinkGiftCodes,
  apiAdminPinkGiftCodes
} from "../lib/rolesApi";

export default function AdminPinkGiftCodesPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [pinkAmount, setPinkAmount] = useState("10");
  const [codeCount, setCodeCount] = useState("1");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [createMsg, setCreateMsg] = useState("");

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const data = await apiAdminPinkGiftCodes(token);
      setList(data.codes || []);
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

  async function handleCreate(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setCreateMsg("");
    const pa = Math.max(1, Math.floor(Number(pinkAmount) || 0));
    const cc = Math.min(100, Math.max(1, Math.floor(Number(codeCount) || 1)));
    const mu = Math.max(1, Math.floor(Number(maxUses) || 1));
    try {
      const data = await apiAdminCreatePinkGiftCodes(token, {
        pinkAmount: pa,
        codeCount: cc,
        maxUses: mu,
        expiresAt: expiresAt.trim() ? expiresAt.trim() : null,
        note: note.trim() ? note.trim() : null
      });
      const codes = data.codes || [];
      setCreateMsg(
        codes.length > 1
          ? `สร้างแล้ว ${codes.length} รหัส (ตัวอย่าง: ${codes[0]?.code || "—"})`
          : `สร้างแล้ว: ${codes[0]?.code || data.code?.code || "—"}`
      );
      await load();
    } catch (ex) {
      setCreateMsg(ex.message || String(ex));
    }
  }

  async function handleCancel(id) {
    const token = getMemberToken();
    if (!token || !id) return;
    if (!window.confirm("ยกเลิกรหัสนี้? สมาชิกจะแลกไม่ได้อีก")) return;
    setBusyId(id);
    try {
      await apiAdminCancelPinkGiftCode(token, id);
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-hui-body">
        ออกรหัสขึ้นต้นด้วย <strong className="font-semibold">P</strong> สมาชิกแลกได้ที่เมนู
        ประวัติหัวใจชมพู — ไม่หักยอดจากบัญชีแอดมิน (แจกจากระบบโปรโมชัน)
      </p>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-hui-border bg-hui-pageTop/90 p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-hui-body">สร้างรหัสใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-hui-muted">หัวใจชมพูต่อการแลก (ดวง)</label>
            <input
              type="number"
              min={1}
              max={500000}
              value={pinkAmount}
              onChange={(ev) => setPinkAmount(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-hui-muted">จำนวนรหัส (สูงสุด 100)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={codeCount}
              onChange={(ev) => setCodeCount(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-hui-muted">
              จำนวนครั้งต่อรหัส (ถ้าสร้างหลายรหัส ระบบตั้งเป็น 1 ครั้งต่อรหัสอัตโนมัติ)
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={maxUses}
              onChange={(ev) => setMaxUses(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-hui-muted">หมดอายุ (ไม่บังคับ)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(ev) => setExpiresAt(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-hui-muted">หมายเหตุภายใน (ไม่บังคับ)</label>
            <input
              type="text"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              placeholder="เช่น แคมเปญ LINE เดือน 4"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          สร้างรหัส
        </button>
        {createMsg ? <p className="text-sm text-hui-body">{createMsg}</p> : null}
      </form>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {loading ? (
        <p className="text-sm text-hui-muted">กำลังโหลด…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-hui-muted">ยังไม่มีรหัส</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hui-border">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hui-border bg-hui-pageTop/80">
                <th className="px-3 py-2">รหัส</th>
                <th className="px-3 py-2">ชมพู</th>
                <th className="px-3 py-2">ใช้แล้ว / สูงสุด</th>
                <th className="px-3 py-2">สมาชิกที่กรอกรหัส / เวลาล่าสุด</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2">สร้างเมื่อ</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const cancelled = Boolean(row.cancelled);
                const exhausted = Boolean(row.exhausted);
                const expired = Boolean(row.expired);
                let st = "พร้อมใช้";
                if (cancelled) st = "ยกเลิกแล้ว";
                else if (expired) st = "หมดอายุ";
                else if (exhausted) st = "ใช้ครบแล้ว";
                const redeemedBy = String(row.redeemedByUsernames || "")
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
                  .join(", ");
                const lastRedeemedAtText = row.lastRedeemedAt
                  ? new Date(row.lastRedeemedAt).toLocaleString("th-TH")
                  : "";
                return (
                  <tr key={row.id} className="border-b border-hui-border/70">
                    <td className="px-3 py-2 font-mono font-semibold">{row.code}</td>
                    <td className="px-3 py-2 tabular-nums">{row.pinkAmount}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.usesCount} / {row.maxUses}
                    </td>
                    <td className="px-3 py-2 text-hui-body">
                      {redeemedBy || (Number(row.usesCount) > 0 ? "มีการใช้แล้ว" : "—")}
                      {lastRedeemedAtText ? (
                        <div className="text-xs text-hui-muted">ล่าสุด: {lastRedeemedAtText}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{st}</td>
                    <td className="px-3 py-2 text-hui-muted">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("th-TH")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!cancelled && !exhausted && !expired ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleCancel(row.id)}
                          className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
