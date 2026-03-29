"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function AccountMyPrizesSection() {
  const { user, loading: authLoading } = useMemberAuth();
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
        รายการรางวัลจากเกมเปิดป้ายส่วนกลางที่ระบบบันทึกไว้กับบัญชีของคุณ (หลังชนะตามกติกาที่มีรางวัล)
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
          {awards.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-slate-900">{a.gameTitle}</p>
              <p className="mt-1 text-sm text-slate-700">{prizeLine(a)}</p>
              <p className="mt-2 text-xs text-slate-500">
                ชุดที่ {a.setIndex + 1} · {formatWonAt(a.wonAt)}
              </p>
              <Link
                href={`/game/${encodeURIComponent(a.gameId)}`}
                className="mt-3 inline-block text-xs font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
              >
                เปิดหน้าเกมนี้
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
