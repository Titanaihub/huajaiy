"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { formatCentralLobbyHeartLine } from "../lib/formatHeartCostLabel";

const DESC_LEN = 180;

function clipDescription(text) {
  const s = String(text || "").trim();
  if (s.length <= DESC_LEN) return s;
  return `${s.slice(0, DESC_LEN).trim()}…`;
}

/**
 * @param {{ initialGames: Array<{ id: string; title: string; description?: string; gameCoverUrl?: string | null; creatorUsername?: string | null; pinkHeartCost?: number; redHeartCost?: number }> }} props
 */
export default function GameLobby({ initialGames = [] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initialGames;
    return initialGames.filter((g) => {
      const title = String(g.title || "").toLowerCase();
      const creator = String(g.creatorUsername || "").toLowerCase();
      return title.includes(needle) || creator.includes(needle);
    });
  }, [initialGames, q]);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="game-search" className="text-xs font-medium text-slate-600">
          ค้นหาชื่อเกมหรือยูสเซอร์ผู้สร้าง
        </label>
        <input
          id="game-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์คำค้น…"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-brand-200 placeholder:text-slate-400 focus:border-brand-300 focus:ring-2"
          autoComplete="off"
        />
      </div>

      {initialGames.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-800">ยังไม่มีเกมที่เปิดแสดง</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            เมื่อแอดมินเผยแพร่เกมหรือเปิดแสดงในรายการ เกมจะปรากฏที่นี่ · ถ้าใช้ฐานข้อมูล PostgreSQL
            ตรวจว่า API เชื่อมต่อและมีเกมที่พร้อมเล่น
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500">ไม่พบเกมที่ตรงกับคำค้น</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => {
            const cover = String(g.gameCoverUrl || "").trim();
            const href = `/game/${encodeURIComponent(g.id)}`;
            const heartLine = formatCentralLobbyHeartLine(g);
            return (
              <li key={g.id}>
                <Link
                  href={href}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md"
                >
                  <div className="flex gap-3 p-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover || DEFAULT_CENTRAL_GAME_COVER_PATH}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">
                        {g.title || "เกม"}
                      </h2>
                      <p className="mt-1 text-[11px] text-slate-500">
                        ผู้สร้าง:{" "}
                        <span className="font-medium text-slate-700">
                          {g.creatorUsername ? `@${g.creatorUsername}` : "—"}
                        </span>
                      </p>
                      {heartLine ? (
                        <p className="mt-0.5 text-[10px] text-rose-600/90">{heartLine}</p>
                      ) : null}
                    </div>
                  </div>
                  {g.description ? (
                    <p className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600 line-clamp-4">
                      {clipDescription(g.description)}
                    </p>
                  ) : (
                    <p className="border-t border-slate-100 px-4 py-3 text-xs italic text-slate-400">
                      ไม่มีคำอธิบายสั้น
                    </p>
                  )}
                  <span className="mt-auto border-t border-slate-100 bg-brand-50/60 px-4 py-2.5 text-center text-xs font-semibold text-brand-900">
                    เข้าเล่นเกมนี้
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
