"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGetMyHeartLedger, getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

const KIND_HINT = {
  game_start: "เล่นเกม",
  admin_adjust: "แอดมินปรับยอด",
  marketplace_order: "สั่งซื้อสินค้า",
  heart_purchase_approved: "ซื้อหัวใจ (อนุมัติ)",
  adjustment: "ปรับยอด",
  room_red_code_issue: "สร้างรหัสแจกแดงห้อง",
  room_red_code_refund: "ลบรหัสห้อง · คืนแดง",
  room_red_code_redeem: "แลกรหัสห้อง"
};

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "—";
  }
}

function sumRoomGiftDeductions(meta) {
  const m = meta?.redFromRoomGifts;
  if (!m || typeof m !== "object" || Array.isArray(m)) return 0;
  let s = 0;
  for (const v of Object.values(m)) {
    s += Math.max(0, Math.floor(Number(v) || 0));
  }
  return s;
}

/**
 * @param {string} mode
 * @param {Array<Record<string, unknown>>} entries
 */
function buildTableRows(mode, entries) {
  const rows = [];

  if (mode === "pink") {
    for (const e of entries) {
      const pinkDelta = Math.floor(Number(e.pinkDelta) || 0);
      if (pinkDelta === 0) continue;
      const hint = KIND_HINT[e.kind] || e.kind || "";
      rows.push({
        id: e.id,
        createdAt: e.createdAt,
        item: (
          <div className="space-y-1">
            <p className="font-medium text-slate-800">{e.label || "—"}</p>
            {hint ? (
              <p className="text-xs font-medium text-slate-500">{hint}</p>
            ) : null}
            {e.kind === "game_start" && e.meta?.gameId ? (
              <Link
                href={`/game/${encodeURIComponent(String(e.meta.gameId))}`}
                className="inline-block text-xs font-semibold text-rose-600 underline decoration-rose-200 underline-offset-2 hover:text-rose-800"
              >
                เปิดหน้าเกมนี้
              </Link>
            ) : null}
          </div>
        ),
        amountDisplay: null,
        amountNumeric: pinkDelta,
        balanceDisplay: Math.max(0, Math.floor(Number(e.pinkBalanceAfter) || 0)).toLocaleString("th-TH")
      });
    }
    return rows;
  }

  if (mode === "red") {
    for (const e of entries) {
      if (e.kind === "room_red_code_redeem") {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const add = Math.max(0, Math.floor(Number(m.roomRedAdded) || 0));
        if (add <= 0) continue;
        const cu =
          m.creatorUsername != null
            ? String(m.creatorUsername).trim().replace(/^@+/, "").toLowerCase()
            : "";
        const code = m.code != null ? String(m.code).trim().toUpperCase() : "";
        const roomAfter = Math.max(0, Math.floor(Number(m.roomRedBalanceAfter) || 0));
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">แลกรหัสห้อง · ได้แดงห้อง</p>
              <p className="text-sm text-slate-600">
                รหัส {code || "—"}
                {cu ? ` · จาก @${cu}` : ""}
              </p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: add,
          balanceDisplay: `แดงห้อง${cu ? ` @${cu}` : ""}: ${roomAfter.toLocaleString("th-TH")}`
        });
        continue;
      }

      if (e.kind === "game_start") {
        const walletRed = Math.floor(Number(e.redDelta) || 0);
        const roomTotal = sumRoomGiftDeductions(e.meta);
        if (walletRed === 0 && roomTotal === 0) continue;
        const parts = [];
        if (walletRed !== 0) {
          parts.push(
            walletRed > 0
              ? `กระเป๋า +${walletRed.toLocaleString("th-TH")}`
              : `กระเป๋า ${walletRed.toLocaleString("th-TH")}`
          );
        }
        if (roomTotal > 0) {
          parts.push(`ห้อง -${roomTotal.toLocaleString("th-TH")}`);
        }
        const gid = e.meta?.gameId;
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "เริ่มเล่นเกม"}</p>
              <p className="text-xs font-medium text-slate-500">{KIND_HINT.game_start}</p>
              {gid ? (
                <Link
                  href={`/game/${encodeURIComponent(String(gid))}`}
                  className="inline-block text-xs font-semibold text-rose-600 underline decoration-rose-200 underline-offset-2 hover:text-rose-800"
                >
                  เปิดหน้าเกมนี้
                </Link>
              ) : null}
            </div>
          ),
          amountDisplay: parts.join(" · "),
          amountNumeric: null,
          balanceDisplay: `กระเป๋าแดง ${Math.max(0, Math.floor(Number(e.redBalanceAfter) || 0)).toLocaleString("th-TH")}`
        });
        continue;
      }

      const redDelta = Math.floor(Number(e.redDelta) || 0);
      if (redDelta === 0) continue;
      const hint = KIND_HINT[e.kind] || e.kind || "";
      rows.push({
        id: e.id,
        createdAt: e.createdAt,
        item: (
          <div className="space-y-1">
            <p className="font-medium text-slate-800">{e.label || "—"}</p>
            {hint ? <p className="text-xs font-medium text-slate-500">{hint}</p> : null}
          </div>
        ),
        amountDisplay: null,
        amountNumeric: redDelta,
        balanceDisplay: `กระเป๋าแดง ${Math.max(0, Math.floor(Number(e.redBalanceAfter) || 0)).toLocaleString("th-TH")}`
      });
    }
    return rows;
  }

  if (mode === "giveaway") {
    for (const e of entries) {
      if (e.kind === "heart_purchase_approved") {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const g = Math.max(0, Math.floor(Number(m.redGrantedToGiveaway) || 0));
        if (g <= 0) continue;
        const after = m.redGiveawayBalanceAfter != null ? Math.floor(Number(m.redGiveawayBalanceAfter)) : null;
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "เติมแดงแจก"}</p>
              <p className="text-xs font-medium text-slate-500">{KIND_HINT.heart_purchase_approved}</p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: g,
          balanceDisplay:
            after != null && Number.isFinite(after)
              ? after.toLocaleString("th-TH")
              : "—"
        });
        continue;
      }
      if (e.kind === "room_red_code_issue") {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const gd = Math.max(0, Math.floor(Number(m.giveawayDeducted) || 0));
        if (gd <= 0) continue;
        const after = m.redGiveawayBalanceAfter != null ? Math.floor(Number(m.redGiveawayBalanceAfter)) : null;
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "—"}</p>
              <p className="text-xs font-medium text-slate-500">หักแดงสำหรับแจก (สร้างรหัสห้อง)</p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: -gd,
          balanceDisplay:
            after != null && Number.isFinite(after)
              ? after.toLocaleString("th-TH")
              : "—"
        });
        continue;
      }
      if (e.kind === "room_red_code_refund") {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const gr = Math.max(0, Math.floor(Number(m.giveawayRefunded) || 0));
        if (gr <= 0) continue;
        const after = m.redGiveawayBalanceAfter != null ? Math.floor(Number(m.redGiveawayBalanceAfter)) : null;
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "—"}</p>
              <p className="text-xs font-medium text-slate-500">คืนแดงแจก (ลบรหัสห้อง)</p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: gr,
          balanceDisplay:
            after != null && Number.isFinite(after)
              ? after.toLocaleString("th-TH")
              : "—"
        });
      }
    }
    return rows;
  }

  return rows;
}

