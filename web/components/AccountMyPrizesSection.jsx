"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiCancelPrizeWithdrawalRequest,
  apiGetMyCentralPrizeAwards,
  apiGetMyPrizeWithdrawals,
  apiPostWinnerPickupAck,
  getMemberToken
} from "../lib/memberApi";
import PrizeWithdrawalHistoryTable from "./PrizeWithdrawalHistoryTable";
import { useMemberAuth } from "./MemberAuthProvider";

const CAT_LABEL = {
  cash: "เงินสด",
  item: "สิ่งของ",
  none: "ไม่มีรางวัล"
};

function prizeLine(a) {
  if (!a || typeof a !== "object") return "รางวัล";
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

const MIN_WITHDRAW_BAHT = 20;

function cashPrizeFulfillmentMode(a) {
  const m = String(a.prizeFulfillmentMode || "").toLowerCase();
  return m === "pickup" ? "pickup" : "transfer";
}

function creatorCashAllPickup(cashItems) {
  if (!Array.isArray(cashItems) || cashItems.length === 0) return false;
  return cashItems.every((a) => cashPrizeFulfillmentMode(a) === "pickup");
}

function cashDeliveryLabelThai(a) {
  if (!a || String(a.prizeCategory) !== "cash") return "—";
  return cashPrizeFulfillmentMode(a) === "pickup" ? "มารับเอง" : "โอนรางวัลให้";
}

function itemEffectiveFulfillmentMode(a) {
  const im = String(a.itemFulfillmentMode || "").toLowerCase();
  if (im === "pickup" || im === "ship") return im;
  const p = String(a.prizeFulfillmentMode || "").toLowerCase();
  if (p === "pickup" || p === "ship") return p;
  return "";
}

function itemReceiptMethodLabelThai(a) {
  const eff = itemEffectiveFulfillmentMode(a);
  if (eff === "pickup") return "มารับเอง";
  if (eff === "ship") return "จัดส่งตามที่อยู่";
  return "รอผู้สร้างกำหนดวิธีรับ";
}

/** ลิงก์เปิด LINE — รองรับ URL เต็ม หรือ @id / id */
function lineContactHref(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const id = s.replace(/^@+/, "").trim();
  if (!id) return null;
  return `https://line.me/ti/p/~${id}`;
}

function displayGameCode(a) {
  const c = a.gameCode != null ? String(a.gameCode).trim() : "";
  if (c) return c;
  const id = String(a.gameId || "").replace(/-/g, "");
  if (id.length >= 8) return `…${id.slice(-8)}`;
  return a.gameId ? String(a.gameId).slice(0, 8) + "…" : "—";
}

function itemStatusLabel(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "ready_pickup") return "ผู้สร้างนัดรับเอง";
  if (s === "shipped") return "ผู้สร้างจัดส่งแล้ว";
  if (s === "completed") return "รับของเรียบร้อย";
  return "รอผู้สร้างกำหนดวิธีรับ";
}

