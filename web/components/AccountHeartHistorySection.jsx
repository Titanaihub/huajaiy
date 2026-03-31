"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGetMyHeartLedger, getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";
import InlineHeart from "./InlineHeart";

const KIND_HINT = {
  game_start: "เล่นเกม",
  admin_adjust: "แอดมินปรับยอด",
  marketplace_order: "สั่งซื้อสินค้า",
  heart_purchase_approved: "ซื้อหัวใจ (อนุมัติ)",
  adjustment: "ปรับยอด",
  room_red_code_issue: "สร้างรหัสแจกแดงห้อง",
  room_red_code_refund: "ลบรหัสห้อง · คืนแดง",
  room_red_code_redeem: "แลกรหัสห้อง · ได้แดง"
};

const PLAY_KINDS = new Set(["game_start"]);
const PURCHASE_KINDS = new Set([
  "heart_purchase_approved",
  "room_red_code_issue",
  "room_red_code_refund",
  "room_red_code_redeem"
]);

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

function giveawayLedgerNote(entry) {
  const m = entry.meta;
  if (!m || typeof m !== "object") return null;
  if (entry.kind === "heart_purchase_approved") {
    if (m.redGrantedToGiveaway == null) return null;
    const toGive = Number(m.redGrantedToGiveaway) || 0;
    if (toGive > 0) {
      const after =
        m.redGiveawayBalanceAfter != null
          ? Number(m.redGiveawayBalanceAfter)
          : null;
      return (
        <p className="mt-1 text-xs text-red-900/90">
          แดงแจกผู้เล่น +{toGive.toLocaleString("th-TH")}
          {after != null && Number.isFinite(after)
            ? ` · คงเหลือแจก ${after.toLocaleString("th-TH")}`
            : ""}
        </p>
      );
    }
  }
  if (entry.kind === "room_red_code_issue") {
    const gd = Number(m.giveawayDeducted) || 0;
    const pd = Number(m.playableRedDeducted) || 0;
    if (gd > 0 || pd > 0) {
      const after =
        m.redGiveawayBalanceAfter != null
          ? Number(m.redGiveawayBalanceAfter)
          : null;
      return (
        <p className="mt-1 text-xs text-red-900/90">
          หักแดงแจก {gd.toLocaleString("th-TH")} · หักแดงเล่นได้ {pd.toLocaleString("th-TH")}
          {after != null && Number.isFinite(after)
            ? ` · คงเหลือแจก ${after.toLocaleString("th-TH")}`
            : ""}
        </p>
      );
    }
  }
  if (entry.kind === "room_red_code_refund") {
    const gr = Number(m.giveawayRefunded) || 0;
    const pr = Number(m.playableRefunded) || 0;
    if (gr > 0 || pr > 0) {
      const after =
        m.redGiveawayBalanceAfter != null
          ? Number(m.redGiveawayBalanceAfter)
          : null;
      return (
        <p className="mt-1 text-xs text-emerald-900/90">
          คืนแดงแจก {gr.toLocaleString("th-TH")} · คืนแดงเล่นได้ {pr.toLocaleString("th-TH")}
          {after != null && Number.isFinite(after)
            ? ` · คงเหลือแจก ${after.toLocaleString("th-TH")}`
            : ""}
        </p>
      );
    }
  }
  if (entry.kind === "room_red_code_redeem") {
    const add = Number(m.roomRedAdded) || 0;
    const after = m.roomRedBalanceAfter != null ? Number(m.roomRedBalanceAfter) : null;
    const code = m.code != null ? String(m.code).trim().toUpperCase() : "";
    const creator =
      m.creatorUsername != null ? String(m.creatorUsername).trim().replace(/^@+/, "") : "";
    if (add > 0) {
      return (
        <p className="mt-1 text-xs text-emerald-900/90">
          แลกรหัส {code || "—"} · ได้แดง {add.toLocaleString("th-TH")}
          {creator ? ` · จาก @${creator}` : ""}
          {after != null && Number.isFinite(after)
            ? ` · ยอดแดงห้องนี้ ${after.toLocaleString("th-TH")}`
            : ""}
        </p>
      );
    }
  }
  return null;
}

function deltaLine(pinkDelta, redDelta) {
  const chunks = [];
  if (pinkDelta !== 0) {
    chunks.push(
      <span key="p" className="inline-flex items-center gap-1 tabular-nums text-rose-700">
        {pinkDelta > 0 ? "+" : ""}
        {pinkDelta.toLocaleString("th-TH")}
        <InlineHeart className="text-rose-400" size="sm" />
        <span className="text-xs font-medium text-rose-800">ชมพู</span>
      </span>
    );
  }
  if (redDelta !== 0) {
    chunks.push(
      <span key="r" className="inline-flex items-center gap-1 tabular-nums text-red-800">
        {redDelta > 0 ? "+" : ""}
        {redDelta.toLocaleString("th-TH")}
        <InlineHeart className="text-red-600" size="sm" />
        <span className="text-xs font-medium text-red-900">แดง</span>
      </span>
    );
  }
  if (chunks.length === 0) return <span className="text-slate-500">0</span>;
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{chunks}</div>;
}

