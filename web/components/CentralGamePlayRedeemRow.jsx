"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  apiRedeemPinkGiftCode,
  apiRedeemRoomRedGiftCode,
  getMemberToken
} from "../lib/memberApi";
import { sanitizePostLoginNext } from "../lib/postLoginRedirect";
import { useMemberAuth } from "./MemberAuthProvider";

/**
 * แสดงช่องเติมรหัสรับหัวใจชมพู / แดง ให้สอดคล้องกับเกมนั้น (โหมดสกุลเงิน + ต้นทุน)
 */
function deriveRedeemVisibility({
  pinkHeartCost,
  redHeartCost,
  heartCurrencyMode,
  acceptsPinkHearts
}) {
  const mode = String(heartCurrencyMode || "both");
  const acc = acceptsPinkHearts !== false;

  if (mode === "pink_only") return { showPink: true, showRed: false };
  if (mode === "red_only") return { showPink: false, showRed: true };

  if (mode === "either") {
    if (!acc) return { showPink: false, showRed: true };
    return { showPink: true, showRed: true };
  }

  const p = Math.max(0, Math.floor(Number(pinkHeartCost) || 0));
  const r = Math.max(0, Math.floor(Number(redHeartCost) || 0));
  return { showPink: p > 0, showRed: r > 0 };
}

function RedeemLine({ kind, label, placeholder, inputClass, buttonClass, onSubmitCode, minLen = 2 }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      setMsg("");
      const raw = String(code || "").trim();
      if (raw.length < minLen) {
        setMsg("กรุณากรอกรหัส");
        return;
      }
      const token = getMemberToken();
      if (!token) {
        setMsg("ต้องเข้าสู่ระบบก่อน");
        return;
      }
      setBusy(true);
      try {
        await onSubmitCode(token, raw);
        setCode("");
        setMsg(kind === "pink" ? "รับหัวใจชมพูแล้ว" : "รับหัวใจแดงแล้ว");
      } catch (err) {
        setMsg(err?.message || "แลกรหัสไม่สำเร็จ");
      } finally {
        setBusy(false);
      }
    },
    [code, kind, minLen, onSubmitCode]
  );

  return (
    <div className="min-w-0 sm:max-w-md">
      <form
        onSubmit={submit}
        className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2"
      >
        <label className="min-w-0 flex-1 text-left">
          <span className="mb-0.5 block text-xs font-semibold text-[#4a3d40]">{label}</span>
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={code}
            onChange={(ev) => setCode(ev.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono outline-none transition placeholder:text-[#9a8a8e] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#FFF9F2] ${inputClass}`}
          />
        </label>
        <button
          type="submit"
          disabled={busy || String(code || "").trim().length < minLen}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${buttonClass}`}
        >
          {busy ? "กำลังรับ…" : "รับ"}
        </button>
      </form>
      {msg ? (
        <p
          className={`mt-1 text-xs ${msg.includes("แล้ว") ? "text-emerald-800" : "text-red-700"}`}
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}

export default function CentralGamePlayRedeemRow({
  pinkHeartCost,
  redHeartCost,
  heartCurrencyMode,
  acceptsPinkHearts,
  className = ""
}) {
  const { user, loading, refresh } = useMemberAuth();
  const pathname = usePathname();

  const { showPink, showRed } = useMemo(
    () =>
      deriveRedeemVisibility({
        pinkHeartCost,
        redHeartCost,
        heartCurrencyMode,
        acceptsPinkHearts
      }),
    [pinkHeartCost, redHeartCost, heartCurrencyMode, acceptsPinkHearts]
  );

  const loginHref = useMemo(() => {
    const full = pathname || "/";
    const next = sanitizePostLoginNext(full);
    return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  }, [pathname]);

  const onPink = useCallback(
    async (token, raw) => {
      await apiRedeemPinkGiftCode(token, raw);
      await refresh();
    },
    [refresh]
  );

  const onRed = useCallback(
    async (token, raw) => {
      await apiRedeemRoomRedGiftCode(token, raw);
      await refresh();
    },
    [refresh]
  );

  if (!showPink && !showRed) return null;

  const disabledNoAuth = !loading && !user;

  return (
    <div
      className={`min-w-0 space-y-3 ${className}`.trim()}
      data-central-game-redeem
    >
      {disabledNoAuth ? (
        <p className="text-xs text-[#6b5348]">
          <Link
            href={loginHref}
            className="font-semibold text-rose-800 underline decoration-rose-500/70 underline-offset-2 hover:text-rose-950"
          >
            เข้าสู่ระบบ
          </Link>
          <span> เพื่อเติมรหัสรับหัวใจ</span>
        </p>
      ) : null}
      {showPink ? (
        <RedeemLine
          kind="pink"
          label="เติมรหัสรับหัวใจชมพู"
          placeholder="เช่น PABC12XYZ"
          minLen={4}
          inputClass="border-pink-300/90 bg-white/95 text-[#2a2228] focus-visible:border-pink-400 focus-visible:ring-pink-300/50"
          buttonClass="border border-pink-400/90 bg-pink-600 text-white hover:bg-pink-700"
          onSubmitCode={onPink}
        />
      ) : null}
      {showRed ? (
        <RedeemLine
          kind="red"
          label="เติมรหัสรับหัวใจแดง"
          placeholder="เช่น RABC12DE3"
          inputClass="border-rose-300/90 bg-white/95 text-[#2a2228] focus-visible:border-rose-400 focus-visible:ring-rose-300/50"
          buttonClass="border border-rose-400/90 bg-rose-700 text-white hover:bg-rose-800"
          onSubmitCode={onRed}
        />
      ) : null}
    </div>
  );
}
