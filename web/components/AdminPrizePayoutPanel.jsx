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

/** ดึงตัวเลขจำนวนเงินจากฟิลด์รางวัลเงินสด */
function parseCashBaht(a) {
  if (a.prizeCategory !== "cash") return 0;
  const raw = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(" ");
  const m = String(raw).replace(/,/g, "").match(/[\d]+(?:\.[\d]+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : 0;
}

function formatBahtTotal(n) {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (Number.isInteger(n)) return n.toLocaleString("th-TH");
  return n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

/** จัดกลุ่มตามผู้ได้รับ + เกม — สรุปยอดเหมือน「รางวัลของฉัน」แต่แยกรายคน */
function groupAwardsByRecipientAndGame(list) {
  const map = new Map();
  for (const a of list) {
    const uid = a.winnerUserId || "";
    const gid = a.gameId || "";
    const key = `${uid}::${gid}`;
    if (!map.has(key)) {
      map.set(key, {
        winnerUserId: uid,
        gameId: gid,
        gameTitle: a.gameTitle,
        gameCode: a.gameCode || null,
        winnerUsername: a.winnerUsername,
        winnerFirstName: a.winnerFirstName,
        winnerLastName: a.winnerLastName,
        items: []
      });
    }
    const g = map.get(key);
    g.items.push(a);
  }
  for (const g of map.values()) {
    g.items.sort((x, y) => new Date(y.wonAt) - new Date(x.wonAt));
    const withCode = g.items.find((x) => x.gameCode);
    if (withCode?.gameCode) g.gameCode = withCode.gameCode;
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    const ta = a.items[0]?.wonAt ? new Date(a.items[0].wonAt).getTime() : 0;
    const tb = b.items[0]?.wonAt ? new Date(b.items[0].wonAt).getTime() : 0;
    return tb - ta;
  });
  return groups;
}

function groupStatusBadge(items) {
  const statuses = [...new Set(items.map((x) => String(x.status || "recorded").toLowerCase()))];
  if (statuses.length === 1) return statusThai(statuses[0]);
  return { text: "หลายสถานะ", cls: "bg-slate-200 text-slate-800" };
}

function AdminPayoutGroupCard({ group }) {
  const {
    gameId,
    gameTitle,
    gameCode,
    winnerUsername,
    winnerFirstName,
    winnerLastName,
    items
  } = group;
  const w = winnerLabel({
    winnerUsername,
    winnerFirstName,
    winnerLastName
  });
  const cashItems = items.filter((a) => a.prizeCategory === "cash");
  const nonCashItems = items.filter((a) => a.prizeCategory !== "cash");
  const cashTotal = cashItems.reduce((s, a) => s + parseCashBaht(a), 0);
  const st = groupStatusBadge(items);
  const [open, setOpen] = useState(false);

  let nonCashSummary = null;
  if (nonCashItems.length > 0) {
    const byCat = nonCashItems.reduce((acc, a) => {
      const k = a.prizeCategory || "other";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    nonCashSummary = Object.entries(byCat)
      .map(([cat, n]) => `${CAT_LABEL[cat] || "รางวัล"} ${n} ครั้ง`)
      .join(" · ");
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{w.primary}</p>
          {w.secondary ? <p className="mt-0.5 text-sm text-slate-600">{w.secondary}</p> : null}
          <p className="mt-2 font-medium text-slate-900">{gameTitle}</p>
          <p className="mt-0.5 font-mono text-xs text-slate-600">
            รหัสเกม {gameCode && String(gameCode).trim() ? gameCode : "—"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}
        >
          {st.text}
        </span>
      </div>

      {cashItems.length > 0 ? (
        <p className="mt-3 text-sm text-slate-800">
          เงินสดรวม{" "}
          <span className="font-bold tabular-nums text-slate-900">{formatBahtTotal(cashTotal)}</span>{" "}
          บาท
          {cashItems.length > 1 ? (
            <span className="font-normal text-slate-600"> · ชนะ {cashItems.length} ครั้ง</span>
          ) : null}
        </p>
      ) : null}

      {nonCashItems.length > 0 ? (
        <p className="mt-1.5 text-sm text-slate-700">{nonCashSummary}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
          aria-expanded={open}
        >
          {open ? "ซ่อนรายละเอียดแต่ละครั้ง" : "ดูรายละเอียดแต่ละครั้ง"}
        </button>
        <Link
          href={`/game/${encodeURIComponent(gameId)}`}
          className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
        >
          เปิดหน้าเกมนี้
        </Link>
      </div>

      {open ? (
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-left">
          {items.map((a) => {
            const rowSt = statusThai(a.status);
            return (
              <li
                key={a.id}
                className="rounded-lg bg-slate-50/90 px-3 py-2.5 text-sm text-slate-800"
              >
                <p className="text-slate-900">{prizeLine(a)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  ชุดที่ {a.setIndex + 1} · {formatWonAt(a.wonAt)}
                </p>
                <p className="mt-1.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${rowSt.cls}`}
                  >
                    {rowSt.text}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
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

  const groups = useMemo(
    () => groupAwardsByRecipientAndGame(filtered),
    [filtered]
  );

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
          แสดง <strong>{groups.length}</strong> กลุ่ม
          {filtered.length !== groups.length ? (
            <>
              {" "}
              (<strong>{filtered.length}</strong> ครั้งที่ชนะ)
            </>
          ) : null}
          {gameFilter || q.trim() ? ` · จากทั้งหมด ${awards.length} ครั้งที่ชนะในระบบ` : null}
          {" · "}
          สรุปตาม<strong>ผู้ได้รับ + เกม</strong> — กด「ดูรายละเอียดแต่ละครั้ง」เพื่อดูวันเวลาที่ชนะ
          {" · "}
          สถานะ「รอจ่าย」หมายถึงระบบบันทึกการชนะแล้ว — ใช้รายการนี้ติดตามการโอน/ส่งมอบจริง
        </p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          ยังไม่มีรายการรางวัลที่ต้องติดตาม
        </p>
      ) : null}

      {groups.length > 0 ? (
        <ul className="space-y-3">
          {groups.map((g) => (
            <AdminPayoutGroupCard
              key={`${g.winnerUserId}::${g.gameId}`}
              group={g}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