/**
 * @param {{ variant?: "play" | "purchase" | "all" }} props
 */
export default function AccountHeartHistorySection({ variant = "all" }) {
  const { user, loading: authLoading } = useMemberAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dbRequired, setDbRequired] = useState(false);

  const loginNext =
    variant === "purchase"
      ? "/account/heart-history/purchases"
      : variant === "play"
        ? "/account/heart-history/play"
        : "/account/heart-history/play";

  const filtered = useMemo(() => {
    if (variant === "play") {
      return entries.filter((e) => PLAY_KINDS.has(e.kind));
    }
    if (variant === "purchase") {
      return entries.filter((e) => PURCHASE_KINDS.has(e.kind));
    }
    return entries;
  }, [entries, variant]);

  const heading =
    variant === "play"
      ? "ประวัติหัวใจ (การเล่นเกม)"
      : variant === "purchase"
        ? "ประวัติหัวใจแดง"
        : "ประวัติหัวใจ";

  const blurb =
    variant === "play"
      ? "เฉพาะรายการที่หักหัวใจตอนเริ่มเล่นเกมส่วนกลาง (และโหมดที่บันทึกแบบเดียวกัน)"
      : variant === "purchase"
        ? "รวมการซื้อแพ็กหัวใจแดงแจกที่อนุมัติแล้ว และการหัก/คืนแดงเมื่อสร้างหรือลบรหัสแจกห้อง"
        : "บันทึกเมื่อมีการเพิ่มหรือหักหัวใจชมพู/แดงบนเซิร์ฟเวอร์";

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
        const data = await apiGetMyHeartLedger(token, { limit: 200 });
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
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">ต้องเข้าสู่ระบบก่อน</p>
        <Link
          href={`/login?next=${encodeURIComponent(loginNext)}`}
          className="mt-3 inline-block font-semibold text-brand-800 underline hover:text-brand-950"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      <p className="mt-1 text-sm text-slate-600">{blurb}</p>
      {variant !== "all" ? (
        <p className="mt-2 text-xs text-slate-500">
          {variant === "play" ? (
            <>
              ดูประวัติหัวใจแดงได้ที่{" "}
              <Link
                href="/account/heart-history/purchases"
                className="font-semibold text-brand-800 underline underline-offset-2 hover:text-brand-950"
              >
                ประวัติหัวใจแดง
              </Link>
            </>
          ) : (
            <>
              ดูการหักตอนเล่นเกมได้ที่{" "}
              <Link
                href="/account/heart-history/play"
                className="font-semibold text-brand-800 underline underline-offset-2 hover:text-brand-950"
              >
                ประวัติหัวใจ (เล่นเกม)
              </Link>
            </>
          )}
        </p>
      ) : null}

      {err ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {err}
        </p>
      ) : null}

      {dbRequired ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ระบบยังไม่เชื่อมฐานข้อมูล — ไม่มีประวัติให้แสดง
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">กำลังโหลดรายการ…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
          <p>
            {variant === "play"
              ? "ยังไม่มีประวัติการหักหัวใจจากการเริ่มเล่นเกม"
              : variant === "purchase"
                ? "ยังไม่มีประวัติการซื้อหัวใจหรือทุนรหัสแจกห้องในช่วงที่แสดง"
                : "ยังไม่มีรายการในประวัติ"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            รายการจะปรากฏหลังมีการหัก/เพิ่มหัวใจ — ข้อมูลก่อนอัปเดตระบบนี้อาจไม่ย้อนหลัง
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {KIND_HINT[e.kind] || e.kind || "รายการ"}
                </span>
                <time
                  className="text-xs text-slate-500 tabular-nums"
                  dateTime={e.createdAt ? new Date(e.createdAt).toISOString() : undefined}
                >
                  {formatWhen(e.createdAt)}
                </time>
              </div>
              <p className="mt-2 font-medium leading-snug text-slate-900">
                {e.label || "—"}
              </p>
              <div className="mt-2">{deltaLine(e.pinkDelta, e.redDelta)}</div>
              {giveawayLedgerNote(e)}
              <p className="mt-2 text-xs text-slate-500">
                คงเหลือหลังรายการนี้: ชมพู{" "}
                <span className="font-semibold tabular-nums text-slate-700">
                  {e.pinkBalanceAfter.toLocaleString("th-TH")}
                </span>
                {" · "}
                แดง{" "}
                <span className="font-semibold tabular-nums text-slate-700">
                  {e.redBalanceAfter.toLocaleString("th-TH")}
                </span>
              </p>
              {e.meta?.gameId && e.kind === "game_start" ? (
                <p className="mt-2">
                  <Link
                    href={`/game/${encodeURIComponent(String(e.meta.gameId))}`}
                    className="text-xs font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                  >
                    เปิดหน้าเกมนี้
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
