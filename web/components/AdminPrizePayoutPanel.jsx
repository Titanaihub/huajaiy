"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCentralGamesList,
  apiAdminCentralPrizeAwards,
  apiAdminCentralPrizeWithdrawalData,
  apiAdminResolvePrizeWithdrawal
} from "../lib/rolesApi";

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
    return d.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
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

function displayGameCode(a) {
  const c = a.gameCode != null ? String(a.gameCode).trim() : "";
  if (c) return c;
  const id = String(a.gameId || "").replace(/-/g, "");
  if (id.length >= 8) return `…${id.slice(-8)}`;
  return a.gameId ? String(a.gameId).slice(0, 8) + "…" : "—";
}

function eventTimeMs(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function buildRecipientDetailRows(items, userWithdrawals) {
  const wds = Array.isArray(userWithdrawals) ? userWithdrawals : [];
  const approved = wds.filter((w) => String(w.status) === "approved");
  const events = [];
  for (const a of items) {
    events.push({ kind: "win", atMs: eventTimeMs(a.wonAt), award: a });
  }
  for (const w of approved) {
    events.push({
      kind: "withdraw",
      atMs: eventTimeMs(w.resolvedAt || w.createdAt),
      withdrawal: w
    });
  }
  events.sort((x, y) => {
    if (x.atMs !== y.atMs) return x.atMs - y.atMs;
    if (x.kind !== y.kind) return x.kind === "win" ? -1 : 1;
    return 0;
  });
  let run = 0;
  return events.map((e) => {
    if (e.kind === "win") {
      const a = e.award;
      const cashAmt = a.prizeCategory === "cash" ? parseCashBaht(a) : 0;
      if (a.prizeCategory === "cash") run += cashAmt;
      return {
        kind: "win",
        key: `win-${a.id}`,
        award: a,
        cashAmt: a.prizeCategory === "cash" ? cashAmt : null,
        runningCash: run,
        atLabel: a.wonAt
      };
    }
    const w = e.withdrawal;
    const amt = Math.max(0, Math.floor(Number(w.amountThb) || 0));
    run -= amt;
    return {
      kind: "withdraw",
      key: `wd-${w.id}`,
      withdrawal: w,
      cashAmt: -amt,
      runningCash: run,
      atLabel: w.resolvedAt || w.createdAt,
      creatorUsername: w.creatorUsername || ""
    };
  });
}

function sumPendingForUser(userId, withdrawals) {
  return (Array.isArray(withdrawals) ? withdrawals : [])
    .filter(
      (w) =>
        String(w.requesterUserId) === String(userId) && String(w.status) === "pending"
    )
    .reduce((s, w) => s + Math.max(0, Math.floor(Number(w.amountThb) || 0)), 0);
}

function groupAwardsByRecipient(list) {
  const map = new Map();
  for (const a of list) {
    const uid = a.winnerUserId || "";
    if (!map.has(uid)) {
      map.set(uid, {
        winnerUserId: uid,
        winnerUsername: a.winnerUsername,
        winnerFirstName: a.winnerFirstName,
        winnerLastName: a.winnerLastName,
        items: []
      });
    }
    map.get(uid).items.push(a);
  }
  for (const g of map.values()) {
    g.items.sort((a, b) => new Date(a.wonAt) - new Date(b.wonAt));
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    const la = a.items[a.items.length - 1];
    const lb = b.items[b.items.length - 1];
    const ta = la?.wonAt ? new Date(la.wonAt).getTime() : 0;
    const tb = lb?.wonAt ? new Date(lb.wonAt).getTime() : 0;
    return tb - ta;
  });
  return groups;
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
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  const compressed = await compressImage(file);
  const uploadFile = new File([compressed], `${Date.now()}.jpg`, {
    type: "image/jpeg"
  });
  body.append("image", uploadFile);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "อัปโหลดสลิปไม่สำเร็จ");
  }
  return data.publicUrl;
}

