"use client";

import { useCallback, useMemo, useState } from "react";

const PRIZES = [
  { key: "cash", label: "เงินสด 1,000 บาท", emoji: "💵", need: 5 },
  { key: "coffee", label: "กาแฟ 1 กล่อง", emoji: "☕", need: 4 },
  { key: "discount", label: "ส่วนลด 20%", emoji: "🎫", need: 3 }
];

function buildDeck() {
  const list = [];
  for (const p of PRIZES) {
    for (let i = 0; i < p.need; i += 1) {
      list.push(p.key);
    }
  }
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.map((key, index) => ({ key, index, revealed: false }));
}

export default function FlipGameDemo() {
  const [cards, setCards] = useState(() => buildDeck());
  const [winner, setWinner] = useState(null);
  const [flips, setFlips] = useState(0);

  const counts = useMemo(() => {
    const c = { cash: 0, coffee: 0, discount: 0 };
    cards.forEach((card) => {
      if (card.revealed) c[card.key] += 1;
    });
    return c;
  }, [cards]);

  const checkWin = useCallback((nextCards) => {
    const c = { cash: 0, coffee: 0, discount: 0 };
    nextCards.forEach((card) => {
      if (card.revealed) c[card.key] += 1;
    });
    for (const p of PRIZES) {
      if (c[p.key] >= p.need) return p;
    }
    return null;
  }, []);

  function reveal(i) {
    if (winner) return;
    setCards((prev) => {
      const card = prev[i];
      if (card.revealed) return prev;
      const next = prev.map((x, idx) =>
        idx === i ? { ...x, revealed: true } : x
      );
      setFlips((f) => f + 1);
      const w = checkWin(next);
      if (w) setWinner(w);
      return next;
    });
  }

  function reset() {
    setCards(buildDeck());
    setWinner(null);
    setFlips(0);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <p>
          <strong>โหมดสาธิต:</strong> สะสมภาพครบตามเงื่อนไขก่อน = ชนะ (เหมือนกติกา 2.2 ที่ออกแบบไว้)
        </p>
        <p className="mt-1 text-xs text-slate-500">
          กระดาน 12 ป้าย = 💵×5 + ☕×4 + 🎫×3 — สุ่มตำแหน่งใหม่ทุกรอบ
        </p>
        <p className="mt-1 text-xs">เปิดป้ายแล้ว: {flips} ครั้ง</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map((card, i) => {
          const meta = PRIZES.find((p) => p.key === card.key);
          return (
            <button
              key={card.index}
              type="button"
              onClick={() => reveal(i)}
              disabled={winner !== null && !card.revealed}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 text-2xl transition ${
                card.revealed
                  ? "border-slate-300 bg-slate-50"
                  : "border-slate-400 bg-slate-200 hover:bg-slate-300 active:scale-95"
              } ${winner && !card.revealed ? "opacity-50" : ""}`}
            >
              {card.revealed ? meta?.emoji : "?"}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">ความคืบหน้า</p>
        <ul className="mt-2 space-y-1 text-slate-700">
          {PRIZES.map((p) => (
            <li key={p.key}>
              {p.emoji} {p.label}: {counts[p.key]}/{p.need}
            </li>
          ))}
        </ul>
      </div>

      {winner ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="font-semibold text-emerald-900">
            รางวัล: {winner.emoji} {winner.label}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            เล่นรอบใหม่ (สุ่มกระดานใหม่)
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={reset}
        className="w-full rounded-xl border border-slate-300 py-2 text-sm text-slate-700"
      >
        รีเซ็ตกระดาน
      </button>
    </div>
  );
}
