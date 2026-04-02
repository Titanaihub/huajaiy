"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiGetMyHeartLedger,
  apiGetMyRoomRedRedemptions,
  apiListPublishedGames,
  apiRedeemRoomRedGiftCode,
  getMemberToken
} from "../lib/memberApi";
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

export default function AccountMyHeartsSection() {
  const router = useRouter();
  const { user, loading, refresh } = useMemberAuth();
  const [games, setGames] = useState([]);
  const [gamesErr, setGamesErr] = useState("");
  const [gamesLoading, setGamesLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [redemptionRows, setRedemptionRows] = useState([]);

  const loadGames = useCallback(async () => {
    setGamesErr("");
    setGamesLoading(true);
    try {
      const data = await apiListPublishedGames();
      setGames(Array.isArray(data.games) ? data.games : []);
    } catch (e) {
      setGamesErr(e?.message || "โหลดรายการเกมไม่สำเร็จ");
      setGames([]);
    } finally {
      setGamesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

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
      router.replace("/hui/login?next=/account/my-hearts");
    }
  }, [loading, user, router]);

  const gamesByCreator = useMemo(() => {
    const m = new Map();
    for (const g of games) {
      const key = normUser(g.creatorUsername);
      if (!key) continue;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(g);
    }
    return m;
  }, [games]);

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

  const pink = Number(user.pinkHeartsBalance ?? 0);
  const roomGift = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];
  const roomRedFromCodesSum = roomGift.reduce(
    (s, x) => s + Math.max(0, Math.floor(Number(x.balance) || 0)),
    0
  );
  const redTotalDisplay = roomRedFromCodesSum;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="hui-h2">หัวใจของฉัน</h2>
      </header>

      <section className="max-w-2xl">
        <div className="rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-hui-section">
            หัวใจชมพู (ยอดสรุปหัวใจที่ได้มา)
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-hui-burgundy md:text-[1.75rem]">
            <InlineHeart className="text-hui-pink" />
            {pink.toLocaleString("th-TH")}
          </p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-hui-section">
            หัวใจแดงจากรหัสห้อง (ใช้งานจริง)
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold text-hui-cta">
            <InlineHeart className="text-hui-cta" />
            {redTotalDisplay.toLocaleString("th-TH")}
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-3 text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
          >
            รีเฟรชยอด
          </button>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link
              href="/account/heart-history/play"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              ประวัติหัวใจ (เล่นเกม)
            </Link>
            <Link
              href="/account/hearts-shop"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              ซื้อหัวใจแดง
            </Link>
            <Link
              href="/game"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              รายการเกมทั้งหมด
            </Link>
          </p>
        </div>
      </section>

      <section className="max-w-2xl">
        <h3 className="hui-h3">หัวใจแดงจากรหัสห้อง (แยกตามเจ้าของห้อง)</h3>
        <div className="mt-3 rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
          <h4 className="text-sm font-semibold text-hui-section">ใส่รหัส (ผู้ใช้งานรับหัวใจแดง)</h4>
          <form onSubmit={onRedeem} className="mt-2 flex flex-wrap items-end gap-2">
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

          {roomGift.length > 0 ? (
            <div className="mt-4 border-t border-hui-border/80 pt-4">
              <p className="mb-3 text-sm font-semibold text-hui-section">แยกตามห้อง</p>
              <ul className="space-y-4">
            {roomGift.map((g) => {
              const bal = Math.max(0, Math.floor(Number(g.balance) || 0));
              const un = normUser(g.creatorUsername);
              const label = g.creatorUsername ? `@${g.creatorUsername}` : "เจ้าของห้อง";
              const creatorGames = un ? gamesByCreator.get(un) || [] : [];
              const creatorId = g.creatorId != null ? String(g.creatorId) : "";
              const rows = creatorId ? roomHistoryByCreator.get(creatorId) || [] : [];
              let rewind = bal;
              const rowsWithBalance = rows.map((r) => {
                const after = rewind;
                rewind = rewind - (r.isPlus ? r.amount : -r.amount);
                return { ...r, balanceAfter: Math.max(0, Math.floor(Number(after) || 0)) };
              });

              return (
                <li
                  key={g.creatorId}
                  className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-amber-950">{label}</p>
                    <p className="text-lg font-bold tabular-nums text-red-800">
                      <span className="inline-flex items-center gap-1">
                        <InlineHeart className="text-red-600" />
                        {bal.toLocaleString("th-TH")}
                      </span>{" "}
                      <span className="text-sm font-normal text-amber-900/80">ดวง</span>
                    </p>
                  </div>
                  {g.creatorUsername ? (
                    <p className="mt-1 text-sm text-amber-900/80">
                      <Link
                        href={`/u/${encodeURIComponent(normUser(g.creatorUsername))}`}
                        className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                      >
                        หน้าโปรไฟล์ @{g.creatorUsername}
                      </Link>
                    </p>
                  ) : null}

                  <div className="mt-3">
                    {gamesLoading ? (
                      <p className="text-sm text-amber-900/70">กำลังโหลดรายการเกม…</p>
                    ) : gamesErr ? (
                      <p className="text-sm text-red-700">{gamesErr}</p>
                    ) : creatorGames.length > 0 ? (
                      <ul className="space-y-2">
                        {creatorGames.map((game) => (
                          <li key={game.id}>
                            <Link
                              href={`/game/${encodeURIComponent(game.id)}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-hui-border bg-white px-3 py-2 text-sm font-semibold text-hui-section shadow-soft transition hover:bg-hui-pageTop"
                            >
                              เล่นเกม: {game.title || "ไม่มีชื่อ"}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-amber-900/85">
                        ยังไม่พบเกมที่เผยแพร่ของ {label} ในรายการตอนนี้ — ลอง{" "}
                        <Link
                          href="/game"
                          className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                        >
                          ดูรายการเกมทั้งหมด
                        </Link>{" "}
                        หรือรอให้เจ้าของห้องเผยแพร่เกม
                      </p>
                    )}
                  </div>

                  <details className="mt-3 rounded-lg border border-amber-200 bg-white/90 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                      ดูรายละเอียด
                    </summary>
                    <div className="mt-2 overflow-x-auto">
                      {rowsWithBalance.length === 0 ? (
                        <p className="text-sm text-amber-900/80">ยังไม่มีประวัติการรับ/ใช้หัวใจของห้องนี้</p>
                      ) : (
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-amber-100 text-amber-900/80">
                              <th className="px-1 py-1">วันที่</th>
                              <th className="px-1 py-1">รหัส</th>
                              <th className="px-1 py-1">รายการ</th>
                              <th className="px-1 py-1 text-right">จำนวน</th>
                              <th className="px-1 py-1 text-right">คงเหลือ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowsWithBalance.map((r, idx) => (
                              <tr key={`${r.createdAt || "na"}-${idx}`} className="border-b border-amber-50">
                                <td className="px-1 py-1 whitespace-nowrap text-hui-body">
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
                                <td className="px-1 py-1 text-right tabular-nums font-semibold text-amber-900">
                                  {Math.max(0, Math.floor(Number(r.balanceAfter) || 0)).toLocaleString("th-TH")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