function PendingWithdrawalRow({ row, token, onDone }) {
  const [slipFile, setSlipFile] = useState(null);
  const [slipUrl, setSlipUrl] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleApprove() {
    setErr("");
    setBusy(true);
    try {
      let url = slipUrl.trim();
      if (slipFile) {
        url = await uploadSlipFile(slipFile);
        setSlipUrl(url);
      }
      await apiAdminResolvePrizeWithdrawal(token, row.id, {
        action: "approve",
        note: "",
        transferSlipUrl: url || undefined
      });
      await onDone();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setErr("");
    const note = rejectNote.trim();
    if (!note) {
      setErr("กรุณากรอกหมายเหตุเมื่อยกเลิกการถอน");
      return;
    }
    setBusy(true);
    try {
      await apiAdminResolvePrizeWithdrawal(token, row.id, {
        action: "reject",
        note
      });
      setRejectOpen(false);
      setRejectNote("");
      await onDone();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const creator = row.creatorUsername ? `@${row.creatorUsername}` : "—";

  return (
    <tr className="align-top border-b border-slate-100 text-sm text-slate-800">
      <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{formatWonAt(row.createdAt)}</td>
      <td className="px-2 py-2.5">
        <span className="font-medium text-slate-900">{row.requesterDisplayName || "—"}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          ถอนจาก {creator} · บัญชี {row.accountHolderName}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 font-semibold tabular-nums text-emerald-900">
        {formatBahtTotal(row.amountThb)} ฿
      </td>
      <td className="px-2 py-2.5 font-mono text-xs">{row.accountNumber}</td>
      <td className="px-2 py-2.5">{row.bankName}</td>
      <td className="px-2 py-2.5">
        <input
          type="file"
          accept="image/*"
          className="max-w-[140px] text-xs"
          disabled={busy}
          onChange={(e) => {
            setSlipFile(e.target.files?.[0] || null);
            setErr("");
          }}
        />
        {slipUrl ? (
          <a
            href={slipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs font-medium text-brand-800 underline"
          >
            ดูสลิปที่แนบแล้ว
          </a>
        ) : null}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleApprove()}
            className="rounded-lg bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "…" : "อนุมัติ"}
          </button>
          {!rejectOpen ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              ยกเลิกการถอน
            </button>
          ) : (
            <div className="space-y-1">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value.slice(0, 500))}
                placeholder="หมายเหตุ (บังคับ) เช่น ชื่อไม่ตรงบัญชี"
                rows={2}
                className="w-full min-w-[160px] rounded border border-slate-300 px-2 py-1 text-xs"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleReject()}
                  className="rounded bg-rose-700 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  ยืนยันยกเลิก
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRejectOpen(false);
                    setRejectNote("");
                  }}
                  className="text-[11px] text-slate-600 underline"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}
          {err ? <p className="text-[11px] text-red-600">{err}</p> : null}
        </div>
      </td>
    </tr>
  );
}

