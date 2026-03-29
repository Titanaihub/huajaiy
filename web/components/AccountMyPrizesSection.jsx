"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGetMyCentralPrizeAwards, getMemberToken } from "../lib/memberApi";
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

/** ดึงตัวเลขจำนวนเงินจากฟิลด์รางวัลเงินสด (เช่น "20" หรือ "1,000 บาท") */
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

function groupAwardsByGame(list) {
  const map = new Map();
  for (const a of list) {
    const id = a.gameId;
    if (!map.has(id)) {
      map.set(id, { gameId: id, gameTitle: a.gameTitle, items: [] });
    }
    map.get(id).items.push(a);
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

function GamePrizeCard({ group }) {
  const { gameId, gameTitle, items } = group;
  const cashItems = items.filter((a) => a.prizeCategory === "cash");
  const nonCashItems = items.filter((a) => a.prizeCategory !== "cash");
  const cashTotal = cashItems.reduce((s, a) => s + parseCashBaht(a), 0);
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
      <p className="font-semibold text-slate-900">{gameTitle}</p>

      {cashItems.length > 0 ? (
        <p className="mt-2 text-sm text-slate-800">
          เงินสดรวม{" "}
          <span className="font-bold tabular-nums text-slate-900">
            {formatBahtTotal(cashTotal)}
          </span>{" "}
          บาท
          {cashItems.length > 1 ? (
            <span className="font-normal text-slate-600">
              {" "}
              · ชนะ {cashItems.length} ครั้ง
            </span>
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
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded-lg bg-slate-50/90 px-3 py-2.5 text-sm text-slate-800"
            >
              <p className="text-slate-900">{prizeLine(a)}</p>
              <p className="mt-1 text-xs text-slate-500">
                ชุดที่ {a.setIndex + 1} · {formatWonAt(a.wonAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function AccountMyPrizesSection() {
  const { user, loading: authLoading } = useMemberAuth();
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const groups = useMemo(() => groupAwardsByGame(awards), [awards]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setAwards([]);
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
        const data = await apiGetMyCentralPrizeAwards(token);
        if (!cancelled) setAwards(Array.isArray(data.awards) ? data.awards : []);
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
      <p className="mt-1 text-sm text-slate-600">
        สรุปตามเกม — เงินสดรวมยอดต่อเกม · กด「ดูรายละเอียดแต่ละครั้ง」เพื่อดูวันเวลาที่ได้รางวัล
      </p>

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
          <Link
            href="/game"
            className="mt-4 inline-block font-semibold text-brand-800 underline hover:text-brand-950"
          >
            ไปหน้ารายการเกม
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {groups.map((g) => (
            <GamePrizeCard key={g.gameId} group={g} />
          ))}
        </ul>
      )}
    </section>
  );
}
