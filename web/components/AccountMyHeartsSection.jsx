"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiGetMyHeartLedger,
  apiGetMyRoomRedRedemptions,
  apiRedeemRoomRedGiftCode,
  getMemberToken
} from "../lib/memberApi";
import { publicMemberPath } from "../lib/memberPublicUrls";
import { useMemberAuth } from "./MemberAuthProvider";
import InlineHeart from "./InlineHeart";

function normUser(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

function asDateMs(v) {
  if (!v) return 0;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** ประวัติเรียงใหม่ → เก่า; rewind จากยอดคงเหลือปัจจุบัน */
function buildRowsWithBalance(bal, creatorId, roomHistoryByCreator) {
  const rows = creatorId ? roomHistoryByCreator.get(creatorId) || [] : [];
  let rewind = bal;
  return rows.map((r) => {
    const after = rewind;
    rewind = rewind - (r.isPlus ? r.amount : -r.amount);
    return { ...r, balanceAfter: Math.max(0, Math.floor(Number(after) || 0)) };
  });
}

export default function AccountMyHeartsSection({ hideShellPageTitle = false } = {}) {
  const router = useRouter();
  const { user, loading, refresh } = useMemberAuth();
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [redemptionRows, setRedemptionRows] = useState([]);

  const loadLedger = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setLedgerEntries([]);
      return;
    }
    try {
      const data = await apiGetMyHeartLedger(token, { limit: 500 });
      setLedgerEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setLedgerEntries([]);
    }
  }, []);

  const loadRedemptions = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setRedemptionRows([]);
      return;
    }
    try {
      const data = await apiGetMyRoomRedRedemptions(token, { limit: 1000 });
      setRedemptionRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRedemptionRows([]);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void loadLedger();
      void loadRedemptions();
    }
  }, [loading, user, loadLedger, loadRedemptions]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  const roomRows = Array.isArray(user?.roomGiftRed) ? user.roomGiftRed : [];

  const roomRowsSorted = useMemo(() => {
    const list = [...roomRows];
    list.sort((a, b) => {
      const db = Math.max(0, Math.floor(Number(b.balance) || 0));
      const da = Math.max(0, Math.floor(Number(a.balance) || 0));
      if (db !== da) return db - da;
      return String(normUser(a.creatorUsername)).localeCompare(
        String(normUser(b.creatorUsername)),
        "th"
      );
    });
    return list;
  }, [roomRows]);

  const roomHistoryByCreator = useMemo(() => {
    const out = new Map();
    for (const x of redemptionRows) {
      const creatorId = x?.creatorId != null ? String(x.creatorId) : "";
      if (!creatorId) continue;
      const amount = Math.max(0, Math.floor(Number(x.redAmount) || 0));
      if (amount <= 0) continue;
      const row = {
        createdAt: x.redeemedAt || null,
        code: x.code != null ? String(x.code).trim().toUpperCase() : "—",
        item: "รับหัวใจแดงจากรหัส",
        amount,
        isPlus: true
      };
      if (!out.has(creatorId)) out.set(creatorId, []);
      out.get(creatorId).push(row);
    }
    for (const entry of ledgerEntries) {
      const kind = String(entry?.kind || "");
      const meta = entry?.meta && typeof entry.meta === "object" ? entry.meta : null;
      if (!meta) continue;
      if (kind === "game_start") {
        const byRoom = meta.redFromRoomGifts;
        if (!byRoom || typeof byRoom !== "object") continue;
        const gameTitle = meta.gameTitle != null ? String(meta.gameTitle).trim() : "";
        for (const [creatorIdRaw, usedRaw] of Object.entries(byRoom)) {
          const creatorId = String(creatorIdRaw || "").trim();
          const used = Math.max(0, Math.floor(Number(usedRaw) || 0));
          if (!creatorId || used <= 0) continue;
          const row = {
            createdAt: entry.createdAt || null,
            code: "—",
            item: gameTitle ? `เล่นเกม: ${gameTitle}` : "เล่นเกม",
            amount: used,
            isPlus: false
          };
          if (!out.has(creatorId)) out.set(creatorId, []);
          out.get(creatorId).push(row);
        }
      }
    }
    for (const rows of out.values()) {
      rows.sort((a, b) => asDateMs(b.createdAt) - asDateMs(a.createdAt));
    }
    return out;
  }, [ledgerEntries, redemptionRows]);

  async function onRedeem(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setRedeemBusy(true);
    setRedeemMsg("");
    try {
      const data = await apiRedeemRoomRedGiftCode(token, redeemCode.trim());
      await refresh();
      await loadLedger();
      await loadRedemptions();
      const un = data.creatorUsername ? `@${data.creatorUsername}` : "เจ้าของห้องที่ออกรหัส";
      const added = Math.max(0, Math.floor(Number(data.redAdded) || 0));
      setRedeemMsg(`รับหัวใจแดงสำเร็จ ${added.toLocaleString("th-TH")} ดวง จาก ${un}`);
      setRedeemCode("");
    } catch (ex) {
      setRedeemMsg(ex?.message || "รับหัวใจแดงไม่สำเร็จ");
    } finally {
      setRedeemBusy(false);
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
    <div className="space-y-8">
      <header className="max-w-4xl">
        {hideShellPageTitle ? null : (
          <h2 className="hui-h2">หัวใจแดงจากผู้สร้างเกม</h2>
        )}
      </header>

      <section className="max-w-2xl">
        <h3 className="hui-h3">รหัสรับหัวใจแดง</h3>
        <div className="mt-3 rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
          <form onSubmit={onRedeem} className="flex flex-wrap items-end gap-2">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="กรอกรหัส เช่น RABC12DE3"
              className="min-w-[220px] flex-1 rounded-xl border border-hui-border px-3 py-2 text-sm font-mono uppercase text-hui-body placeholder:text-hui-placeholder"
            />
            <button
              type="submit"
              disabled={redeemBusy || !redeemCode.trim()}
              className="rounded-2xl border border-hui-border bg-hui-pageTop px-4 py-2 text-sm font-semibold text-hui-body shadow-soft hover:bg-white disabled:opacity-50"
            >
              {redeemBusy ? "กำลังรับ..." : "รับหัวใจแดง"}
            </button>
          </form>
          {redeemMsg ? (
            <p className="mt-2 text-sm text-hui-body" role="status">
              {redeemMsg}
            </p>
          ) : null}
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-hui-border/70 pt-3 text-sm">
            <Link
              href="/member/pink-history"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              ประวัติหัวใจชมพู
            </Link>
            <Link
              href="/member/hearts-top-up"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              เติมหัวใจแดง
            </Link>
          </p>
        </div>
      </section>

      <section className="max-w-4xl">
        {roomRowsSorted.length === 0 ? (
          <div className="rounded-2xl border border-hui-border bg-hui-pageTop/90 px-4 py-6 text-center text-sm text-hui-body">
            <p>ยังไม่มียอดหัวใจแดงจากรหัสห้อง — ใส่รหัสในช่องด้านบนเมื่อได้รับจากเจ้าของห้อง</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {roomRowsSorted.map((g) => {
              const bal = Math.max(0, Math.floor(Number(g.balance) || 0));
              const label = g.creatorUsername ? `@${g.creatorUsername}` : "เจ้าของห้อง";
              const creatorId = g.creatorId != null ? String(g.creatorId) : "";
              const rowsWithBalance = buildRowsWithBalance(bal, creatorId, roomHistoryByCreator);

              return (
                <li
                  key={String(g.creatorId ?? label)}
                  className="flex flex-col overflow-hidden rounded-2xl border border-hui-border bg-hui-surface shadow-soft"
                >
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-base font-semibold leading-snug text-hui-section">
                      หัวใจแดงจาก {label}
                    </h3>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-hui-muted">เหลือ</span>
                      <span className="inline-flex items-center gap-1 text-lg font-bold tabular-nums text-red-800">
                        <InlineHeart className="text-red-600" />
                        {bal.toLocaleString("th-TH")}
                      </span>
                      <span className="text-hui-muted">ดวง</span>
                    </p>
                    {g.creatorUsername ? (
                      <p className="text-sm text-hui-muted">
                        <Link
                          href={publicMemberPath(normUser(g.creatorUsername))}
                          className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                        >
                          หน้าโปรไฟล์ @{g.creatorUsername}
                        </Link>
                      </p>
                    ) : null}

                    <details className="mt-2 rounded-xl border border-hui-border bg-hui-pageTop/60 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-hui-section">
                        ดูรายละเอียด (วันที่ · เกม · คงเหลือ)
                      </summary>
                      <div className="mt-2 overflow-x-auto">
                        {rowsWithBalance.length === 0 ? (
                          <p className="text-sm text-hui-muted">
                            ยังไม่มีประวัติการรับ/ใช้หัวใจของผู้สร้างนี้
                          </p>
                        ) : (
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-hui-border text-hui-muted">
                                <th className="px-1 py-1">วันที่</th>
                                <th className="px-1 py-1">รหัส</th>
                                <th className="px-1 py-1">รายการ</th>
                                <th className="px-1 py-1 text-right">จำนวน</th>
                                <th className="px-1 py-1 text-right">คงเหลือ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rowsWithBalance.map((r, idx) => (
                                <tr key={`${r.createdAt || "na"}-${idx}`} className="border-b border-hui-border/60">
                                  <td className="whitespace-nowrap px-1 py-1 text-hui-body">
                                    {r.createdAt
                                      ? new Date(r.createdAt).toLocaleString("th-TH", {
                                          dateStyle: "short",
                                          timeStyle: "short"
                                        })
                                      : "—"}
                                  </td>
                                  <td className="px-1 py-1 font-mono text-hui-body">{r.code || "—"}</td>
                                  <td className="px-1 py-1 text-hui-body">{r.item}</td>
                                  <td
                                    className={`px-1 py-1 text-right tabular-nums font-semibold ${
                                      r.isPlus ? "text-emerald-700" : "text-red-700"
                                    }`}
                                  >
                                    {r.isPlus ? "+" : "-"}
                                    {Math.max(0, Math.floor(Number(r.amount) || 0)).toLocaleString("th-TH")}
                                  </td>
                                  <td className="px-1 py-1 text-right tabular-nums font-semibold text-hui-section">
                                    {Math.max(0, Math.floor(Number(r.balanceAfter) || 0)).toLocaleString("th-TH")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