function AmountCell({ amountNumeric, amountDisplay }) {
  if (amountDisplay != null) {
    return (
      <span className="whitespace-pre-wrap tabular-nums text-sm font-semibold text-slate-800">
        {amountDisplay}
      </span>
    );
  }
  const n = Math.floor(Number(amountNumeric) || 0);
  const cls =
    n > 0 ? "text-emerald-600" : n < 0 ? "text-red-600" : "text-slate-500";
  const sign = n > 0 ? "+" : "";
  return (
    <span className={`tabular-nums text-sm font-semibold ${cls}`}>
      {sign}
      {Math.abs(n).toLocaleString("th-TH")}
    </span>
  );
}

const TABS = [
  { mode: "pink", href: "/account/heart-history/play", label: "หัวใจชมพู" },
  { mode: "red", href: "/account/heart-history/purchases", label: "หัวใจแดง" },
  { mode: "giveaway", href: "/account/heart-history/giveaway", label: "แดงสำหรับแจก" }
];

/**
 * @param {{ variant?: "play" | "purchase" | "giveaway" | "pink" | "red" | "all" }} props
 */
export default function AccountHeartHistorySection({ variant = "play" }) {
  const { user, loading: authLoading } = useMemberAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dbRequired, setDbRequired] = useState(false);

  const mode =
    variant === "giveaway"
      ? "giveaway"
      : variant === "red" || variant === "purchase"
        ? "red"
        : variant === "all"
          ? "pink"
          : "pink";

  const heading =
    mode === "pink"
      ? "ประวัติหัวใจชมพู"
      : mode === "red"
        ? "ประวัติหัวใจแดง (กระเป๋าและห้อง)"
        : "ประวัติหัวใจแดงสำหรับแจก";

  const blurb =
    mode === "pink"
      ? "รายการรับหรือหักหัวใจชมพูจากระบบ เช่น เริ่มเล่นเกมส่วนกลาง"
      : mode === "red"
        ? "รวมหัก/รับแดงในกระเป๋า แลกรหัสได้แดงห้อง และหักแดงตอนเริ่มเกม (กระเป๋า/ห้อง)"
        : "เติมแดงแจกจากแพ็กที่อนุมัติ และหัก/คืนแดงแจกเมื่อสร้างหรือลบรหัสแจกห้อง";

  const tableRows = useMemo(() => {
    const raw = buildTableRows(mode, entries);
    raw.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return raw;
  }, [entries, mode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setEntries([]);
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
        const data = await apiGetMyHeartLedger(token, { limit: 300, offset: 0 });
        if (cancelled) return;
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setDbRequired(Boolean(data.dbRequired));
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
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-5 py-5 text-sm text-amber-950 shadow-sm">
        <p className="font-semibold">ต้องเข้าสู่ระบบก่อน</p>
        <Link
          href="/login"
          className="mt-3 inline-block font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <nav
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white/80 p-2 shadow-sm backdrop-blur-sm"
        aria-label="เลือกประเภทประวัติหัวใจ"
      >
        {TABS.map((t) => {
          const active = mode === t.mode;
          return (
            <Link
              key={t.mode}
              href={t.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <header className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{heading}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{blurb}</p>
      </header>

      {err ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {err}
        </p>
      ) : null}

      {dbRequired ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ระบบยังไม่เชื่อมฐานข้อมูล — ไม่มีประวัติให้แสดง
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)]">
        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">กำลังโหลดรายการ…</p>
        ) : tableRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">ยังไม่มีรายการในช่วงที่แสดง</p>
            <p className="mt-2 text-sm text-slate-500">
              ข้อมูลก่อนเปิดใช้บันทึกประวัติอาจไม่ย้อนหลัง
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/95 text-slate-700">
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    วันที่
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    รายการ
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    จำนวน
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                    คงเหลือ
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-rose-50/50 ${
                      i % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 align-top text-slate-600 tabular-nums">
                      <time dateTime={row.createdAt ? new Date(row.createdAt).toISOString() : undefined}>
                        {formatWhen(row.createdAt)}
                      </time>
                    </td>
                    <td className="max-w-md px-4 py-3.5 align-top text-slate-700">{row.item}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top">
                      <AmountCell amountNumeric={row.amountNumeric} amountDisplay={row.amountDisplay} />
                    </td>
                    <td className="whitespace-pre-wrap px-4 py-3.5 align-top font-semibold tabular-nums text-slate-800">
                      {row.balanceDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
