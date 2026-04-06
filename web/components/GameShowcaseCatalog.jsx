"use client";

import Link from "next/link";

const HEART_PINK_SRC = "/hearts/pink-heart.png";

/** ตัวอย่างการ์ดตามแม่แบบ UI — ปุ่มเล่นเลยเลื่อนไปยังรายการเกมจริงด้านล่าง */
const SHOWCASE_GAMES = [
  {
    id: "demo-memory",
    title: "Memory Match",
    description: "เกมจับคู่ความจำ",
    icon: "🎯",
    players: "1 คน",
    difficulty: "ง่าย",
    reward: "+100"
  },
  {
    id: "demo-jigsaw",
    title: "Jigsaw Puzzle",
    description: "เกมปริศนาจิ๊กซอว์",
    icon: "🧩",
    players: "1 คน",
    difficulty: "ปานกลาง",
    reward: "+150"
  },
  {
    id: "demo-word",
    title: "Word Sort",
    description: "เกมเรียงคำศัพท์",
    icon: "📝",
    players: "1 คน",
    difficulty: "ปานกลาง",
    reward: "+120"
  },
  {
    id: "demo-quiz",
    title: "Quiz",
    description: "เกมตอบคำถาม",
    icon: "🎓",
    players: "1 คน",
    difficulty: "ยาก",
    reward: "+200"
  },
  {
    id: "demo-runner",
    title: "Coin Runner",
    description: "เกมวิ่งเก็บเหรียญ",
    icon: "🏃",
    players: "1 คน",
    difficulty: "ปานกลาง",
    reward: "+180"
  },
  {
    id: "demo-wheel",
    title: "Spin Wheel",
    description: "เกมหมุนวงล้อ",
    icon: "🎡",
    players: "1 คน",
    difficulty: "ง่าย",
    reward: "+50"
  }
];

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

function IconPeople({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

function IconStarRow({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrophy({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 4H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3M17 4h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3" strokeLinecap="round" />
    </svg>
  );
}

function StatRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-pink-100/90 py-2.5 last:border-b-0">
      <Icon className="h-5 w-5 shrink-0 text-violet-600" />
      <span className="min-w-0 flex-1 text-sm font-medium text-neutral-700">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-[#FF2E8C]">{children}</span>
    </div>
  );
}

/**
 * แกริดการ์ดเกมแบบใหม่ (แม่แบบภาพ) — อยู่ด้านบนของหน้า /game
 */
export default function GameShowcaseCatalog() {
  return (
    <section className="space-y-8" aria-labelledby="game-showcase-all-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/25 sm:h-14 sm:w-14">
            <IconGamepadHeader className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <div>
            <h1 id="game-showcase-all-title" className="text-2xl font-bold text-violet-950 sm:text-3xl">
              เกมทั้งหมด
            </h1>
            <p className="mt-1 text-sm text-neutral-600 sm:text-base">เลือกเกมที่คุณชอบและเริ่มเล่นเลย!</p>
          </div>
        </div>
      </header>

      <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {SHOWCASE_GAMES.map((g) => (
          <li key={g.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-md shadow-pink-100/40 transition hover:shadow-lg">
              <div className="relative flex min-h-[9.5rem] flex-col items-center justify-end bg-gradient-to-b from-[#FF2D85] via-[#d946a6] to-[#7c3aed] px-3 pb-4 pt-6">
                <span className="text-5xl drop-shadow-md" aria-hidden>
                  {g.icon}
                </span>
                <h2 className="mt-2 text-center text-base font-bold leading-tight text-white drop-shadow-sm sm:text-lg">
                  {g.title}
                </h2>
              </div>
              <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                <p className="text-sm leading-relaxed text-neutral-600">{g.description}</p>
                <div className="mt-3 rounded-xl bg-pink-50/50 px-1">
                  <StatRow icon={IconPeople} label="ผู้เล่น">
                    {g.players}
                  </StatRow>
                  <StatRow icon={IconStarRow} label="ความยาก">
                    {g.difficulty}
                  </StatRow>
                  <StatRow icon={IconTrophy} label="รางวัล">
                    <span className="inline-flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={HEART_PINK_SRC} alt="" width={18} height={18} className="h-4 w-4" />
                      {g.reward}
                    </span>
                  </StatRow>
                </div>
                <Link
                  href="/game#legacy-games"
                  scroll
                  className="mt-4 inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF2D85] to-[#8A2BE2] py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/30 transition hover:brightness-105"
                >
                  <IconGamepadBtn className="h-5 w-5 shrink-0 text-white" />
                  เล่นเลย
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
