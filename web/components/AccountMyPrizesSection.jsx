"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiGetMyCentralPrizeAwards,
  apiGetMyPrizeWithdrawals,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

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

/** ดึงตัวเลขจำนวนเงินจากฟิลด์รางวัลเงินสด */
function parseCashBaht(a) {
  if (a.prizeCategory !== "cash") return 0;
  const raw = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(" ");
  const m = String(raw).replace(/,/g, "").match(/[\d]+(?:\.[\d]+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : 0;
}

function formatBaht(n) {
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

function groupAwardsByCreator(list) {
  const map = new Map();
  for (const a of list) {
    const key = (a.creatorUsername || "").trim() || "_unknown";
    if (!map.has(key)) {
      map.set(key, {
        creatorKey: key,
        creatorUsername: (a.creatorUsername || "").trim(),
        items: []
      });
    }
    map.get(key).items.push(a);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.items.sort((x, y) => new Date(y.wonAt) - new Date(x.wonAt));
  }
  groups.sort((a, b) => {
    const ta = a.items[0]?.wonAt ? new Date(a.items[0].wonAt).getTime() : 0;
    const tb = b.items[0]?.wonAt ? new Date(b.items[0].wonAt).getTime() : 0;
    return tb - ta;
  });
  return groups;
}

function eventTimeMs(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * เรียงจากเก่าไปใหม่ — สะสมยอดเงินสดจากการชนะ หักเมื่อมีการถอนที่ผู้สร้างอนุมัติแล้ว
 * (คำขอที่ยัง pending ไม่แสดงเป็นแถว แต่จะหักจากยอดคงเหลือปัจจุบันแยกต่างหาก)
 */
function buildMergedLedgerRows(items, withdrawalsForCreator) {
  const wds = Array.isArray(withdrawalsForCreator) ? withdrawalsForCreator : [];
  const approved = wds.filter((w) => String(w.status) === "approved");
  const events = [];

  for (const a of items) {
    events.push({ kind: "win", atMs: eventTimeMs(a.wonAt), award: a });
  }
  for (const w of approved) {
    const at = w.resolvedAt || w.createdAt;
    events.push({ kind: "withdraw", atMs: eventTimeMs(at), withdrawal: w });
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
      atLabel: w.resolvedAt || w.createdAt
    };
  });
}

function sumPendingWithdrawalsBaht(withdrawalsForCreator) {
  const wds = Array.isArray(withdrawalsForCreator) ? withdrawalsForCreator : [];
  return wds
    .filter((w) => String(w.status) === "pending")
    .reduce((s, w) => s + Math.max(0, Math.floor(Number(w.amountThb) || 0)), 0);
}

function CreatorPrizeCard({ group, withdrawalsForCreator = [] }) {
  const { creatorUsername, items } = group;
  const creatorDisplay =
    creatorUsername && creatorUsername.length > 0 ? `@${creatorUsername}` : "ไม่ระบุผู้สร้างเกม";

  const cashItems = items.filter((a) => a.prizeCategory === "cash");
  const nonCashItems = items.filter((a) => a.prizeCategory !== "cash");
  const cashTotal = cashItems.reduce((s, a) => s + parseCashBaht(a), 0);
  const winCount = items.length;

  const [open, setOpen] = useState(false);
  const detailRows = useMemo(
    () => buildMergedLedgerRows(items, withdrawalsForCreator),
    [items, withdrawalsForCreator]
  );
  const pendingHoldBaht = useMemo(
    () => sumPendingWithdrawalsBaht(withdrawalsForCreator),
    [withdrawalsForCreator]
  );
  const ledgerEndCash =
    detailRows.length > 0 ? detailRows[detailRows.length - 1].runningCash : 0;
  const finalCashBalance = Math.max(0, ledgerEndCash - pendingHoldBaht);

  const approvedWithdrawCount = useMemo(
    () =>
      (Array.isArray(withdrawalsForCreator) ? withdrawalsForCreator : []).filter(
        (w) => String(w.status) === "approved"
      ).length,
    [withdrawalsForCreator]
  );

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

  const prizeMoneyCell =
    cashItems.length > 0 ? (
      <span className="font-bold tabular-nums text-slate-900">
        {formatBaht(cashTotal)} บาท
      </span>
    ) : (
      <span className="text-slate-500">0 บาท</span>
    );

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                รางวัลเงินสดจาก
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                เงินรางวัลที่ได้
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                ชนะกี่ครั้ง
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                รายละเอียด
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-3 font-medium text-brand-800">{creatorDisplay}</td>
              <td className="px-3 py-3 align-middle">{prizeMoneyCell}</td>
              <td className="px-3 py-3 align-middle tabular-nums text-slate-800">
                {winCount} ครั้ง
                {approvedWithdrawCount > 0 ? (
                  <span className="block text-xs font-normal text-slate-600">
                    ถอน {approvedWithdrawCount} ครั้ง
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-3 align-middle">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                  aria-expanded={open}
                >
                  {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {cashItems.length === 0 && winCount > 0 ? (
        <p className="mt-2 text-xs text-slate-600">
          ยังไม่มีรางวัลเงินสดจากผู้สร้างรายนี้ (มีเฉพาะรางวัลประเภทอื่น)
        </p>
      ) : null}

      {nonCashSummary ? (
        <p className="mt-2 text-sm text-slate-700">{nonCashSummary}</p>
      ) : null}

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="whitespace-nowrap px-3 py-2.5">ชื่อผู้สร้างเกม</th>
                  <th className="whitespace-nowrap px-3 py-2.5">วันเวลา</th>
                  <th className="whitespace-nowrap px-3 py-2.5">รหัสเกม</th>
                  <th className="min-w-[140px] px-3 py-2.5">ชื่อเกม</th>
                  <th className="whitespace-nowrap px-3 py-2.5">เงินรางวัลที่ได้</th>
                  <th className="whitespace-nowrap px-3 py-2.5">ยอดคงเหลือ (รวมเงินสด)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {detailRows.map((row) =>
                  row.kind === "win" ? (
                    <tr key={row.key} className="bg-white">
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">
                        {creatorDisplay}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">
                        {formatWonAt(row.award.wonAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                        {displayGameCode(row.award)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800">{row.award.gameTitle}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {row.cashAmt != null ? (
                          <span>{formatBaht(row.cashAmt)} บาท</span>
                        ) : (
                          <span className="text-slate-600">{prizeLine(row.award)}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-slate-900">
                        {formatBaht(row.runningCash)} บาท
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.key} className="bg-rose-50/40">
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">
                        {creatorDisplay}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">
                        {formatWonAt(row.atLabel)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-500">
                        —
                      </td>
                      <td className="px-3 py-2.5 font-medium text-rose-900">ถอนเงิน</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium text-rose-800">
                        −{formatBaht(Math.abs(row.cashAmt))} บาท
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-slate-900">
                        {formatBaht(row.runningCash)} บาท
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-800">
              <span className="font-medium text-slate-600">ยอดเงินสดคงเหลือปัจจุบัน (รวมจากผู้สร้างรายนี้): </span>
              <span className="text-lg font-bold tabular-nums text-emerald-900">
                {formatBaht(finalCashBalance)} บาท
              </span>
            </p>
            <Link
              href={`/account/prize-withdraw?ref=${encodeURIComponent(creatorDisplay)}&balance=${encodeURIComponent(String(finalCashBalance))}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              ถอนเงินรางวัล
            </Link>
          </div>
          {pendingHoldBaht > 0 ? (
            <p className="mt-2 text-xs text-amber-800">
              มีคำขอถอนรอดำเนินการรวม{" "}
              <span className="font-semibold tabular-nums">{formatBaht(pendingHoldBaht)} บาท</span>{" "}
              (หักจากยอดคงเหลือปัจจุบันด้านบน — ยังไม่แสดงเป็นแถวจนกว่าจะอนุมัติ)
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            ส่งคำขอถอนไปยังผู้สร้างเกม — กรอกจำนวนเงินและบัญชีรับเงิน ระบบจะหักจากยอดถอนได้คงเหลือ
          </p>
        </div>
      ) : null}
    </li>
  );
}

export default function AccountMyPrizesSection() {
  const { user, loading: authLoading } = useMemberAuth();
  const [awards, setAwards] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const groups = useMemo(() => groupAwardsByCreator(awards), [awards]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setAwards([]);
      setWithdrawals([]);
      return;
    }
    const token = getMemberToken();
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [awardRes, wdRes] = await Promise.all([
          apiGetMyCentralPrizeAwards(token),
          apiGetMyPrizeWithdrawals(token).catch(() => ({ withdrawals: [] }))
        ]);
        if (!cancelled) {
          setAwards(Array.isArray(awardRes.awards) ? awardRes.awards : []);
          setWithdrawals(Array.isArray(wdRes.withdrawals) ? wdRes.withdrawals : []);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading) {
    return <p className="text-sm text-slate-500">กำลังโหลด…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">ต้องเข้าสู่ระบบก่อน</p>
        <p className="mt-2 text-amber-900/90">
          รางวัลจากเกมส่วนกลางจะบันทึกกับบัญชีเมื่อคุณล็อกอินและชนะตามกติกา
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block font-semibold text-brand-800 underline hover:text-brand-950"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">รางวัลของฉัน</h2>

      {err ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">กำลังโหลดรายการ…</p>
      ) : awards.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
          <p>ยังไม่มีรางวัลที่บันทึกในบัญชีนี้</p>
          <p className="mt-2 text-xs text-slate-500">
            เล่นเกมจากเมนู「เกม」แล้วชนะตามกติกา — ต้องล็อกอินขณะเล่น
          </p>
          <p className="mt-3 text-xs text-slate-400">
            หมายเหตุ: ถ้าเคยมีรางวัลแล้วหายไปหลังแก้/บันทึกกติกาเกมในแอดมิน
            ระบบเดิมอาจล้างประวัติที่ผูกกับกติกาเก่า — เวอร์ชันเซิร์ฟเวอร์ล่าสุดเก็บสำเนาไว้แล้วเพื่อกันเหตุการณ์นี้ในอนาคต
          </p>
          <Link
            href="/game"
            className="mt-4 inline-block font-semibold text-brand-800 underline hover:text-brand-950"
          >
            ไปหน้ารายการเกม
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {groups.map((g) => {
            const cu = String(g.creatorUsername || "").trim().toLowerCase();
            const wds = withdrawals.filter(
              (w) => String(w.creatorUsername || "").trim().toLowerCase() === cu
            );
            return <CreatorPrizeCard key={g.creatorKey} group={g} withdrawalsForCreator={wds} />;
          })}
        </ul>
      )}
    </section>
  );
}
