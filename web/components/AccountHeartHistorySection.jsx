"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetMyHeartLedger, getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";
import InlineHeart from "./InlineHeart";

const KIND_HINT = {
  game_start: "เล่นเกม",
  admin_adjust: "แอดมินปรับยอด",
  marketplace_order: "สั่งซื้อสินค้า",
  heart_purchase_approved: "ซื้อหัวใจ (อนุมัติ)",
  adjustment: "ปรับยอด"
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

export default function AccountHeartHistorySection() {
  const { user, loading: authLoading } = useMemberAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dbRequired, setDbRequired] = useState(false);

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
        const data = await apiGetMyHeartLedger(token, { limit: 100 });
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
          href="/login?next=/account/heart-history"
          className="mt-3 inline-block font-semibold text-brand-800 underline hover:text-brand-950"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">ประวัติหัวใจ</h2>
      <p className="mt-1 text-sm text-slate-600">
        บันทึกเมื่อมีการเพิ่มหรือหักหัวใจชมพู/แดงบนเซิร์ฟเวอร์ — เช่น เริ่มเล่นเกมส่วนกลาง สั่งซื้อสินค้า
        แอดมินอนุมัติแพ็กหัวใจ หรือแอดมินปรับยอด
      </p>

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
      ) : entries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
          <p>ยังไม่มีรายการในประวัติ</p>
          <p className="mt-2 text-xs text-slate-500">
            รายการจะปรากฏหลังมีการหัก/เพิ่มหัวใจ — ข้อมูลก่อนอัปเดตระบบนี้อาจไม่ย้อนหลัง
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {entries.map((e) => (
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
