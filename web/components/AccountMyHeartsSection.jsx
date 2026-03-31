"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiListPublishedGames } from "../lib/memberApi";
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

  if (loading || !user) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const pink = Number(user.pinkHeartsBalance ?? 0);
  const red = Number(user.redHeartsBalance ?? 0);
  const roomGift = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">หัวใจของฉัน</h2>
        <p className="mt-1 text-sm text-slate-600">
          ตรวจยอดหัวใจทั่วไปและหัวใจแดงที่ได้จากรหัสห้อง — แต่ละเจ้าของห้องใช้เล่นได้เฉพาะเกมที่เขาเผยแพร่ (หรือเกมส่วนกลางที่เปิดรับแดงจากรหัสห้อง)
        </p>
      </header>

      <section className="max-w-2xl">
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-rose-800/80">
            หัวใจชมพู (ใช้ได้ทั่วไปตามกติกาเกม)
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-rose-900">
            <InlineHeart className="text-rose-400" />
            {pink.toLocaleString("th-TH")}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase text-red-900/80">
            หัวใจแดงทั่วไป (ไม่รวมแดงจากรหัสห้อง)
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-800">
            <InlineHeart className="text-red-600" />
            {red.toLocaleString("th-TH")}
          </p>
          <p className="mt-3 text-xs text-rose-900/70">
            รวมในบัญชี {(pink + red).toLocaleString("th-TH")} ดวง (ไม่รวมแดงจากรหัสห้องด้านล่าง)
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
        <p className="mt-1 text-sm text-slate-600">
          ยอดเหล่านี้ใช้หักค่าเข้าเล่นได้เมื่อเล่นเกมของเจ้าของคนนั้นโดยตรง — กดชื่อเกมด้านล่างเพื่อเข้าเล่น
        </p>

        {roomGift.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            ยังไม่มียอดแดงจากรหัสห้อง — แลกรหัสที่เจ้าห้องแจกได้ที่{" "}
            <Link
              href="/account/give-hearts#room-red-redeem"
              className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
            >
              แจกหัวใจ → แลกรหัส
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
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
        )}
      </section>

      <section className="max-w-2xl rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">ผู้สร้าง — ออกรหัสแจกผู้เล่น</p>
        <p className="mt-1">
          ยอดแดงแจกและช่องสร้างรหัสอยู่ที่{" "}
          <Link
            href="/account/give-hearts"
            className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
          >
            เมนูผู้สร้าง → แจกหัวใจ
          </Link>
        </p>
      </section>
    </div>
  );
}
