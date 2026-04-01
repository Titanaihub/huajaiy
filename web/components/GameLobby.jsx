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
export default function GameLobby({ initialGames = [], onBrand = false }) {
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
        <label
          htmlFor="game-search"
          className={onBrand ? "hui-label" : "text-sm font-medium text-hui-body"}
        >
          ค้นหาชื่อเกมหรือยูสเซอร์ผู้สร้าง
        </label>
        <input
          id="game-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์คำค้น…"
          className="mt-1.5 w-full rounded-2xl border border-hui-border bg-white px-4 py-3 text-base text-hui-body shadow-sm outline-none ring-hui-border placeholder:text-hui-placeholder focus:border-hui-cta/50 focus:ring-2 focus:ring-hui-cta/15 sm:text-sm"
          autoComplete="off"
        />
      </div>

      {initialGames.length === 0 ? (
        <div className="rounded-2xl border border-hui-border bg-white p-8 text-center text-sm text-hui-body shadow-sm">
          <p className="font-medium text-hui-body">ยังไม่มีเกมที่เปิดแสดง</p>
          <p className="mt-2 text-sm leading-relaxed text-hui-muted">
            เมื่อแอดมินเผยแพร่เกมหรือเปิดแสดงในรายการ เกมจะปรากฏที่นี่ · ถ้าใช้ฐานข้อมูล PostgreSQL
            ตรวจว่า API เชื่อมต่อและมีเกมที่พร้อมเล่น
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p
          className={
            onBrand
              ? "text-center text-sm text-hui-muted"
              : "text-center text-sm text-hui-muted"
          }
        >
          ไม่พบเกมที่ตรงกับคำค้น
        </p>
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
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hui-border bg-white shadow-sm transition hover:border-hui-cta/30 hover:shadow-md"
                >
                  <div className="flex gap-3 p-4 sm:p-5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hui-border/70 bg-hui-pageTop sm:h-[4.5rem] sm:w-[4.5rem]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover || DEFAULT_CENTRAL_GAME_COVER_PATH}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-base font-semibold leading-snug text-hui-section sm:text-[1.0625rem]">
                        {g.title || "เกม"}
                      </h2>
                      <p className="mt-1.5 text-sm text-hui-muted">
                        ผู้สร้าง:{" "}
                        <span className="font-medium text-hui-body">
                          {g.creatorUsername ? `@${g.creatorUsername}` : "—"}
                        </span>
                      </p>
                      {heartLine ? (
                        <p className="mt-1 text-sm font-medium text-rose-600/90">
                          {heartLine}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {g.description ? (
                    <p className="line-clamp-4 border-t border-hui-border/70 px-4 py-3 text-sm leading-relaxed text-hui-body sm:px-5 sm:py-3.5">
                      {clipDescription(g.description)}
                    </p>
                  ) : (
                    <p className="border-t border-hui-border/70 px-4 py-3 text-sm italic text-hui-muted sm:px-5">
                      ไม่มีคำอธิบายสั้น
                    </p>
                  )}
                  <span className="mt-auto border-t border-hui-border/70 bg-hui-pageTop/80 px-4 py-3 text-center text-sm font-semibold text-hui-section sm:px-5">
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
