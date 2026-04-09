"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiGetIncomingPrizeAwards,
  apiGetIncomingPrizeWithdrawals,
  getMemberToken
} from "../lib/memberApi";
import {
  apiAdminCentralGameActivate,
  apiAdminCentralGameDelete,
  apiAdminCentralGameDeactivate,
  apiAdminCentralGamesList
} from "../lib/rolesApi";
import { publicCentralGamePlayPath } from "../lib/publicGamePaths";
import { useMemberAuth } from "./MemberAuthProvider";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DELETE_BLOCKED_AWARD_HINT =
  "เกมนี้มีผู้ได้รับรางวัลแล้ว — ไม่สามารถลบได้";
const DELETE_BLOCKED_PLAY_HINT =
  "เกมนี้มีประวัติการเล่นและยังเผยแพร่/เปิดใช้งานอยู่ — หยุดเผยแพร่ก่อนแล้วค่อยลบ";

const PRIZE_CAT_LABEL = {
  cash: "เงินสด",
  item: "สิ่งของ",
  voucher: "บัตรกำนัล",
  none: "ไม่มีรางวัล"
};

function formatShortDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function formatBahtInt(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString("th-TH");
}

function parseCashBahtFromAward(a) {
  if (!a || String(a.prizeCategory) !== "cash") return 0;
  const raw = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(" ");
  const m = String(raw).replace(/,/g, "").match(/[\d]+(?:\.[\d]+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function itemStatusLabelThai(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "ready_pickup") return "พร้อมให้รับเอง";
  if (s === "shipped") return "จัดส่งแล้ว";
  if (s === "completed") return "รับของเรียบร้อย";
  return "รอผู้สร้างกำหนดวิธีรับ";
}

function prizeLineText(a) {
  if (!a) return "รางวัล";
  const cat = PRIZE_CAT_LABEL[a.prizeCategory] || "รางวัล";
  const title = String(a.prizeTitle || "").trim();
  const val = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(" ").trim();
  if (title && val) return `${title} (${cat}) — ${val}`;
  if (title) return `${title} (${cat})`;
  if (val) return `${cat} — ${val}`;
  return cat;
}

function cashDeliveryLabel(a) {
  const m = String(a.prizeFulfillmentMode || "").toLowerCase();
  if (m === "pickup") return "มารับเอง";
  return "โอนให้สมาชิก";
}

function withdrawalStatusThai(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "รออนุมัติ";
  if (s === "approved") return "อนุมัติแล้ว (จ่ายแล้ว)";
  if (s === "rejected") return "ปฏิเสธ";
  if (s === "cancelled") return "ยกเลิกโดยผู้ขอ";
  return status || "—";
}

function winnerDisplay(a) {
  const player = [a.winnerFirstName, a.winnerLastName].filter(Boolean).join(" ").trim();
  const un = String(a.winnerUsername || "").replace(/^@+/, "").trim();
  return {
    handle: un ? `@${un}` : "—",
    name: player || ""
  };
}

/** สถานะที่ผู้สร้างต้องจ่าย/ส่ง — เงินสดอ้างอิงคำขอถอนรวมของสมาชิกกับคุณ (ไม่แยกตามเกมในระบบ) */
function renderAwardPayoutColumn(a, withdrawalsForWinner) {
  const cat = String(a.prizeCategory || "");
  if (cat === "item") {
    return (
      <div className="space-y-1">
        <p className="font-medium text-hui-body">{itemStatusLabelThai(a.itemFulfillmentStatus)}</p>
        {a.prizeFulfillmentMode === "pickup" && a.winnerPickupAckAt ? (
          <p className="text-xs text-emerald-800">
            ผู้เล่นกดรับแล้ว (มารับเอง): {formatShortDate(a.winnerPickupAckAt)}
          </p>
        ) : null}
        {a.itemTrackingCode ? (
          <p className="text-xs text-hui-muted">เลขพัสดุ: {a.itemTrackingCode}</p>
        ) : null}
      </div>
    );
  }
  if (cat === "cash") {
    const baht = parseCashBahtFromAward(a);
    const wdList = Array.isArray(withdrawalsForWinner) ? withdrawalsForWinner : [];
    const pendingSum = wdList
      .filter((w) => String(w.status) === "pending")
      .reduce((s, w) => s + Math.max(0, Math.floor(Number(w.amountThb) || 0)), 0);
    return (
      <div className="space-y-1.5 text-sm">
        <p>
          <span className="font-semibold tabular-nums">{formatBahtInt(baht)} ฿</span>
          <span className="text-hui-muted"> · {cashDeliveryLabel(a)}</span>
        </p>
        <p className="text-xs leading-relaxed text-hui-muted">
          ระบบถอนเงินรวมยอดจากทุกเกมของคุณ — รายการด้านล่างเป็นคำขอของสมาชิกท่านนี้ต่อบัญชีคุณ (ไม่แยกเป็นทีละเกม)
        </p>
        {wdList.length === 0 ? (
          <p className="text-hui-body">ยังไม่มีคำขอถอน — ยังไม่ได้จ่ายผ่านเมนูถอนรางวัล</p>
        ) : (
          <ul className="space-y-1 text-hui-body">
            {wdList.slice(0, 6).map((w) => (
              <li key={w.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={
                    String(w.status) === "pending"
                      ? "font-semibold text-amber-900"
                      : String(w.status) === "approved"
                        ? "font-medium text-emerald-900"
                        : "text-hui-body"
                  }
                >
                  {withdrawalStatusThai(w.status)}
                </span>
                <span className="tabular-nums">{formatBahtInt(w.amountThb)} ฿</span>
                <span className="text-xs text-hui-muted">{formatShortDate(w.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        {wdList.length > 6 ? (
          <p className="text-xs text-hui-muted">แสดง 6 รายการล่าสุด จากทั้งหมด {wdList.length} รายการ</p>
        ) : null}
        {pendingSum > 0 ? (
          <p className="text-xs font-medium text-amber-950">
            รวมคำขอที่รอคุณโอน/อนุมัติ (ทุกเกม): {formatBahtInt(pendingSum)} ฿
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <p className="text-sm text-hui-muted">
      {cat === "voucher"
        ? "ใช้สิทธิ์ตามกติกา — ไม่มีขั้นตอนถอนผ่านระบบนี้"
        : "ติดตามการใช้สิทธิ์ตามกติกาในเกม"}
    </p>
  );
}

function canDeleteGame(g) {
  const awardCount = Number(g?.prizeAwardCount) || 0;
  const playCount = Number(g?.playCount) || 0;
  const activeOrPublished = Boolean(g?.isActive || g?.isPublished);
  if (awardCount > 0) return false;
  if (playCount > 0 && activeOrPublished) return false;
  return true;
}

function deleteBlockedHint(g) {
  const awardCount = Number(g?.prizeAwardCount) || 0;
  const playCount = Number(g?.playCount) || 0;
  const activeOrPublished = Boolean(g?.isActive || g?.isPublished);
  if (awardCount > 0) return DELETE_BLOCKED_AWARD_HINT;
  if (playCount > 0 && activeOrPublished) return DELETE_BLOCKED_PLAY_HINT;
  return undefined;
}

function gameStatusBadge(g) {
  if (g.isPublished) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200/80">
        เผยแพร่แล้ว
      </span>
    );
  }
  if (g.isActive) {
    return (
      <span className="rounded-full bg-hui-pageTop px-2.5 py-0.5 text-sm font-medium text-hui-section ring-1 ring-hui-border">
        กำลังเปิดใช้
      </span>
    );
  }
  return (
    <span className="rounded-full bg-hui-pageTop px-2 py-0.5 text-sm font-medium text-hui-body">
      ร่าง
    </span>
  );
}

export default function AccountMyGamesList({ hideShellPageTitle = false } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useMemberAuth();
  const [games, setGames] = useState([]);
  const [listErr, setListErr] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [publishSuccessBanner, setPublishSuccessBanner] = useState(false);
  const [incomingAwards, setIncomingAwards] = useState([]);
  const [incomingWithdrawals, setIncomingWithdrawals] = useState([]);
  const [prizeMetaLoading, setPrizeMetaLoading] = useState(false);

  const awardsByGameId = useMemo(() => {
    const m = new Map();
    for (const a of incomingAwards) {
      const gid = a?.gameId != null ? String(a.gameId) : "";
      if (!gid) continue;
      if (!m.has(gid)) m.set(gid, []);
      m.get(gid).push(a);
    }
    for (const [, arr] of m) {
      arr.sort((x, y) => {
        const tx = new Date(x.wonAt || 0).getTime();
        const ty = new Date(y.wonAt || 0).getTime();
        return ty - tx;
      });
    }
    return m;
  }, [incomingAwards]);

  const withdrawalsByRequesterId = useMemo(() => {
    const m = new Map();
    for (const w of incomingWithdrawals) {
      const uid = w?.requesterUserId != null ? String(w.requesterUserId) : "";
      if (!uid) continue;
      if (!m.has(uid)) m.set(uid, []);
      m.get(uid).push(w);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
    }
    return m;
  }, [incomingWithdrawals]);

  async function loadGames() {
    setListLoading(true);
    setListErr("");
    const token = getMemberToken();
    if (!token) {
      setListLoading(false);
      return;
    }
    try {
      const data = await apiAdminCentralGamesList(token);
      setGames(data.games || []);
    } catch (e) {
      setListErr(e?.message || "โหลดรายการไม่สำเร็จ");
      setGames([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("published") !== "1") return;
    setPublishSuccessBanner(true);
    router.replace("/account/my-games", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadGames();
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setPrizeMetaLoading(true);
      try {
        const token = getMemberToken();
        if (!token) {
          setIncomingAwards([]);
          setIncomingWithdrawals([]);
          return;
        }
        const [aData, wData] = await Promise.all([
          apiGetIncomingPrizeAwards(token, { limit: 5000 }),
          apiGetIncomingPrizeWithdrawals(token)
        ]);
        if (cancelled) return;
        setIncomingAwards(Array.isArray(aData?.awards) ? aData.awards : []);
        setIncomingWithdrawals(Array.isArray(wData?.withdrawals) ? wData.withdrawals : []);
      } catch {
        if (!cancelled) {
          setIncomingAwards([]);
          setIncomingWithdrawals([]);
        }
      } finally {
        if (!cancelled) setPrizeMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function togglePublish(game, nextPublish) {
    const id = String(game?.id || "");
    if (!id || !UUID_RE.test(id)) return;
    const token = getMemberToken();
    if (!token) {
      setListErr("หมดเซสชัน — กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    setBusyId(id);
    setListErr("");
    try {
      if (nextPublish) {
        await apiAdminCentralGameActivate(token, id);
      } else {
        await apiAdminCentralGameDeactivate(token, id);
      }
      await loadGames();
    } catch (e) {
      setListErr(e?.message || "อัปเดตสถานะเกมไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  async function removeGame(game) {
    const id = String(game?.id || "");
    if (!id || !UUID_RE.test(id)) return;
    if (!canDeleteGame(game)) {
      setListErr(deleteBlockedHint(game) || "ไม่สามารถลบเกมนี้ได้");
      return;
    }
    if (!window.confirm(`ลบเกม「${game?.title || "ไม่มีชื่อ"}」ถาวร?`)) return;
    const token = getMemberToken();
    if (!token) {
      setListErr("หมดเซสชัน — กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    setBusyId(id);
    setListErr("");
    try {
      await apiAdminCentralGameDelete(token, id);
      await loadGames();
    } catch (e) {
      setListErr(e?.message || "ลบเกมไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  if (loading || !user) {
    return (
      <p className="text-sm text-hui-muted" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        {hideShellPageTitle ? null : (
          <h2 className="text-xl font-semibold text-hui-section sm:text-2xl">เกมของฉัน</h2>
        )}
        <p className={`text-sm text-hui-body ${hideShellPageTitle ? "" : "mt-1"}`}>
          เกมที่คุณสร้างจะเก็บไว้ในบัญชีนี้ — ล็อกเอาต์แล้วล็อกอินใหม่เกมยังอยู่ที่นี่
        </p>
      </div>

      <p className="text-sm">
        <Link
          href="/account/create-game"
          className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
        >
          + เปิดห้องเกมใหม่
        </Link>
      </p>

      {publishSuccessBanner ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold">เผยแพร่สำเร็จ</p>
          <p className="mt-1 text-emerald-900/90">
            เกมของคุณแสดงในรายการด้านล่างแล้ว — กด「ดูหน้าเล่น」หรือ「จัดการเกม」ได้ตามต้องการ
          </p>
        </div>
      ) : null}

      {listErr ? (
        <p className="text-sm text-red-600" role="alert">
          {listErr}
        </p>
      ) : null}

      {listLoading ? (
        <p className="text-sm text-hui-muted">กำลังโหลดรายการเกม…</p>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hui-border bg-hui-surface/90 p-6 text-center text-sm text-hui-muted shadow-soft">
          <p>ยังไม่มีเกมที่สร้างจากบัญชีนี้</p>
          <p className="mt-2">
            <Link
              href="/account/create-game"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              ไปหน้าเปิดห้องเกม
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {games.map((g) => {
            const id = g.id;
            const canPreview = Boolean(g.isPublished || g.isActive) && id && UUID_RE.test(id);
            const idStr = id != null ? String(id) : "";
            const gameAwards = awardsByGameId.get(idStr) || [];
            const awardCount = gameAwards.length;
            return (
              <li
                key={id}
                className="flex flex-col gap-3 rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="hui-card-title">{g.title || "ไม่มีชื่อ"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {gameStatusBadge(g)}
                      {g.gameCode ? (
                        <span className="hui-card-meta">รหัส {g.gameCode}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canPreview ? (
                      <Link
                        href={publicCentralGamePlayPath(g)}
                        className="rounded-2xl border border-hui-border bg-white px-3 py-2 text-sm font-medium text-hui-body shadow-soft hover:bg-hui-pageTop"
                      >
                        ดูหน้าเล่น
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === id || !id || !UUID_RE.test(id)}
                      onClick={() => togglePublish(g, !Boolean(g.isPublished || g.isActive))}
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                        g.isPublished || g.isActive
                          ? "border border-hui-border bg-white text-hui-body shadow-soft hover:bg-hui-pageTop"
                          : "bg-emerald-600 text-white shadow-soft hover:bg-emerald-700"
                      }`}
                    >
                      {busyId === id
                        ? "กำลังบันทึก…"
                        : g.isPublished || g.isActive
                          ? "หยุดเผยแพร่"
                          : "เผยแพร่"}
                    </button>
                    <Link
                      href={`/member/game-studio?game=${encodeURIComponent(id)}&edit=full`}
                      className="rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
                      title="เพิ่มรางวัลใหม่ได้ แต่ไม่ควรแก้ไขรางวัลเดิม"
                    >
                      เพิ่มรางวัล
                    </Link>
                    <Link
                      href={`/member/game-studio?game=${encodeURIComponent(id)}&edit=full`}
                      className="hui-btn-primary px-3 py-2 text-sm"
                    >
                      จัดการเกม
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === id || !id || !UUID_RE.test(id) || !canDeleteGame(g)}
                      title={deleteBlockedHint(g)}
                      onClick={() => removeGame(g)}
                      className="rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === id ? "กำลังลบ…" : "ลบเกม"}
                    </button>
                  </div>
                </div>

                <details className="rounded-xl border border-hui-border/90 bg-hui-pageTop/50 open:bg-hui-pageTop">
                  <summary className="cursor-pointer list-none px-3 py-2.5 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-semibold text-hui-section">
                      รายละเอียดรางวัล
                      {prizeMetaLoading ? (
                        <span className="text-hui-muted"> (กำลังโหลด…)</span>
                      ) : (
                        <span className="text-hui-muted"> ({awardCount})</span>
                      )}
                    </span>
                    <p className="mt-0.5 text-xs text-hui-muted">
                      ใครได้รางวัลอะไร · สถานะส่งของ / คำขอถอนเงิน (ดูคำขอถอนทั้งหมดได้ที่เมนูถอนรางวัล)
                    </p>
                  </summary>
                  <div className="border-t border-hui-border/70 px-2 pb-3 pt-1">
                    {prizeMetaLoading ? (
                      <p className="px-2 py-3 text-sm text-hui-muted">กำลังโหลดประวัติรางวัล…</p>
                    ) : awardCount === 0 ? (
                      <p className="px-2 py-3 text-sm text-hui-muted">ยังไม่มีผู้ได้รับรางวัลจากเกมนี้</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-hui-border/80 text-sm">
                          <thead className="bg-white/80 text-left text-xs font-semibold uppercase tracking-wide text-hui-body">
                            <tr>
                              <th className="whitespace-nowrap px-2 py-2">เมื่อ</th>
                              <th className="whitespace-nowrap px-2 py-2">ผู้เล่น</th>
                              <th className="min-w-[140px] px-2 py-2">รางวัล</th>
                              <th className="min-w-[200px] px-2 py-2">สถานะจ่าย / ถอน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hui-border/60">
                            {gameAwards.map((a) => {
                              const w = winnerDisplay(a);
                              const wd =
                                withdrawalsByRequesterId.get(String(a.winnerUserId || "")) || [];
                              return (
                                <tr key={a.id} className="align-top">
                                  <td className="whitespace-nowrap px-2 py-2.5 text-hui-body">
                                    {formatShortDate(a.wonAt)}
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <div className="font-medium text-hui-section">{w.handle}</div>
                                    {w.name ? (
                                      <div className="text-xs text-hui-muted">{w.name}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2.5 text-hui-body">
                                    <div>{prizeLineText(a)}</div>
                                    <div className="mt-0.5 text-xs text-hui-muted">
                                      ชุดที่ {Math.max(0, Math.floor(Number(a.setIndex)) || 0) + 1}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2.5">{renderAwardPayoutColumn(a, wd)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="mt-2 px-2 text-xs text-hui-muted">
                      จัดการคำขอถอนเงินและอัปโหลดสลิปได้ที่{" "}
                      <Link
                        href="/account/creator-withdrawals"
                        className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                      >
                        คำขอถอนรางวัลถึงฉัน
                      </Link>
                    </p>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-hui-body">
        <Link
          href="/account"
          className="text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
        >
          ← ภาพรวมบัญชี
        </Link>
      </p>
    </div>
  );
}
