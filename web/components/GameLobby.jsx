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
 * @param {{ initialGames: Array<{ id: string; title: string; description?: string; gameCoverUrl?: string | null; creatorUsername?: string | null; pinkHeartCost?: number; redHeartCost?: number }>; onBrand?: boolean; gameLobbyThemed?: boolean; creatorUsernameFilter?: string }} props
 */
export default function GameLobby({
  initialGames = [],
  onBrand = false,
  gameLobbyThemed = false,
  creatorUsernameFilter = ""
}) {
  const [q, setQ] = useState("");
  const creatorNeedle = String(creatorUsernameFilter || "").trim().toLowerCase();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initialGames;
    return initialGames.filter((g) => {
      const title = String(g.title || "").toLowerCase();
      const creator = String(g.creatorUsername || "").toLowerCase();
      return title.includes(needle) || creator.includes(needle);
    });
  }, [initialGames, q]);

  const labelClass = gameLobbyThemed
    ? "text-sm font-medium text-[var(--gl-search-label)]"
    : onBrand
      ? "hui-label"
      : "text-sm font-medium text-hui-body";

  const inputClass = gameLobbyThemed
    ? "mt-1.5 w-full rounded-2xl border border-[color:var(--gl-search-border)] bg-[var(--gl-search-bg)] px-4 py-3 text-base text-[var(--gl-search-text)] shadow-sm outline-none placeholder:text-[var(--gl-search-ph)] focus:border-[color:var(--gl-card-heart)] focus:ring-2 focus:ring-rose-300/35 sm:text-sm"
    : "mt-1.5 w-full rounded-2xl border border-hui-border bg-white px-4 py-3 text-base text-hui-body shadow-sm outline-none ring-hui-border placeholder:text-hui-placeholder focus:border-hui-cta/50 focus:ring-2 focus:ring-hui-cta/15 sm:text-sm";

  const cardShell =
    "group flex h-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition hover:shadow-md";
  const cardClass = gameLobbyThemed
    ? `${cardShell} border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] hover:border-[color:var(--gl-card-cta-hover)]`
    : `${cardShell} border-hui-border bg-white hover:border-hui-cta/35`;

  const mediaShell = gameLobbyThemed
    ? "relative aspect-[2.6/1] min-h-[120px] w-full shrink-0 overflow-hidden rounded-t-2xl border-b border-[color:var(--gl-card-border)] bg-[var(--gl-card-media-bg)] sm:min-h-[132px]"
    : "relative aspect-[2.6/1] min-h-[120px] w-full shrink-0 overflow-hidden rounded-t-2xl border-b border-hui-border/70 bg-slate-100 sm:min-h-[132px]";

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="game-search" className={labelClass}>
          ค้นหาชื่อเกมหรือยูสเซอร์ผู้สร้าง
        </label>
        <input
          id="game-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์คำค้น…"
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {initialGames.length === 0 ? (
        <div
          className={
            gameLobbyThemed
              ? "rounded-2xl border border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] p-8 text-center text-sm text-[var(--gl-empty-text)] shadow-sm"
              : "rounded-2xl border border-hui-border bg-white p-8 text-center text-sm text-hui-body shadow-sm"
          }
        >
          <p
            className={
              gameLobbyThemed ? "font-medium text-[var(--gl-empty-text)]" : "font-medium text-hui-body"
            }
          >
            {creatorNeedle
              ? `ยังไม่มีเกมที่เปิดแสดงจาก @${creatorNeedle}`
              : "ยังไม่มีเกมที่เปิดแสดง"}
          </p>
          <p
            className={
              gameLobbyThemed
                ? "mt-2 text-sm leading-relaxed text-[var(--gl-empty-muted)]"
                : "mt-2 text-sm leading-relaxed text-hui-muted"
            }
          >
            {creatorNeedle
              ? "เมื่อผู้สร้างเผยแพร่เกมและเปิดแสดงในรายการ เกมจะปรากฏที่นี่"
              : "เมื่อแอดมินเผยแพร่เกมหรือเปิดแสดงในรายการ เกมจะปรากฏที่นี่ · ถ้าใช้ฐานข้อมูล PostgreSQL ตรวจว่า API เชื่อมต่อและมีเกมที่พร้อมเล่น"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p
          className={
            gameLobbyThemed
              ? "text-center text-sm text-[var(--gl-card-muted)]"
              : "text-center text-sm text-hui-muted"
          }
        >
          ไม่พบเกมที่ตรงกับคำค้น
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((g) => {
            const cover = String(g.gameCoverUrl || "").trim();
            const href = `/game/${encodeURIComponent(g.id)}`;
            const heartLine = formatCentralLobbyHeartLine(g);
            return (
              <li key={g.id}>
                <Link href={href} className={cardClass}>
                  <div className={mediaShell}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover || DEFAULT_CENTRAL_GAME_COVER_PATH}
                      alt=""
                      className="h-full w-full object-cover transition duration-200 group-hover:opacity-95"
                      width={640}
                      height={246}
                    />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-4">
                    <h2
                      className={
                        gameLobbyThemed
                          ? "line-clamp-2 text-base font-semibold leading-snug text-[var(--gl-card-title)]"
                          : "line-clamp-2 text-base font-semibold leading-snug text-hui-section"
                      }
                    >
                      {g.title || "เกม"}
                    </h2>
                    <p
                      className={
                        gameLobbyThemed
                          ? "mt-1.5 text-sm text-[var(--gl-card-muted)]"
                          : "mt-1.5 text-sm text-hui-muted"
                      }
                    >
                      ผู้สร้าง:{" "}
                      <span
                        className={
                          gameLobbyThemed
                            ? "font-medium text-[var(--gl-card-body)]"
                            : "font-medium text-hui-body"
                        }
                      >
                        {g.creatorUsername ? `@${g.creatorUsername}` : "—"}
                      </span>
                    </p>
                    {heartLine ? (
                      <p
                        className={
                          gameLobbyThemed
                            ? "mt-1 text-sm font-medium text-[var(--gl-card-heart)]"
                            : "mt-1 text-sm font-medium text-rose-600/90"
                        }
                      >
                        {heartLine}
                      </p>
                    ) : null}
                    {g.description ? (
                      <p
                        className={
                          gameLobbyThemed
                            ? "mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--gl-card-body)]"
                            : "mt-2 line-clamp-3 text-sm leading-relaxed text-hui-body"
                        }
                      >
                        {clipDescription(g.description)}
                      </p>
                    ) : (
                      <p
                        className={
                          gameLobbyThemed
                            ? "mt-2 text-sm italic text-[var(--gl-card-muted)]"
                            : "mt-2 text-sm italic text-hui-muted"
                        }
                      >
                        ไม่มีคำอธิบายสั้น
                      </p>
                    )}
                    <span
                      className={
                        gameLobbyThemed
                          ? "mt-auto border-t border-[color:var(--gl-card-border)] pt-3 text-center text-sm font-semibold text-[var(--gl-card-cta)] group-hover:text-[var(--gl-card-cta-hover)]"
                          : "mt-auto border-t border-hui-border/60 pt-3 text-center text-sm font-semibold text-hui-section group-hover:text-hui-cta"
                      }
                    >
                      เข้าเล่นเกมนี้
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