function RewardRecipientCard({ group, withdrawals, reserveMap }) {
  const { winnerUserId, items } = group;
  const w = winnerLabel({
    winnerUsername: group.winnerUsername,
    winnerFirstName: group.winnerFirstName,
    winnerLastName: group.winnerLastName
  });
  const cashTotal = items.reduce((s, a) => s + parseCashBaht(a), 0);
  const winCount = items.length;
  const res = reserveMap.get(String(winnerUserId)) || {
    approvedBaht: 0,
    pendingBaht: 0
  };
  const balance = Math.max(0, cashTotal - res.approvedBaht - res.pendingBaht);

  const userWds = useMemo(
    () =>
      (Array.isArray(withdrawals) ? withdrawals : []).filter(
        (x) => String(x.requesterUserId) === String(winnerUserId)
      ),
    [withdrawals, winnerUserId]
  );

  const detailRows = useMemo(() => buildRecipientDetailRows(items, userWds), [items, userWds]);
  const pendingHold = sumPendingForUser(winnerUserId, withdrawals);
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="px-3 py-2.5">ชื่อ–นามสกุล (ผู้ได้รับรางวัล)</th>
              <th className="px-3 py-2.5">เงินรางวัล (รวมเงินสด)</th>
              <th className="px-3 py-2.5">ชนะกี่ครั้ง</th>
              <th className="px-3 py-2.5">ยอดถอน</th>
              <th className="px-3 py-2.5">ยอดคงเหลือ</th>
              <th className="px-3 py-2.5">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-3">
                <p className="font-semibold text-slate-900">{w.primary}</p>
                {w.secondary ? <p className="text-xs text-slate-600">{w.secondary}</p> : null}
              </td>
              <td className="px-3 py-3 font-bold tabular-nums text-slate-900">
                {formatBahtTotal(cashTotal)} บาท
              </td>
              <td className="px-3 py-3 tabular-nums">{winCount} ครั้ง</td>
              <td className="px-3 py-3 tabular-nums text-slate-800">
                {formatBahtTotal(res.approvedBaht)} บาท
              </td>
              <td className="px-3 py-3 font-semibold tabular-nums text-emerald-900">
                {formatBahtTotal(balance)} บาท
              </td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="text-sm font-semibold text-brand-800 underline"
                  aria-expanded={open}
                >
                  {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {pendingHold > 0 ? (
        <p className="border-t border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          มีคำขอถอนรอดำเนินการ{" "}
          <span className="font-semibold tabular-nums">{formatBahtTotal(pendingHold)} บาท</span>
        </p>
      ) : null}

      {open ? (
        <div className="border-t border-slate-100 p-3">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[900px] w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="whitespace-nowrap px-2 py-2">วันที่</th>
                  <th className="whitespace-nowrap px-2 py-2">ผู้สร้างเกม</th>
                  <th className="whitespace-nowrap px-2 py-2">รหัสเกม</th>
                  <th className="px-2 py-2">ชื่อเกม</th>
                  <th className="whitespace-nowrap px-2 py-2">เงินรางวัล</th>
                  <th className="whitespace-nowrap px-2 py-2">ยอดคงเหลือ</th>
                  <th className="px-2 py-2">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailRows.map((row) =>
                  row.kind === "win" ? (
                    <tr key={row.key} className="bg-white">
                      <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                        {formatWonAt(row.atLabel)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {row.award.creatorUsername ? (
                          <span className="text-brand-800">@{row.award.creatorUsername}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-slate-600">
                        {displayGameCode(row.award)}
                      </td>
                      <td className="px-2 py-2 text-slate-800">{row.award.gameTitle}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                        {row.cashAmt != null ? (
                          <span>{formatBahtTotal(row.cashAmt)} บาท</span>
                        ) : (
                          <span className="text-slate-600">{prizeLine(row.award)}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-semibold tabular-nums">
                        {formatBahtTotal(row.runningCash)} บาท
                      </td>
                      <td className="px-2 py-2 text-slate-600">
                        ชุดที่ {row.award.setIndex + 1} · {prizeLine(row.award)}
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.key} className="bg-rose-50/50">
                      <td className="whitespace-nowrap px-2 py-2 text-slate-700">
                        {formatWonAt(row.atLabel)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-rose-900">
                        {row.creatorUsername ? `@${row.creatorUsername}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-500">—</td>
                      <td className="px-2 py-2 font-medium text-rose-900">ถอนเงิน</td>
                      <td className="whitespace-nowrap px-2 py-2 font-medium tabular-nums text-rose-800">
                        −{formatBahtTotal(Math.abs(row.cashAmt))} บาท
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-semibold tabular-nums">
                        {formatBahtTotal(row.runningCash)} บาท
                      </td>
                      <td className="px-2 py-2 text-slate-600">
                        ถอนเงิน · {row.withdrawal.accountNumber} {row.withdrawal.bankName}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function AdminPrizePayoutPanel() {
  const [tab, setTab] = useState("withdrawals");
  const [awards, setAwards] = useState([]);
  const [games, setGames] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [reserveTotals, setReserveTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [gameFilter, setGameFilter] = useState("");

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setErr("หมดเซสชัน — ล็อกอินใหม่");
      setAwards([]);
      setPendingWithdrawals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const [awData, gData, wdData] = await Promise.all([
        apiAdminCentralPrizeAwards(token, { limit: 1500 }),
        apiAdminCentralGamesList(token),
        apiAdminCentralPrizeWithdrawalData(token, { withdrawalsLimit: 8000 })
      ]);
      setAwards(Array.isArray(awData.awards) ? awData.awards : []);
      setGames(Array.isArray(gData.games) ? gData.games : []);
      setPendingWithdrawals(
        Array.isArray(wdData.pendingWithdrawals) ? wdData.pendingWithdrawals : []
      );
      setAllWithdrawals(Array.isArray(wdData.withdrawals) ? wdData.withdrawals : []);
      setReserveTotals(Array.isArray(wdData.reserveTotals) ? wdData.reserveTotals : []);
    } catch (e) {
      setErr(e.message || String(e));
      setAwards([]);
      setPendingWithdrawals([]);
      setAllWithdrawals([]);
      setReserveTotals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const token = typeof window !== "undefined" ? getMemberToken() : null;

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
        a.creatorUsername,
        prizeLine(a)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [awards, q, gameFilter]);

  const recipientGroups = useMemo(() => groupAwardsByRecipient(filtered), [filtered]);

  const reserveMap = useMemo(() => {
    const m = new Map();
    for (const t of reserveTotals) {
      m.set(String(t.requesterUserId), {
        approvedBaht: t.approvedBaht,
        pendingBaht: t.pendingBaht
      });
    }
    return m;
  }, [reserveTotals]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("withdrawals")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "withdrawals"
              ? "bg-brand-100 text-brand-900"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          1. รายการรอถอน
        </button>
        <button
          type="button"
          onClick={() => setTab("rewards")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "rewards"
              ? "bg-brand-100 text-brand-900"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          2. รายละเอียดรางวัล
        </button>
      </div>

      {tab === "rewards" ? (
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
            <label className="block text-xs font-medium text-slate-600">
              ค้นหา (ชื่อเกม รหัส ยูสเซอร์ ชื่อ รางวัล ผู้สร้าง)
            </label>
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
      ) : (
        <p className="text-sm text-slate-600">
          อนุมัติหลังโอนเงินแล้ว — แนบสลิปได้ถ้าต้องการ · ยกเลิกต้องกรอกหมายเหตุ
        </p>
      )}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p className="text-sm text-slate-500">กำลังโหลด…</p> : null}

      {!loading && !err && tab === "withdrawals" ? (
        pendingWithdrawals.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            ไม่มีรายการถอนที่รอดำเนินการ
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[960px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-2 py-2.5">วันที่ขอถอน</th>
                  <th className="px-2 py-2.5">ชื่อ–นามสกุล</th>
                  <th className="px-2 py-2.5">จำนวนเงิน</th>
                  <th className="px-2 py-2.5">หมายเลขบัญชี</th>
                  <th className="px-2 py-2.5">ชื่อธนาคาร</th>
                  <th className="px-2 py-2.5">แนบสลิปโอน</th>
                  <th className="px-2 py-2.5">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {pendingWithdrawals.map((row) => (
                  <PendingWithdrawalRow
                    key={row.id}
                    row={row}
                    token={token}
                    onDone={load}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {!loading && !err && tab === "rewards" ? (
        <>
          <p className="text-xs text-slate-600">
            สรุปตามผู้ได้รับรางวัล · ยอดถอน = เงินที่อนุมัติถอนแล้ว · ยอดคงเหลือ = เงินรางวัลเงินสดรวม − ถอนแล้ว − รอถอน
          </p>
          {recipientGroups.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              ยังไม่มีรายการรางวัลที่ตรงตัวกรอง
            </p>
          ) : (
            <ul className="space-y-3">
              {recipientGroups.map((g) => (
                <RewardRecipientCard
                  key={g.winnerUserId}
                  group={g}
                  withdrawals={allWithdrawals}
                  reserveMap={reserveMap}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
