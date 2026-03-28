"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { gameApiUrl } from "../lib/config";
import {
  addHearts,
  canAffordPinkRed,
  getHearts,
  trySpend,
  trySpendPinkRed
} from "../lib/hearts";
import InlineHeart from "./InlineHeart";

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
  /** @type {'central' | 'legacy' | null} */
  const [apiGameMode, setApiGameMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [heartCost, setHeartCost] = useState(0);
  const [pinkHeartCost, setPinkHeartCost] = useState(0);
  const [redHeartCost, setRedHeartCost] = useState(0);
  const [prizeList, setPrizeList] = useState(PRIZES);
  const [cards, setCards] = useState([]);
  const [winner, setWinner] = useState(null);
  const [flips, setFlips] = useState(0);
  const [apiCounts, setApiCounts] = useState({
    cash: 0,
    coffee: 0,
    discount: 0
  });
  const [setCounts, setSetCounts] = useState([]);
  const [imagesPerSet, setImagesPerSet] = useState(4);
  const [setImageCounts, setSetImageCounts] = useState([]);
  const [centralTitle, setCentralTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState(null);

  const applyLocalDeck = useCallback(() => {
    setMode("local");
    setApiGameMode(null);
    setSessionId(null);
    setPrizeList(PRIZES);
    setCards(buildDeck());
    setWinner(null);
    setFlips(0);
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setSetCounts([]);
    setCentralTitle("");
    setPinkHeartCost(0);
    setRedHeartCost(0);
    setBootError(null);
  }, []);

  const applyApiSession = useCallback((data) => {
    setMode("api");
    setSessionId(data.sessionId);
    const isCentral = data.gameMode === "central";
    if (isCentral) {
      const p = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
      const r = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
      setPinkHeartCost(p);
      setRedHeartCost(r);
      setHeartCost(p + r);
    } else {
      setPinkHeartCost(0);
      setRedHeartCost(0);
      setHeartCost(Number(data.heartCost) || 0);
    }
    setApiGameMode(isCentral ? "central" : "legacy");
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
        key: null,
        imageUrl: null
      }))
    );
    setWinner(null);
    setFlips(0);
    if (isCentral) {
      const sc = Number(data.setCount) || 1;
      const sic = Array.isArray(data.setImageCounts) ? data.setImageCounts : [];
      setSetImageCounts(sic);
      setImagesPerSet(
        sic.length ? Math.max(...sic.map((x) => Number(x) || 0), 1) : Number(data.imagesPerSet) || 4
      );
      setCentralTitle(String(data.title || "เกมส่วนกลาง"));
      setSetCounts(Array.from({ length: sc }, () => 0));
      setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    } else {
      setSetCounts([]);
      setSetImageCounts([]);
      setCentralTitle("");
      setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    }
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
        if (meta?.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          if ((p > 0 || r > 0) && !canAffordPinkRed(p, r)) {
            setBootError(
              "หัวใจชมพูหรือแดงไม่พอสำหรับรอบนี้ — ไปร้านค้า (สาธิต) หรือเล่นโหมดออฟไลน์"
            );
            applyLocalDeck();
            return;
          }
        } else {
          const costPre = meta ? Number(meta.heartCost) || 0 : 0;
          if (costPre > 0 && getHearts() < costPre) {
            setBootError(
              "หัวใจไม่พอสำหรับรอบที่หักหัวใจ — ไปร้านค้าเพื่อรับหัวใจ (สาธิต) หรือเล่นโหมดออฟไลน์ด้านล่าง"
            );
            applyLocalDeck();
            return;
          }
        }
        const data = await fetchGameStart();
        if (cancelled) return;
        if (data.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
          if ((p > 0 || r > 0) && !trySpendPinkRed(p, r)) {
            void fetchGameAbandon(data.sessionId);
            setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
            applyLocalDeck();
            return;
          }
        } else {
          const paid = Number(data.heartCost) || 0;
          if (paid > 0 && !trySpend(paid)) {
            void fetchGameAbandon(data.sessionId);
            setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
            applyLocalDeck();
            return;
          }
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

  const counts = mode === "api" && apiGameMode !== "central" ? apiCounts : localCounts;

  const checkWin = useCallback(
    (nextCards) => {
      const c = { cash: 0, coffee: 0, discount: 0 };
      nextCards.forEach((card) => {
        if (card.revealed && card.key) c[card.key] += 1;
      });
      for (const p of prizeList) {
        if (c[p.key] >= p.need) return p;
      }
      return null;
    },
    [prizeList]
  );

  async function revealApi(i) {
    if (!sessionId || winner || busy) return;
    const card = cards[i];
    if (card.revealed) return;
    setBusy(true);
    try {
      const data = await fetchGameFlip(sessionId, i);
      const isCentral = data.gameMode === "central" || Array.isArray(data.setCounts);

      if (isCentral) {
        if (Array.isArray(data.setCounts)) setSetCounts(data.setCounts);
        setFlips(data.flips);
        setCards((prev) =>
          prev.map((x, idx) =>
            idx === i
              ? {
                  ...x,
                  revealed: true,
                  key: `${data.setIndex}-${data.imageIndex}`,
                  imageUrl: data.imageUrl || null
                }
              : x
          )
        );
        if (data.winner) {
          setWinner({
            key: data.winner.ruleId || "win",
            label: data.winner.label || "ได้รับรางวัล",
            emoji: "🎁"
          });
          addHearts(1);
        }
      } else {
        setApiCounts(data.counts || { cash: 0, coffee: 0, discount: 0 });
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
        if (meta?.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          if ((p > 0 || r > 0) && !canAffordPinkRed(p, r)) {
            setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
            applyLocalDeck();
            return;
          }
        } else {
          const costPre = meta ? Number(meta.heartCost) || 0 : 0;
          if (costPre > 0 && getHearts() < costPre) {
            setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
            applyLocalDeck();
            return;
          }
        }
        const data = await fetchGameStart();
        if (data.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
          if ((p > 0 || r > 0) && !trySpendPinkRed(p, r)) {
            void fetchGameAbandon(data.sessionId);
            setBootError("หัวใจไม่พอ");
            applyLocalDeck();
            return;
          }
        } else {
          const paid = Number(data.heartCost) || 0;
          if (paid > 0 && !trySpend(paid)) {
            void fetchGameAbandon(data.sessionId);
            setBootError("หัวใจไม่พอ");
            applyLocalDeck();
            return;
          }
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

  const gridClass =
    cards.length > 12
      ? "grid grid-cols-4 gap-2 sm:grid-cols-5"
      : "grid grid-cols-3 gap-2 sm:grid-cols-4";

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
          <strong>
            {mode === "api" && apiGameMode === "central"
              ? centralTitle || "เกมส่วนกลาง"
              : "โหมดสาธิต"}
            :
          </strong>{" "}
          {mode === "api" && apiGameMode === "central"
            ? `เปิดป้ายในชุดเดียวกันครบตามกติกา = ชนะ · ${cards.length} ป้าย`
            : "สะสมภาพครบตามเงื่อนไขก่อน = ชนะ"}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {mode === "api" ? (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-800">
              {apiGameMode === "central"
                ? "เกมส่วนกลางจากแอดมิน — ค่าใต้ป้ายที่เซิร์ฟเวอร์"
                : "เชื่อม API — กติกาเดิมในโค้ด"}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
              โหมดออฟไลน์ — สุ่มในเบราว์เซอร์
            </span>
          )}
          {mode === "api" && apiGameMode === "central" && (pinkHeartCost > 0 || redHeartCost > 0) ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <span>หักต่อรอบ (สาธิตในเครื่อง):</span>
              {pinkHeartCost > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-rose-600">
                  <InlineHeart size="sm" className="text-rose-400" />
                  ชมพู {pinkHeartCost}
                </span>
              ) : null}
              {pinkHeartCost > 0 && redHeartCost > 0 ? <span className="text-slate-400">·</span> : null}
              {redHeartCost > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-red-700">
                  <InlineHeart size="sm" className="text-red-600" />
                  แดง {redHeartCost}
                </span>
              ) : null}
            </span>
          ) : null}
          {mode === "api" && apiGameMode !== "central" && heartCost > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span>หักรวม</span>
              <InlineHeart size="sm" className="text-brand-700" />
              <span>{heartCost} ต่อรอบ (ชมพูก่อน แล้วแดง — สาธิต)</span>
            </span>
          ) : null}
        </p>
        {bootError ? (
          <p className="mt-1 text-xs text-amber-700">{bootError}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          {mode === "api" && apiGameMode === "central"
            ? setImageCounts.length > 0
              ? `ป้ายในชุดไม่เท่ากัน: ${setImageCounts.map((x, i) => `ช.${i + 1}=${x}`).join(" · ")} — สุ่มตำแหน่งใหม่ทุกรอบ`
              : `แต่ละชุดมีสูงสุด ${imagesPerSet} แบบภาพ — สุ่มตำแหน่งใหม่ทุกรอบ`
            : "กระดาน 12 ป้าย = 💵×5 + ☕×4 + 🎫×3 — สุ่มตำแหน่งใหม่ทุกรอบ"}
        </p>
        <p className="mt-1 text-xs">เปิดป้ายแล้ว: {flips} ครั้ง</p>
      </div>

      <div className={gridClass}>
        {cards.map((card, i) => {
          const key = card.key;
          const meta =
            mode === "api" && apiGameMode === "legacy" && key
              ? prizeList.find((p) => p.key === key)
              : null;
          return (
            <button
              key={card.index ?? i}
              type="button"
              onClick={() => reveal(i)}
              disabled={busy || (winner !== null && !card.revealed)}
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 text-2xl transition ${
                card.revealed
                  ? "border-slate-300 bg-slate-50"
                  : "border-slate-400 bg-slate-200 hover:bg-slate-300 active:scale-95"
              } ${winner && !card.revealed ? "opacity-50" : ""}`}
            >
              {card.revealed && card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : card.revealed ? (
                <span>{meta?.emoji ?? "✓"}</span>
              ) : (
                "?"
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">ความคืบหน้า</p>
        {mode === "api" && apiGameMode === "central" ? (
          <ul className="mt-2 space-y-2 text-slate-700">
            {prizeList.map((p) => {
              const opened = setCounts[p.setIndex] ?? 0;
              return (
                <li key={p.key} className="text-xs sm:text-sm">
                  <span className="font-medium text-slate-800">{p.label}</span>
                  <br />
                  <span className="text-slate-600">
                    ในชุดนี้เปิดแล้ว {opened}/{p.imagesPerSet ?? imagesPerSet} ป้าย — รางวัลเมื่อเปิดครบ{" "}
                    {p.need} ป้ายในชุด
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-2 space-y-1 text-slate-700">
            {prizeList.map((p) => (
              <li key={p.key}>
                {p.emoji} {p.label}: {counts[p.key] ?? 0}/{p.need}
              </li>
            ))}
          </ul>
        )}
      </div>

      {winner ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-center">
          <p className="font-semibold text-brand-900">
            รางวัล: {winner.emoji ? `${winner.emoji} ` : ""}
            {winner.label}
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="mt-3 rounded-xl bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-50"
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
