"use client";

import { useCallback, useState } from "react";
import { useMemberAuth } from "./MemberAuthProvider";
import {
  apiCompleteLineOaFriendPrompt,
  getMemberToken
} from "../lib/memberApi";
import {
  getPublicLineAddFriendUrl,
  getPublicLineOaFriendBonusPink
} from "../lib/config";

/**
 * แบนเนอร์ชวนเพิ่มเพื่อน LINE OA — แสดงซ้ำจนกว่าสมาชิกจะกดรับโบนัสหัวใจชมพู (เฉพาะบัญชีที่ล็อกอินด้วย LINE)
 */
export default function LineOaFriendPromptBanner() {
  const { user, refresh } = useMemberAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const addUrl = getPublicLineAddFriendUrl();
  const bonus = getPublicLineOaFriendBonusPink();

  const show =
    user &&
    user.role === "member" &&
    user.lineLoginLinked &&
    !user.lineOaFriendPromptCompleted &&
    Boolean(addUrl);

  const onOpenLine = useCallback(() => {
    if (!addUrl) return;
    window.open(addUrl, "_blank", "noopener,noreferrer");
  }, [addUrl]);

  const onConfirm = useCallback(async () => {
    setErr("");
    const token = getMemberToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiCompleteLineOaFriendPrompt(token);
      await refresh();
    } catch (e) {
      setErr(e.message || "ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  if (!show) return null;

  return (
    <div
      className="border-b border-emerald-200/90 bg-gradient-to-r from-emerald-50 via-white to-green-50 px-3 py-3 sm:px-5"
      role="region"
      aria-label="เชิญเพิ่มเพื่อน LINE"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-emerald-100">
            <img
              src="/social/line.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              decoding="async"
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              เพิ่มเพื่อน LINE ของเรา
            </p>
            <p className="mt-0.5 text-sm leading-snug text-slate-600">
              รับหัวใจชมพู{" "}
              <span className="font-semibold text-pink-600">{bonus}</span>{" "}
              ดวง สำหรับเล่นเกม — กดเพิ่มเพื่อนแล้วยืนยันด้านล่าง
            </p>
            {err ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {err}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onOpenLine}
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-50"
          >
            เปิด LINE เพิ่มเพื่อน
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "กำลังบันทึก…" : "เพิ่มเพื่อนแล้ว — รับหัวใจชมพู"}
          </button>
        </div>
      </div>
    </div>
  );
}
