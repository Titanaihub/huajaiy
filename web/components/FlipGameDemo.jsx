"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { gameApiUrl } from "../lib/config";
import { addHearts, getHearts, trySpend } from "../lib/hearts";

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

async function fetchGameStart() {
  const r = await fetch(gameApiUrl("start"), {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ไม่สามารถเริ่มเกมจากเซิร์ฟเวอร์ได้");
  }
  return data;
}

async function fetchGameFlip(sessionId, index) {
  const r = await fetch(gameApiUrl("flip"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, index })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "เปิดป้ายไม่สำเร็จ");
  }
  return data;
}

async function fetchGameMeta() {
  const r = await fetch(gameApiUrl("meta"), { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ไม่สามารถโหลดกติกาเกมได้");
  }
  return data;
}

async function fetchGameAbandon(sessionId) {
  try {
    await fetch(gameApiUrl("abandon"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
  } catch {
    /* ignore */
  }
}

export default function FlipGameDemo() {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [heartCost, setHeartCost] = useState(0);
  const [prizeList, setPrizeList] = useState(PRIZES);
  const [cards, setCards] = useState([]);
  const [winner, setWinner] = useState(null);
  const [flips, setFlips] = useState(0);
  const [apiCounts, setApiCounts] = useState({
    cash: 0,
    coffee: 0,
    discount: 0
  });
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState(null);

  const applyLocalDeck = useCallback(() => {
    setMode("local");
    setSessionId(null);
    setPrizeList(PRIZES);
    setCards(buildDeck());
    setWinner(null);
    setFlips(0);
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setBootError(null);
  }, []);

  const applyApiSession = useCallback((data) => {
    setMode("api");
    setSessionId(data.sessionId);
    setHeartCost(Number(data.heartCost) || 0);
    if (Array.isArray(data.prizes) && data.prizes.length) {
      setPrizeList(data.prizes);
    } else {
      setPrizeList(PRIZES);
    }
    const n = data.cardCount || 12;
    setCards(
      Array.from({ length: n }, (_, i) => ({
        index: i,
        revealed: false,
        key: null
      }))
    );
    setWinner(null);
    setFlips(0);
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setBootError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let meta = null;
        try {
          meta = await fetchGameMeta();
        } catch {
          meta = null;
        }
        if (cancelled) return;
        const costPre = meta ? Number(meta.heartCost) || 0 : 0;
        if (costPre > 0 && getHearts() < costPre) {
          setBootError(
            "หัวใจไม่พอสำหรับรอบที่หักหัวใจ — ไปร้านค้าเพื่อรับหัวใจ (สาธิต) หรือเล่นโหมดออฟไลน์ด้านล่าง"
          );
          applyLocalDeck();
          return;
        }
        const data = await fetchGameStart();
        if (cancelled) return;
        const paid = Number(data.heartCost) || 0;
        if (paid > 0 && !trySpend(paid)) {
          void fetchGameAbandon(data.sessionId);
          setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
          applyLocalDeck();
          return;
        }
        applyApiSession(data);
      } catch (e) {
        if (!cancelled) {
          setBootError(e.message);
          applyLocalDeck();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyApiSession, applyLocalDeck]);

  const localCounts = useMemo(() => {
    const c = { cash: 0, coffee: 0, discount: 0 };
    cards.forEach((card) => {
      if (card.revealed && card.key) c[card.key] += 1;
    });
    return c;
  }, [cards]);

  const counts = mode === "api" ? apiCounts : localCounts;

  const checkWin = useCallback((nextCards) => {
    const c = { cash: 0, coffee: 0, discount: 0 };
    nextCards.forEach((card) => {
      if (card.revealed && card.key) c[card.key] += 1;
    });
    for (const p of prizeList) {
      if (c[p.key] >= p.need) return p;
    }
    return null;
  }, [prizeList]);

  async function revealApi(i) {
    if (!sessionId || winner || busy) return;
    const card = cards[i];
    if (card.revealed) return;
    setBusy(true);
    try {
      const data = await fetchGameFlip(sessionId, i);
      setApiCounts(data.counts);
      setFlips(data.flips);
      setCards((prev) =>
        prev.map((x, idx) =>
          idx === i ? { ...x, revealed: true, key: data.symbol } : x
        )
      );
      if (data.winner) {
        setWinner({
          key: data.winner.key,
          label: data.winner.label,
          emoji: data.winner.emoji
        });
        addHearts(1);
      }
    } catch (e) {
      setBootError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function revealLocal(i) {
    if (winner) return;
    setCards((prev) => {
      const card = prev[i];
      if (card.revealed) return prev;
      const next = prev.map((x, idx) =>
        idx === i ? { ...x, revealed: true } : x
      );
      setFlips((f) => f + 1);
      const w = checkWin(next);
      if (w) {
        setWinner(w);
        addHearts(1);
      }
      return next;
    });
  }

  function reveal(i) {
    if (mode === "api") revealApi(i);
    else revealLocal(i);
  }

  async function reset() {
    if (mode === "api") {
      setBusy(true);
      try {
        let meta = null;
        try {
          meta = await fetchGameMeta();
        } catch {
          meta = null;
        }
        const costPre = meta ? Number(meta.heartCost) || 0 : 0;
        if (costPre > 0 && getHearts() < costPre) {
          setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
          applyLocalDeck();
          return;
        }
        const data = await fetchGameStart();
        const paid = Number(data.heartCost) || 0;
        if (paid > 0 && !trySpend(paid)) {
          void fetchGameAbandon(data.sessionId);
          setBootError("หัวใจไม่พอ");
          applyLocalDeck();
          return;
        }
        applyApiSession(data);
      } catch (e) {
        setBootError(e.message);
        applyLocalDeck();
      } finally {
        setBusy(false);
      }
    } else {
      applyLocalDeck();
    }
  }

  if (mode === null && cards.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        กำลังเตรียมกระดาน…
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <p>
          <strong>โหมดสาธิต:</strong> สะสมภาพครบตามเงื่อนไขก่อน = ชนะ (เหมือนกติกา 2.2 ที่ออกแบบไว้)
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {mode === "api" ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              เชื่อม API — ค่าใต้ป้ายอยู่ที่เซิร์ฟเวอร์
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
              โหมดออฟไลน์ — สุ่มในเบราว์เซอร์
            </span>
          )}
          {heartCost > 0 && mode === "api" ? (
            <span>หัก ♥ {heartCost} ต่อรอบ (จากกระเป๋าในเครื่อง)</span>
          ) : null}
        </p>
        {bootError ? (
          <p className="mt-1 text-xs text-amber-700">{bootError}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          กระดาน 12 ป้าย = 💵×5 + ☕×4 + 🎫×3 — สุ่มตำแหน่งใหม่ทุกรอบ
        </p>
        <p className="mt-1 text-xs">เปิดป้ายแล้ว: {flips} ครั้ง</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map((card, i) => {
          const key = card.key;
          const meta = key ? prizeList.find((p) => p.key === key) : null;
          return (
            <button
              key={card.index ?? i}
              type="button"
              onClick={() => reveal(i)}
              disabled={
                busy || (winner !== null && !card.revealed)
              }
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
          {prizeList.map((p) => (
            <li key={p.key}>
              {p.emoji} {p.label}: {counts[p.key] ?? 0}/{p.need}
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
            disabled={busy}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            เล่นรอบใหม่ (สุ่มกระดานใหม่)
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="w-full rounded-xl border border-slate-300 py-2 text-sm text-slate-700 disabled:opacity-50"
      >
        รีเซ็ตกระดาน
      </button>
    </div>
  );
}
