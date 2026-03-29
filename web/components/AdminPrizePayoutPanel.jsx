"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiAdminCentralGamesList, apiAdminCentralPrizeAwards } from "../lib/rolesApi";
import { getMemberToken } from "../lib/memberApi";

const CAT_LABEL = {
  cash: "เงินสด",
  item: "สิ่งของ",
  voucher: "บัตรกำนัล",
  none: "ไม่มีรางวัล"
};

function prizeLine(a) {
  const cat = CAT_LABEL[a.prizeCategory] || "รางวัล";
  const title = a.prizeTitle?.trim();
  const val = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(" ").trim();
  if (title && val) return `${title} (${cat}) — ${val}`;
  if (title) return `${title} (${cat})`;
  if (val) return `${cat} — ${val}`;
  return cat;
}

function formatWonAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function winnerLabel(a) {
  const name = `${a.winnerFirstName || ""} ${a.winnerLastName || ""}`.trim();
  const u = a.winnerUsername ? `@${a.winnerUsername}` : "—";
  if (name) return { primary: name, secondary: u };
  return { primary: u, secondary: null };
}

function statusThai(status) {
  const s = String(status || "recorded").toLowerCase();
  if (s === "paid" || s === "completed") return { text: "จ่ายแล้ว", cls: "bg-emerald-100 text-emerald-900" };
  if (s === "recorded") return { text: "รอจ่าย / บันทึกแล้ว", cls: "bg-amber-100 text-amber-950" };
  return { text: status || "—", cls: "bg-slate-100 text-slate-800" };
}

export default function AdminPrizePayoutPanel() {
  const [awards, setAwards] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [gameFilter, setGameFilter] = useState("");

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setErr("หมดเซสชัน — ล็อกอินใหม่");
      setAwards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const [awData, gData] = await Promise.all([
        apiAdminCentralPrizeAwards(token, { limit: 1500 }),
        apiAdminCentralGamesList(token)
      ]);
      setAwards(Array.isArray(awData.awards) ? awData.awards : []);
      setGames(Array.isArray(gData.games) ? gData.games : []);
    } catch (e) {
      setErr(e.message || String(e));
      setAwards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = awards;
    if (gameFilter) {
      list = list.filter((a) => a.gameId === gameFilter);
    }
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((a) => {
      const blob = [
        a.gameTitle,
        a.gameCode,
        a.winnerUsername,
        a.winnerFirstName,
        a.winnerLastName,
        prizeLine(a)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [awards, q, gameFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-medium text-slate-600">กรองตามเกม</label>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">ทุกเกม</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title || g.id}
                {g.gameCode ? ` (${g.gameCode})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-[2]">
          <label className="block text-xs font-medium text-slate-600">ค้นหา (ชื่อเกม รหัส ยูสเซอร์ ชื่อ รางวัล)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="พิมพ์คำค้น…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          รีเฟรช
        </button>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p className="text-sm text-slate-500">กำลังโหลด…</p> : null}

      {!loading && !err ? (
        <p className="text-xs text-slate-600">
          แสดง <strong>{filtered.length}</strong> รายการ
          {gameFilter || q.trim() ? ` (จากทั้งหมด ${awards.length})` : null}
          {" · "}
          สถานะ「รอจ่าย」หมายถึงระบบบันทึกการชนะแล้ว — ใช้รายการนี้ติดตามการโอน/ส่งมอบจริง
        </p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          ยังไม่มีรายการรางวัลที่ต้องติดตาม
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2 whitespace-nowrap">วันที่ชนะ</th>
                <th className="px-3 py-2">เกม</th>
                <th className="px-3 py-2 whitespace-nowrap">รหัสเกม</th>
                <th className="px-3 py-2">ผู้ได้รับ</th>
                <th className="px-3 py-2">รางวัล</th>
                <th className="px-3 py-2 whitespace-nowrap">สถานะ</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">ลิงก์</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const w = winnerLabel(a);
                const st = statusThai(a.status);
                return (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2 align-top text-xs text-slate-700 whitespace-nowrap">
                      {formatWonAt(a.wonAt)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium text-slate-900">{a.gameTitle}</span>
                      <p className="mt-0.5 text-[10px] text-slate-500">ชุด {a.setIndex + 1}</p>
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs text-slate-700 whitespace-nowrap">
                      {a.gameCode || "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-medium text-slate-900">{w.primary}</span>
                      {w.secondary ? (
                        <p className="mt-0.5 text-xs text-slate-600">{w.secondary}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-800">{prizeLine(a)}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                        {st.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                      <Link
                        href={`/game/${encodeURIComponent(a.gameId)}`}
                        className="text-xs font-semibold text-brand-800 hover:underline"
                      >
                        เปิดเกม
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
