"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiListPublishedGames, apiRedeemRoomRedGiftCode, getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";
import InlineHeart from "./InlineHeart";

function normUser(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/my-hearts");
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

  async function onRedeem(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setRedeemBusy(true);
    setRedeemMsg("");
    try {
      const data = await apiRedeemRoomRedGiftCode(token, redeemCode.trim());
      await refresh();
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
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const pink = Number(user.pinkHeartsBalance ?? 0);
  const playableRed = Math.max(0, Math.floor(Number(user.redHeartsBalance) || 0));
  const roomGift = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];
  const roomRedFromCodesSum = roomGift.reduce(
    (s, x) => s + Math.max(0, Math.floor(Number(x.balance) || 0)),
    0
  );
  const redTotalDisplay = playableRed + roomRedFromCodesSum;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">หัวใจของฉัน</h2>
      </header>

      <section className="max-w-2xl">
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-rose-800/80">
            หัวใจชมพู (ยอดสรุปหัวใจที่ได้มา)
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-rose-900">
            <InlineHeart className="text-rose-400" />
            {pink.toLocaleString("th-TH")}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase text-red-900/80">
            หัวใจแดง (รวมจากทุกห้อง,เล่นได้เฉพาะห้องหรือเกมส่วนกลางที่กำหนด)
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-800">
            <InlineHeart className="text-red-600" />
            {redTotalDisplay.toLocaleString("th-TH")}
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-3 text-xs font-semibold text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
          >
            รีเฟรชยอด
          </button>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link
              href="/account/heart-history/play"
              className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              ประวัติหัวใจ (เล่นเกม)
            </Link>
            <Link
              href="/account/hearts-shop"
              className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              ซื้อหัวใจแดง
            </Link>
            <Link
              href="/game"
              className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              รายการเกมทั้งหมด
            </Link>
          </p>
        </div>
      </section>

      <section className="max-w-2xl">
        <h3 className="text-base font-semibold text-slate-900">หัวใจแดงจากรหัสห้อง (แยกตามเจ้าของห้อง)</h3>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-800">ใส่รหัส (ผู้ใช้งานรับหัวใจแดง)</h4>
          <form onSubmit={onRedeem} className="mt-2 flex flex-wrap items-end gap-2">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="กรอกรหัส เช่น RABC12DE3"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
            />
            <button
              type="submit"
              disabled={redeemBusy || !redeemCode.trim()}
              className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
            >
              {redeemBusy ? "กำลังรับ..." : "รับหัวใจแดง"}
            </button>
          </form>
          {redeemMsg ? (
            <p className="mt-2 text-sm text-slate-700" role="status">
              {redeemMsg}
            </p>
          ) : null}

          {roomGift.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-semibold text-slate-700">แยกตามห้อง</p>
              <ul className="space-y-4">
            {roomGift.map((g) => {
              const bal = Math.max(0, Math.floor(Number(g.balance) || 0));
              const un = normUser(g.creatorUsername);
              const label = g.creatorUsername ? `@${g.creatorUsername}` : "เจ้าของห้อง";
              const creatorGames = un ? gamesByCreator.get(un) || [] : [];

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
                    <p className="mt-1 text-xs text-amber-900/80">
                      <Link
                        href={`/u/${encodeURIComponent(normUser(g.creatorUsername))}`}
                        className="font-medium text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                      >
                        หน้าโปรไฟล์ @{g.creatorUsername}
                      </Link>
                    </p>
                  ) : null}

                  <div className="mt-3">
                    {gamesLoading ? (
                      <p className="text-xs text-amber-900/70">กำลังโหลดรายการเกม…</p>
                    ) : gamesErr ? (
                      <p className="text-xs text-red-700">{gamesErr}</p>
                    ) : creatorGames.length > 0 ? (
                      <ul className="space-y-2">
                        {creatorGames.map((game) => (
                          <li key={game.id}>
                            <Link
                              href={`/game/${encodeURIComponent(game.id)}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-900 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-brand-50"
                            >
                              เล่นเกม: {game.title || "ไม่มีชื่อ"}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-900/85">
                        ยังไม่พบเกมที่เผยแพร่ของ {label} ในรายการตอนนี้ — ลอง{" "}
                        <Link
                          href="/game"
                          className="font-semibold text-brand-800 underline underline-offset-2"
                        >
                          ดูรายการเกมทั้งหมด
                        </Link>{" "}
                        หรือรอให้เจ้าของห้องเผยแพร่เกม
                      </p>
                    )}
                  </div>
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
