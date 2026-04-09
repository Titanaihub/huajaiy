"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  apiGetMyHeartLedger,
  apiGetRoomRedCodesBatchDetail,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

const KIND_HINT = {
  game_start: "เล่นเกม",
  legacy_pink_opening_balance: "ยอดสะสมก่อนบันทึกรายการ",
  admin_adjust: "แอดมินปรับยอด",
  script_set_exact: "กำหนดยอด (สคริปต์ฉุกเฉิน)",
  marketplace_order: "สั่งซื้อสินค้า",
  heart_purchase_approved: "ซื้อหัวใจ (อนุมัติ)",
  adjustment: "ปรับยอด",
  room_red_code_issue: "สร้างรหัสแจกแดงห้อง",
  room_red_code_refund: "ลบรหัสห้อง · คืนแดง",
  room_red_code_redeem: "แลกรหัสห้อง",
  public_post_share_reward_paid: "จ่ายรางวัลแชร์โพสต์ (จากมัดจำแคมเปญ)"
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

const LEDGER_CODE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLedgerCodeIds(meta) {
  const raw = meta?.codeIds;
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const id = String(x || "").trim();
    if (!LEDGER_CODE_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** บรรทัดรองสำหรับ room_red_code_refund — meta มาจาก roomRedGiftService.cancelCode */
function roomRedRefundDetailLine(meta) {
  const m = meta && typeof meta === "object" ? meta : {};
  const refundCode = m.code != null ? String(m.code).trim() : "";
  const refundId = m.deletedCodeId != null ? String(m.deletedCodeId).trim() : "";
  if (refundCode !== "") return `คืนยอดจากรหัสที่ยกเลิก · รหัสแจก ${refundCode}`;
  if (refundId !== "")
    return `คืนยอดจากรหัสที่ยกเลิก · รหัสในระบบ ${refundId.slice(0, 8)}…`;
  return "คืนยอดจากรหัสที่ยกเลิก";
}

/** รายละเอียดรหัสแจกจากแถวประวัติแดงแจก (สร้างรหัสห้อง) */
function RoomRedIssueExpandBlock({ codeIds }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [codes, setCodes] = useState(null);

  useEffect(() => {
    if (!open || codes != null || !codeIds?.length) return;
    let cancelled = false;
    const token = getMemberToken();
    if (!token) {
      setErr("ต้องเข้าสู่ระบบ");
      return;
    }
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await apiGetRoomRedCodesBatchDetail(token, codeIds);
        if (!cancelled) setCodes(Array.isArray(data.codes) ? data.codes : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, codeIds, codes]);

  return (
    <div className="mt-3 border-t border-slate-200/80 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
      >
        {open ? "▼ ซ่อนรายละเอียดรหัส" : "▶ ดูรหัสที่สร้างและผู้เติม"}
      </button>
      {open ? (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700">
          {loading ? <p className="text-slate-500">กำลังโหลด…</p> : null}
          {err ? (
            <p className="font-medium text-red-600" role="alert">
              {err}
            </p>
          ) : null}
          {!loading && !err && Array.isArray(codes)
            ? codes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-white bg-white/90 p-3 shadow-sm"
                >
                  <p className="font-mono text-sm font-bold text-slate-900">{c.code || "—"}</p>
                  <p className="mt-1 text-slate-600">
                    แดงต่อครั้ง {Number(c.redAmount || 0).toLocaleString("th-TH")} · ใช้แล้ว{" "}
                    {Number(c.usesCount || 0).toLocaleString("th-TH")} /{" "}
                    {Number(c.maxUses || 1).toLocaleString("th-TH")} ครั้ง
                  </p>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <p className="font-semibold text-slate-800">ผู้เติมจากรหัสนี้</p>
                    {!c.redemptions?.length ? (
                      <p className="mt-1 text-slate-500">ยังไม่มีผู้แลก</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {c.redemptions.map((r, idx) => (
                          <li key={`${c.id}-${idx}`} className="text-slate-600">
                            <span className="font-medium text-slate-800">
                              {r.redeemerUsername ? `@${r.redeemerUsername}` : "ผู้ใช้"}
                            </span>
                            {" · "}
                            {formatWhen(r.redeemedAt)}
                            {r.redAmount > 0 ? (
                              <>
                                {" · "}
                                <span className="text-emerald-700">
                                  +{Number(r.redAmount).toLocaleString("th-TH")} แดงห้อง
                                </span>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
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

      if (e.kind === "room_red_code_refund") {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const redDelta = Math.floor(Number(e.redDelta) || 0);
        if (redDelta === 0) continue;
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "—"}</p>
              <p className="text-xs font-medium text-slate-500">{roomRedRefundDetailLine(m)}</p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: redDelta,
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
      if (e.kind === "public_post_share_reward_paid") {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const amt = Math.floor(Number(m.redAmount) || 0);
        if (amt <= 0) continue;
        const ru = m.recipientUsername != null ? String(m.recipientUsername).trim() : "";
        const rid = m.recipientUserId != null ? String(m.recipientUserId).trim() : "";
        const pt = m.postTitle != null ? String(m.postTitle).trim() : "";
        const postId = m.postId ? String(m.postId).trim() : "";
        const poolAfter =
          m.sharePoolRemainingAfter != null ? Math.floor(Number(m.sharePoolRemainingAfter)) : null;
        const whoLabel = ru ? `@${ru}` : rid ? `ผู้ใช้ ${rid.slice(0, 8)}…` : "ผู้แชร์";
        const titleBit =
          pt.length > 0
            ? ` · โพสต์ «${pt.slice(0, 80)}${pt.length > 80 ? "…" : ""}»`
            : postId
              ? ` · โพสต์ ${postId.slice(0, 8)}`
              : "";
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "จ่ายรางวัลแชร์โพสต์"}</p>
              <p className="text-xs font-medium text-slate-500">
                {whoLabel} แชร์และได้รับ {amt.toLocaleString("th-TH")} ดวง{titleBit}
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                {KIND_HINT.public_post_share_reward_paid}
              </p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: -amt,
          balanceDisplay:
            poolAfter != null && Number.isFinite(poolAfter)
              ? `มัดจำแชร์โพสต์คงเหลือ ${poolAfter.toLocaleString("th-TH")} ดวง`
              : "—"
        });
        continue;
      }
      if (
        e.kind === "public_post_share_escrow" ||
        e.kind === "public_post_share_pause_refund" ||
        e.kind === "public_post_share_delete_refund" ||
        e.kind === "public_post_share_refund"
      ) {
        const m = e.meta && typeof e.meta === "object" ? e.meta : {};
        const walletD = Math.floor(Number(e.redDelta) || 0);
        const giveD = Math.floor(Number(m.redGiveawayDelta) || 0);
        if (giveD === 0) continue;
        const postId = m.postId ? String(m.postId).trim() : "";
        const postTitle = m.postTitle != null ? String(m.postTitle).trim() : "";
        const isFromShare = e.kind === "public_post_share_escrow";
        const after =
          m.redGiveawayBalanceAfter != null ? Math.floor(Number(m.redGiveawayBalanceAfter)) : null;
        const titleLine =
          postTitle.length > 0
            ? `โพสต์ «${postTitle.slice(0, 80)}${postTitle.length > 80 ? "…" : ""}»`
            : postId
              ? `โพสต์ ${postId.slice(0, 8)}`
              : "";
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "แชร์โพสต์"}</p>
              <p className="text-xs font-medium text-slate-500">
                {isFromShare
                  ? "แจกให้ผู้แชร์จากการแชร์โพสต์ (ส่วนแดงแจก)"
                  : "คืนยอดคงเหลือจากการแชร์โพสต์ (แดงแจก)"}
                {titleLine ? ` · ${titleLine}` : ""}
                {walletD !== 0 ? (
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                    ส่วนจากกระเป๋าแดง {walletD > 0 ? "+" : ""}
                    {walletD.toLocaleString("th-TH")} ดวง (ดูแท็บแดงเล่นได้)
                  </span>
                ) : null}
              </p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: giveD,
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
        const issueCodeIds = parseLedgerCodeIds(m);
        rows.push({
          id: e.id,
          createdAt: e.createdAt,
          item: (
            <div className="space-y-1">
              <p className="font-medium text-slate-800">{e.label || "—"}</p>
              <p className="text-xs font-medium text-slate-500">
                แจกจากรหัส (สร้างรหัสแจกหัวใจ)
              </p>
            </div>
          ),
          amountDisplay: null,
          amountNumeric: -gd,
          balanceDisplay:
            after != null && Number.isFinite(after)
              ? after.toLocaleString("th-TH")
              : "—",
          issueCodeIds: issueCodeIds.length > 0 ? issueCodeIds : undefined
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
              <p className="text-xs font-medium text-slate-500">
                {roomRedRefundDetailLine(m)}
              </p>
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

/**
 * @param {{ variant?: "play" | "purchase" | "giveaway" | "pink" | "red" | "all"; hideShellPageTitle?: boolean }} props
 */
export default function AccountHeartHistorySection({
  variant = "play",
  hideShellPageTitle = false
}) {
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
        const data = await apiGetMyHeartLedger(
          token,
          mode === "pink"
            ? { limit: 500, offset: 0, pinkOnly: true }
            : { limit: 400, offset: 0 }
        );
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
  }, [user, authLoading, mode]);

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
      <header className="space-y-1">
        {hideShellPageTitle ? null : (
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{heading}</h2>
        )}
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
                    <td className="max-w-md px-4 py-3.5 align-top text-slate-700">
                      {row.item}
                      {Array.isArray(row.issueCodeIds) && row.issueCodeIds.length > 0 ? (
                        <RoomRedIssueExpandBlock codeIds={row.issueCodeIds} />
                      ) : null}
                    </td>
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
