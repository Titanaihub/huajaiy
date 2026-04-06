"use client";

import Link from "next/link";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { getGameShowcaseHeartCostSegments } from "../lib/formatHeartCostLabel";

function IconGamepadHeader({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 11h4M8 9v4M14 10h.01M18 10h.01M15 15h-1v-1h1v1z" strokeLinecap="round" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  );
}

function IconGamepadBtn({ className }) {
  return <IconGamepadHeader className={className} />;
}

function segmentClass(kind) {
  if (kind === "red") return "text-red-600";
  if (kind === "pink") return "text-[#FF2E8C]";
  return "text-neutral-700";
}

/**
 * แกริดการ์ดเกม (แม่แบบใหม่) — ข้อมูลจาก /api/game/list
 * @param {{ games?: Array<{ id: string; title?: string; gameCoverUrl?: string | null; creatorUsername?: string | null; pinkHeartCost?: number; redHeartCost?: number; heartCurrencyMode?: string; acceptsPinkHearts?: boolean }>; creatorFilter?: string }} props
 */
export default function GameShowcaseCatalog({ games = [], creatorFilter = "" }) {
  const creatorNeedle = String(creatorFilter || "").trim().toLowerCase();

  return (
    <section className="space-y-8" aria-labelledby="game-showcase-all-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF4D9A] to-[#FF2E8C] text-white shadow-lg shadow-pink-400/30 sm:h-14 sm:w-14">
            <IconGamepadHeader className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <div>
            <h1 id="game-showcase-all-title" className="text-2xl font-bold text-neutral-900 sm:text-3xl">
              เกมทั้งหมด
            </h1>
            <p className="mt-1 text-sm text-neutral-600 sm:text-base">เลือกเกมที่คุณชอบและเริ่มเล่นเลย!</p>
          </div>
        </div>
      </header>

      {games.length === 0 ? (
        <div className="rounded-2xl border border-pink-100/90 bg-white/90 p-8 text-center shadow-sm">
          <p className="font-medium text-neutral-800">
            {creatorNeedle
              ? `ยังไม่มีเกมที่เปิดแสดงจาก @${creatorNeedle}`
              : "ยังไม่มีเกมที่เปิดแสดง"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {creatorNeedle
              ? "เมื่อผู้สร้างเผยแพร่เกมและเปิดแสดงในรายการ เกมจะปรากฏที่นี่"
              : "เมื่อแอดมินเผยแพร่เกมหรือเปิดแสดงในรายการ เกมจะปรากฏที่นี่ · ดูรายการแบบเดิมด้านล่างได้ที่ «เกมจากระบบ»"}
          </p>
        </div>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => {
            const id = String(g.id || "").trim();
            if (!id) return null;
            const cover = String(g.gameCoverUrl || "").trim();
            const href = `/game/${encodeURIComponent(id)}`;
            const title = String(g.title || "").trim() || "เกม";
            const user = String(g.creatorUsername || "").trim().toLowerCase();
            const costSegments = getGameShowcaseHeartCostSegments(g);
            return (
              <li key={id} className="h-full min-h-0">
                <Link
                  href={href}
                  className="group relative block h-full rounded-2xl outline-none transition duration-300 ease-out hover:z-10 hover:scale-[1.04] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/50 focus-visible:ring-offset-2"
                >
                  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-md shadow-pink-100/40 transition-shadow group-hover:shadow-lg">
                    <div className="flex shrink-0 justify-center px-4 pb-2 pt-4">
                      <div className="relative aspect-square w-full max-w-[188px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#FFE8F2] via-[#FFF0F7] to-[#FFE4EF] shadow-inner ring-1 ring-pink-100/70 sm:max-w-[208px]">
                        <div className="absolute inset-0 p-2.5 sm:p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cover || DEFAULT_CENTRAL_GAME_COVER_PATH}
                            alt=""
                            className="h-full w-full object-contain drop-shadow-sm"
                            width={512}
                            height={512}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                      <h2 className="text-base font-bold leading-snug text-neutral-900 transition-colors group-hover:text-[#FF2E8C] sm:text-lg">
                        {title}
                      </h2>
                      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1 text-sm leading-snug">
                        <span className="shrink-0 font-medium text-red-600">{user ? `@${user}` : "@—"}</span>
                        <span className="min-w-0 break-words">
                          {costSegments.map((seg, i) => (
                            <span key={`${id}-c-${i}`} className={`font-medium ${segmentClass(seg.kind)}`}>
                              {seg.text}
                            </span>
                          ))}
                        </span>
                      </p>
                      <div className="mt-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">รางวัล</span>
                        <p className="mt-0.5 text-sm font-medium text-neutral-700">ตามกติกาเกม</p>
                      </div>
                      <span className="mt-4 inline-flex min-h-[2.75rem] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF2D85] to-[#FF6BA8] py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/25 transition group-hover:brightness-105">
                        <IconGamepadBtn className="h-5 w-5 shrink-0 text-white" />
                        เล่นเลย
                      </span>
                    </div>
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
