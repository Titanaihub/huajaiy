"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { gameApiUrl } from "../lib/config";

const MAX_NAV_GAMES = 6;

/**
 * รายการเกมในเมนู「เกมและรางวัล」— แสดงหน้าปก (desktop hover) / ลิงก์ธรรมดา (มือถือ)
 */
export default function NavGamesMenuItem({ navItemClass, gameLobbyThemed }) {
  const [games, setGames] = useState([]);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(gameApiUrl("list"), {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        const data = await r.json().catch(() => ({}));
        if (
          !cancelled &&
          data.ok &&
          Array.isArray(data.games) &&
          data.games.length > 0
        ) {
          setGames(data.games.slice(0, MAX_NAV_GAMES));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openSoon = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const closeDelayed = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const panelClass = gameLobbyThemed
    ? "rounded-xl border border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] shadow-xl"
    : "rounded-xl border border-gray-200 bg-white shadow-xl";
  const thumbTitle = gameLobbyThemed
    ? "text-[11px] font-semibold leading-tight text-[var(--gl-card-title)]"
    : "text-[11px] font-semibold leading-tight text-rose-950";

  return (
    <>
      <div
        className="relative hidden lg:block"
        onMouseEnter={openSoon}
        onMouseLeave={closeDelayed}
      >
        <Link
          href="/game"
          className={`${navItemClass} inline-flex items-center gap-0.5`}
        >
          เกมและรางวัล
          {games.length > 0 ? (
            <span className="text-[10px] opacity-60" aria-hidden>
              ▾
            </span>
          ) : null}
        </Link>
        {open && games.length > 0 ? (
          <div
            className="absolute left-1/2 top-full z-[1100] -translate-x-1/2 pt-1.5"
            role="menu"
            aria-label="เกมแนะนำ"
          >
            <div className={`w-[min(92vw,20rem)] p-3 ${panelClass}`}>
              <p
                className={
                  gameLobbyThemed
                    ? "mb-2 text-xs font-semibold text-[var(--gl-card-muted)]"
                    : "mb-2 text-xs font-semibold text-gray-500"
                }
              >
                เกมแนะนำ
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {games.map((g) => {
                  const id = String(g?.id || "").trim();
                  if (!id) return null;
                  const cover = String(g?.gameCoverUrl || "").trim();
                  const src =
                    cover && /^https:\/\//i.test(cover)
                      ? cover
                      : DEFAULT_CENTRAL_GAME_COVER_PATH;
                  return (
                    <li key={id}>
                      <Link
                        href={`/game/${encodeURIComponent(id)}`}
                        className="block overflow-hidden rounded-lg border border-black/[0.06] bg-slate-50 transition hover:opacity-95"
                        role="menuitem"
                      >
                        <div className="aspect-[2.6/1] w-full overflow-hidden bg-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                            width={260}
                            height={100}
                          />
                        </div>
                        <p
                          className={`line-clamp-2 px-1.5 py-1.5 ${thumbTitle}`}
                        >
                          {String(g?.title || "").trim() || "เกม"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/game"
                className={
                  gameLobbyThemed
                    ? "mt-2 block rounded-lg border border-[color:var(--gl-card-border)] py-2 text-center text-xs font-semibold text-[var(--gl-card-cta)] transition hover:bg-black/[0.03] hover:text-[var(--gl-card-cta-hover)]"
                    : "mt-2 block rounded-lg border border-rose-100 bg-rose-50/80 py-2 text-center text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                }
              >
                ดูทั้งหมด
              </Link>
            </div>
          </div>
        ) : null}
      </div>
      <Link href="/game" className={`${navItemClass} lg:hidden`}>
        เกมและรางวัล
      </Link>
    </>
  );
}