/** จำนวนหน่วยต่อหนึ่งครั้งที่ชนะ — ดึงตัวเลขจากข้อความรางวัล ถ้าไม่มีถือว่า 1 หน่วย */
function itemUnitsPerWin(a) {
  const raw = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(" ");
  const m = String(raw).replace(/,/g, "").match(/[\d]+(?:\.[\d]+)?/);
  if (!m) return 1;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function groupItemAwardsByCreatorAndPrize(itemAwards) {
  const map = new Map();
  for (const a of itemAwards) {
    const cu = (a.creatorUsername || "").trim().toLowerCase() || "_unknown";
    const pt = (a.prizeTitle || "").trim();
    const pv = (a.prizeValueText || "").trim();
    const pu = (a.prizeUnit || "").trim();
    const key = `${cu}||${pt}||${pv}||${pu}`;
    if (!map.has(key)) {
      map.set(key, {
        groupKey: key,
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

function CreatorPrizeCard({
  group,
  withdrawalsForCreator = [],
  onRefreshWithdrawals,
  wdRefreshing
}) {
  const { creatorUsername, items } = group;
  const [cancelingId, setCancelingId] = useState(null);
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
  const cashAllowsTransfer = !creatorCashAllPickup(cashItems);

  const approvedWithdrawCount = useMemo(
    () =>
      (Array.isArray(withdrawalsForCreator) ? withdrawalsForCreator : []).filter(
        (w) => String(w.status) === "approved"
      ).length,
    [withdrawalsForCreator]
  );

  async function handleCancelWithdrawal(id) {
    const token = getMemberToken();
    if (!token || !onRefreshWithdrawals) return;
    setCancelingId(id);
    try {
      await apiCancelPrizeWithdrawalRequest(token, id);
      await onRefreshWithdrawals();
    } finally {
      setCancelingId(null);
    }
  }

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
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
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
              <th className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-slate-600">
                ยอดคงเหลือ
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
              <td className="px-3 py-3 text-center align-middle">
                <span className="inline-block font-bold tabular-nums text-emerald-900">
                  {formatBaht(finalCashBalance)} บาท
                </span>
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
                  <th className="whitespace-nowrap px-3 py-2.5">การจ่ายรางวัล</th>
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
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">
                        {cashDeliveryLabelThai(row.award)}
                      </td>
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
                      <td className="px-3 py-2.5 text-xs text-slate-600">โอนรางวัลให้</td>
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
            {cashAllowsTransfer && finalCashBalance >= MIN_WITHDRAW_BAHT ? (
              <Link
                href={`/account/prize-withdraw?ref=${encodeURIComponent(creatorDisplay)}&balance=${encodeURIComponent(String(finalCashBalance))}`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                ถอนเงินรางวัล
              </Link>
            ) : cashItems.length > 0 && !cashAllowsTransfer && finalCashBalance > 0 ? (
              <p className="max-w-md text-sm leading-relaxed text-slate-800">
                รางวัลเงินสดจากผู้สร้างรายนี้ตั้งเป็น{" "}
                <span className="font-semibold">มารับเอง</span> — ติดต่อผู้สร้างเมื่อพร้อมรับเงิน
              </p>
            ) : null}
          </div>
          {pendingHoldBaht > 0 ? (
            <p className="mt-2 text-xs text-amber-800">
              มีคำขอถอนรอดำเนินการรวม{" "}
              <span className="font-semibold tabular-nums">{formatBaht(pendingHoldBaht)} บาท</span>{" "}
              (หักจากยอดคงเหลือปัจจุบันด้านบน — ดูรายการและยกเลิกได้ในตารางด้านล่าง)
            </p>
          ) : null}
          {cashItems.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              {cashAllowsTransfer
                ? "ส่งคำขอถอนไปยังผู้สร้างเกม — กรอกจำนวนเงินและบัญชีรับเงิน ระบบจะหักจากยอดถอนได้คงเหลือ (เฉพาะรางวัลที่กติกากำหนดเป็นโอนรางวัลให้)"
                : "รางวัลเงินสดที่กำหนดมารับเองไม่ใช้ระบบถอนผ่านบัญชี — ติดต่อผู้สร้างโดยตรง"}
            </p>
          ) : null}
          {onRefreshWithdrawals ? (
            <PrizeWithdrawalHistoryTable
              compactTitle
              withdrawals={withdrawalsForCreator}
              loading={Boolean(wdRefreshing)}
              creatorRefLabel={String(creatorUsername || "").replace(/^@+/, "")}
              onRefresh={onRefreshWithdrawals}
              allowCancel
              onCancelRequest={handleCancelWithdrawal}
              cancelingId={cancelingId}
              emptyMessage="ยังไม่มีประวัติการขอถอนกับผู้สร้างท่านนี้"
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ItemPrizeGroupCard({ group, onRefreshAwards }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickupBusyId, setPickupBusyId] = useState(null);
  const [pickupAckErr, setPickupAckErr] = useState("");
  const { creatorUsername, items } = group;
  const safeItems = Array.isArray(items) ? items : [];
  const creatorDisplay =
    creatorUsername && creatorUsername.length > 0 ? `@${creatorUsername}` : "ไม่ระบุผู้สร้างเกม";
  const sample = safeItems[0];
  const prizeName = prizeLine(sample);
  const winCount = safeItems.length;
  const totalUnits = safeItems.reduce((s, a) => s + itemUnitsPerWin(a), 0);

  function goProfile() {
    router.push("/account/profile");
  }

  async function handleWinnerPickupAck(awardId) {
    const token = getMemberToken();
    if (!token || !onRefreshAwards) return;
    setPickupBusyId(String(awardId));
    setPickupAckErr("");
    try {
      await apiPostWinnerPickupAck(token, awardId);
      await onRefreshAwards();
    } catch (e) {
      setPickupAckErr(e.message || String(e));
    } finally {
      setPickupBusyId(null);
    }
  }

  const receiptModes = safeItems.map((a) => itemEffectiveFulfillmentMode(a));
  const allPickup =
    receiptModes.length > 0 && receiptModes.every((m) => m === "pickup");
  const allShip = receiptModes.length > 0 && receiptModes.every((m) => m === "ship");

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                รางวัลสิ่งของจาก
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                รางวัลที่ได้
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                ชนะกี่ครั้ง
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-slate-600">
                รวมรางวัลที่ได้
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-600">
                รายละเอียด
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-3 py-3 font-medium text-brand-800">{creatorDisplay}</td>
              <td className="max-w-[220px] px-3 py-3 text-slate-900">{prizeName}</td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-800">{winCount} ครั้ง</td>
              <td className="px-3 py-3 text-center align-middle">
                <span className="inline-block font-semibold tabular-nums text-slate-900">
                  {Number.isInteger(totalUnits)
                    ? totalUnits.toLocaleString("th-TH")
                    : totalUnits.toLocaleString("th-TH", { maximumFractionDigits: 2 })}{" "}
                  หน่วย
                </span>
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  (ผลรวมจากทุกครั้งที่ชนะในกลุ่มนี้)
                </span>
              </td>
              <td className="px-3 py-3 align-middle">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="text-sm font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                  aria-expanded={open}
                >
                  {open ? "ซ่อนรายละเอียด" : "ดูรายการที่ได้"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-700">
              {allPickup
                ? "ผู้สร้างตั้งค่าให้มารับเอง — กด「กดรับรางวัล」ในแต่ละแถวเพื่อแจ้งผู้สร้างว่าคุณรับทราบและจะมารับตามที่นัดหมาย"
                : allShip
                  ? "จัดส่งตามที่อยู่ที่บันทึกในโปรไฟล์ — ใช้ได้ทั้งรายการเดียวหรือหลายรายการในกลุ่มนี้เมื่อผู้สร้างเลือกส่งของ"
                  : "ในกลุ่มนี้อาจมีทั้งแบบมารับเองและจัดส่ง — ดูคอลัมน์「วิธีรับรางวัล」ของแต่ละแถว"}
            </p>
            {!allPickup ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goProfile}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                >
                  ตั้งค่าที่อยู่จัดส่ง (ทั้งหมดในกลุ่ม)
                </button>
              </div>
            ) : null}
          </div>

          {pickupAckErr ? (
            <p className="mb-2 text-xs text-red-700" role="alert">
              {pickupAckErr}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[880px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="whitespace-nowrap px-3 py-2.5">วันเวลาที่ชนะ</th>
                  <th className="min-w-[120px] px-3 py-2.5">รางวัล</th>
                  <th className="whitespace-nowrap px-3 py-2.5">รหัสเกม</th>
                  <th className="whitespace-nowrap px-3 py-2.5">หน่วย/ครั้ง</th>
                  <th className="min-w-[140px] px-3 py-2.5">สถานะการส่งมอบ</th>
                  <th className="min-w-[140px] px-3 py-2.5">วิธีรับรางวัล</th>
                  <th className="min-w-[200px] px-3 py-2.5">ติดต่อรับรางวัล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {safeItems.map((a) => {
                  const shippingAddr =
                    a.itemShippingAddressSnapshot && typeof a.itemShippingAddressSnapshot === "object"
                      ? String(a.itemShippingAddressSnapshot.address || "").trim()
                      : "";
                  const effMode = itemEffectiveFulfillmentMode(a);
                  const ackAt = a.winnerPickupAckAt || null;
                  const lineRaw =
                    a.creatorPrizeContactLine != null ? String(a.creatorPrizeContactLine).trim() : "";
                  const lineHref = lineContactHref(lineRaw);
                  const rowKey = a.id != null ? String(a.id) : `row-${a.wonAt}-${prizeLine(a)}`;
                  return (
                    <tr key={rowKey} className="bg-white">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-700">
                        {formatWonAt(a.wonAt)}
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5 text-xs text-slate-800">
                        {prizeLine(a)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                        {displayGameCode(a)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-xs">
                        {itemUnitsPerWin(a).toLocaleString("th-TH")}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-900">
                          {itemStatusLabel(a.itemFulfillmentStatus)}
                        </span>
                        {effMode === "pickup" ? (
                          <span className="mt-1 block text-slate-600">
                            มารับเอง (นัดรับกับผู้สร้าง)
                          </span>
                        ) : effMode === "ship" ? (
                          <span className="mt-1 block text-slate-600">
                            จัดส่งตามที่อยู่
                            {shippingAddr ? ` · ${shippingAddr}` : ""}
                            {a.itemTrackingCode ? ` · พัสดุ ${a.itemTrackingCode}` : ""}
                          </span>
                        ) : (
                          <span className="mt-1 block text-slate-500">รอผู้สร้างกำหนดวิธีรับ</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-xs text-slate-800">
                        {itemReceiptMethodLabelThai(a)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="space-y-2">
                          {lineHref ? (
                            <a
                              href={lineHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex rounded-lg bg-[#06C755] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                            >
                              เปิดแชท LINE ผู้สร้าง
                            </a>
                          ) : (
                            <p className="text-xs text-slate-600">
                              ผู้สร้างยังไม่ได้ใส่ LINE ในโปรไฟล์
                              {creatorUsername ? (
                                <>
                                  {" "}
                                  (@{String(creatorUsername).replace(/^@+/, "")})
                                </>
                              ) : null}
                            </p>
                          )}
                          {lineRaw && !/^https?:\/\//i.test(lineRaw) ? (
                            <p className="font-mono text-[11px] text-slate-500">{lineRaw}</p>
                          ) : null}
                          {effMode === "pickup" ? (
                            <div className="border-t border-slate-100 pt-2">
                              {ackAt ? (
                                <p className="text-xs font-medium text-emerald-800">
                                  แจ้งรับทราบแล้ว · {formatWonAt(ackAt)}
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  disabled={pickupBusyId === String(a.id) || !onRefreshAwards}
                                  onClick={() => void handleWinnerPickupAck(a.id)}
                                  className="rounded-lg border border-brand-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-900 hover:bg-brand-50 disabled:opacity-50"
                                >
                                  {pickupBusyId === String(a.id)
                                    ? "กำลังบันทึก…"
                                    : "แจ้งผู้สร้างว่าจะมารับ"}
                                </button>
                              )}
                            </div>
                          ) : effMode === "ship" ? (
                            <div className="border-t border-slate-100 pt-2">
                              <button
                                type="button"
                                onClick={goProfile}
                                className="text-left text-[11px] font-semibold text-brand-800 underline"
                              >
                                ตั้งค่าที่อยู่จัดส่งในโปรไฟล์
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            การอัปเดตสถานะจัดส่งเป็นหน้าที่ผู้สร้างเกม — ฝั่งคุณสามารถตรวจสอบที่อยู่ในโปรไฟล์ให้ถูกต้องก่อนผู้สร้างจัดส่ง
            {allPickup || receiptModes.some((m) => m === "pickup")
              ? " · มารับเอง: กด「แจ้งผู้สร้างว่าจะมารับ」เพื่อบันทึกเวลาให้ผู้สร้างเห็น — ติดต่อนัดรับผ่าน LINE ด้านขวา"
              : ""}
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
  const [wdRefreshing, setWdRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const cashGroups = useMemo(
    () => groupAwardsByCreator(awards.filter((a) => a.prizeCategory === "cash")),
    [awards]
  );
  const itemAwards = useMemo(
    () => awards.filter((a) => a.prizeCategory === "item"),
    [awards]
  );
  const itemGroups = useMemo(() => groupItemAwardsByCreatorAndPrize(itemAwards), [itemAwards]);

  const refreshWithdrawals = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setWdRefreshing(true);
    try {
      const wdRes = await apiGetMyPrizeWithdrawals(token);
      setWithdrawals(Array.isArray(wdRes.withdrawals) ? wdRes.withdrawals : []);
    } finally {
      setWdRefreshing(false);
    }
  }, []);

  const refreshAwards = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    try {
      const awardRes = await apiGetMyCentralPrizeAwards(token);
      setAwards(Array.isArray(awardRes.awards) ? awardRes.awards : []);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, []);

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
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">การ์ดรางวัลเงินสด</h3>
            {cashGroups.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">ยังไม่มีรางวัลเงินสด</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {cashGroups.map((g) => {
                  const cu = String(g.creatorUsername || "").trim().toLowerCase();
                  const wds = withdrawals.filter(
                    (w) => String(w.creatorUsername || "").trim().toLowerCase() === cu
                  );
                  return (
                    <CreatorPrizeCard
                      key={g.creatorKey}
                      group={g}
                      withdrawalsForCreator={wds}
                      onRefreshWithdrawals={refreshWithdrawals}
                      wdRefreshing={wdRefreshing}
                    />
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">การ์ดรางวัลสิ่งของ</h3>
            {itemAwards.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">ยังไม่มีรางวัลสิ่งของ</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {itemGroups.map((g) => (
                  <ItemPrizeGroupCard key={g.groupKey} group={g} onRefreshAwards={refreshAwards} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
