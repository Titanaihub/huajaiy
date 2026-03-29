"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { gameApiUrl } from "../lib/config";
import {
  addHearts,
  canAffordPinkRed,
  getHearts,
  trySpend,
  trySpendPinkRed
} from "../lib/hearts";
import InlineHeart from "./InlineHeart";
import { useMemberAuth } from "./MemberAuthProvider";

/**
 * เกมส่วนกลาง: ไม่ล็อกอิน = กระเป๋าสาธิต · ล็อกอิน = เช็กยอดชมพู/แดงในโปรไฟล์แยกกัน
 * ต้องตรงกับที่ผู้สร้างกำหนด (หักชมพูอย่างเดียว / แดงอย่างเดียว / หรือทั้งสองสี)
 */
function canAffordCentralEntry(user, pinkCost, redCost) {
  const p = Math.max(0, Math.floor(Number(pinkCost)) || 0);
  const r = Math.max(0, Math.floor(Number(redCost)) || 0);
  if (p === 0 && r === 0) return true;
  if (user) {
    const pu = Math.max(0, Math.floor(Number(user.pinkHeartsBalance)) || 0);
    const ru = Math.max(0, Math.floor(Number(user.redHeartsBalance)) || 0);
    return pu >= p && ru >= r;
  }
  return canAffordPinkRed(p, r);
}

/**
 * อนุญาตเริ่มรอบเมื่อผ่าน canAfford — ไม่ล็อกอินหักจาก localStorage · ล็อกอินยังไม่มี API หัก DB
 */
function spendCentralEntryOrFail(user, pinkCost, redCost) {
  const p = Math.max(0, Math.floor(Number(pinkCost)) || 0);
  const r = Math.max(0, Math.floor(Number(redCost)) || 0);
  if (p === 0 && r === 0) return true;
  if (user) {
    return canAffordCentralEntry(user, p, r);
  }
  return trySpendPinkRed(p, r);
}

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

/**
 * @param {{ serverCentralPublished?: boolean }} props
 * เซิร์ฟเวอร์หน้าเกมรู้แล้วว่ามีเกมเผยแพร่ — ใช้เตือนเมื่อฝั่งเบราว์เซอร์ตกไปโหมดสาธิต (หัวใจไม่พอ / API ล้ม)
 */
export default function FlipGameDemo({ serverCentralPublished = false } = {}) {
  const { user, loading: authLoading } = useMemberAuth();
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
  const [centralDescription, setCentralDescription] = useState("");
  const [centralGameCoverUrl, setCentralGameCoverUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState(null);
  /** มีกระดานจากเกมส่วนกลางแต่ยังเริ่มรอบ/เปิดป้ายไม่ได้ (หัวใจไม่พอ) */
  const [playLocked, setPlayLocked] = useState(false);
  const [playLockReason, setPlayLockReason] = useState("");
  /** เกมส่วนกลางจบแบบกติกา none — ไม่มีรางวัล */
  const [centralLoss, setCentralLoss] = useState(null);
  /** แอนิเมชันโผล่ของกล่องผลลัพธ์ */
  const [resultOverlayEnter, setResultOverlayEnter] = useState(false);

  const applyLocalDeck = useCallback(() => {
    setMode("local");
    setApiGameMode(null);
    setSessionId(null);
    setPlayLocked(false);
    setPlayLockReason("");
    setCentralLoss(null);
    setPrizeList(PRIZES);
    setCards(buildDeck());
    setWinner(null);
    setFlips(0);
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setSetCounts([]);
    setCentralTitle("");
    setCentralDescription("");
    setPinkHeartCost(0);
    setRedHeartCost(0);
    setBootError(null);
  }, []);

  /** แสดงกระดานเกมส่วนกลางจาก meta โดยไม่มี session — ให้ผู้เล่นเห็นเกมจริงแต่เปิดป้ายไม่ได้จนกว่าจะมีหัวใจ */
  const applyCentralPreviewFromMeta = useCallback((meta, reason) => {
    setMode("api");
    setApiGameMode("central");
    setSessionId(null);
    setPlayLocked(true);
    setPlayLockReason(
      reason ||
        "หัวใจไม่พอต่อรอบนี้ — ดูกระดานและกติกาด้านล่างได้ แต่ยังเปิดป้ายไม่ได้จนกว่ายอดชมพู/แดงในบัญชีจะครบตามที่เกมกำหนดแต่ละสี (หรือล็อกอิน)"
    );
    const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
    const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
    setPinkHeartCost(p);
    setRedHeartCost(r);
    setHeartCost(p + r);
    if (Array.isArray(meta.prizes) && meta.prizes.length) {
      setPrizeList(meta.prizes);
    } else {
      setPrizeList(PRIZES);
    }
    const n = meta.cardCount || 12;
    setCards(
      Array.from({ length: n }, (_, i) => ({
        index: i,
        revealed: false,
        key: null,
        imageUrl: null
      }))
    );
    setWinner(null);
    setCentralLoss(null);
    setFlips(0);
    const sc = Number(meta.setCount) || 1;
    const sic = Array.isArray(meta.setImageCounts) ? meta.setImageCounts : [];
    setSetImageCounts(sic);
    setImagesPerSet(
      sic.length ? Math.max(...sic.map((x) => Number(x) || 0), 1) : Number(meta.imagesPerSet) || 4
    );
    setCentralTitle(String(meta.title || "เกมส่วนกลาง"));
    setCentralDescription(String(meta.description || "").trim());
    setCentralGameCoverUrl(String(meta.gameCoverUrl || "").trim());
    setSetCounts(Array.from({ length: sc }, () => 0));
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setBootError(null);
  }, []);

  const applyApiSession = useCallback((data) => {
    setMode("api");
    setPlayLocked(false);
    setPlayLockReason("");
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
      setCentralDescription(String(data.description || "").trim());
      setCentralGameCoverUrl(String(data.gameCoverUrl || "").trim());
      setSetCounts(Array.from({ length: sc }, () => 0));
      setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    } else {
      setSetCounts([]);
      setSetImageCounts([]);
      setCentralTitle("");
      setCentralDescription("");
      setCentralGameCoverUrl("");
      setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    }
    setBootError(null);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    let meta = null;
    (async () => {
      try {
        try {
          meta = await fetchGameMeta();
        } catch {
          meta = null;
        }
        if (cancelled) return;
        if (meta?.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          const needPay = p > 0 || r > 0;
          const canPay = canAffordCentralEntry(user, p, r);
          if (needPay && !canPay) {
            applyCentralPreviewFromMeta(
              meta,
              user
                ? "หัวใจในบัญชียังไม่พอต่อรอบนี้ (ครบทุกสีตามที่เกมหัก) — เห็นกระดานเกมจริงด้านล่าง แต่เปิดป้ายไม่ได้จนกว่าจะมียอดพอ"
                : "หัวใจสาธิตในเครื่องไม่พอ — เห็นกระดานเกมจริง แต่เปิดป้ายไม่ได้ · ล็อกอินเพื่อใช้ยอดบัญชี หรือรับหัวใจจากร้านค้า"
            );
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
          if ((p > 0 || r > 0) && !spendCentralEntryOrFail(user, p, r)) {
            void fetchGameAbandon(data.sessionId);
            if (meta?.gameMode === "central") {
              applyCentralPreviewFromMeta(
                meta,
                "เริ่มรอบไม่สำเร็จ (หัวใจไม่พอ) — แสดงกระดานจากเกมที่เผยแพร่ เปิดป้ายไม่ได้"
              );
            } else {
              setBootError("หัวใจไม่พอเริ่มรอบ");
              applyLocalDeck();
            }
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
          if (meta?.gameMode === "central") {
            applyCentralPreviewFromMeta(
              meta,
              "เรียก API เริ่มรอบไม่สำเร็จ — แสดงกระดานจากข้อมูลเกม (เปิดป้ายไม่ได้จนกว่าระบบจะพร้อม)"
            );
            setBootError(String(e.message || e));
          } else {
            setBootError(e.message);
            applyLocalDeck();
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    applyApiSession,
    applyCentralPreviewFromMeta,
    applyLocalDeck,
    authLoading,
    user?.id
  ]);

  const gameFinished = Boolean(winner || centralLoss);

  useEffect(() => {
    if (!gameFinished) {
      setResultOverlayEnter(false);
      return undefined;
    }
    setResultOverlayEnter(false);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setResultOverlayEnter(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [gameFinished, winner, centralLoss]);

  useEffect(() => {
    if (!gameFinished) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gameFinished]);

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
    if (playLocked || !sessionId || winner || centralLoss || busy) return;
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
        if (data.loss) {
          setCentralLoss({
            ruleId: data.loss.ruleId,
            label: data.loss.label || "จบรอบ — ไม่มีรางวัล"
          });
        } else if (data.winner) {
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
      let meta = null;
      try {
        try {
          meta = await fetchGameMeta();
        } catch {
          meta = null;
        }
        if (meta?.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          const needPay = p > 0 || r > 0;
          const canPay = canAffordCentralEntry(user, p, r);
          if (needPay && !canPay) {
            applyCentralPreviewFromMeta(meta);
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
          if ((p > 0 || r > 0) && !spendCentralEntryOrFail(user, p, r)) {
            void fetchGameAbandon(data.sessionId);
            if (meta?.gameMode === "central") {
              applyCentralPreviewFromMeta(meta);
            } else {
              setBootError("หัวใจไม่พอ");
              applyLocalDeck();
            }
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
        if (meta?.gameMode === "central") {
          applyCentralPreviewFromMeta(meta);
          setBootError(String(e.message || e));
        } else {
          setBootError(e.message);
          applyLocalDeck();
        }
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
      {serverCentralPublished && mode === "local" ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">มีเกมส่วนกลางเผยแพร่แล้ว แต่ตอนนี้แสดงโหมดสาธิตในเครื่อง</p>
          <p className="mt-1 text-amber-900/95">
            สาเหตุที่พบบ่อย: <strong>หัวใจไม่พอต่อรอบ</strong> (ล็อกอิน = ต้องมียอดชมพูและแดงครบตามที่เกมกำหนดแยกสี) · หรือเรียก API ไม่สำเร็จ
            (ดูข้อความสีส้มด้านล่าง) — ตั้งหักหัวใจเป็น 0 ในเกมส่วนกลางเพื่อทดสอบ หรือให้แอดมินปรับยอด
          </p>
        </div>
      ) : null}
      {playLocked && apiGameMode === "central" && playLockReason ? (
        <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">ดูเกมได้ — เล่นเปิดป้ายเมื่อมีหัวใจพอ</p>
          <p className="mt-1 text-sky-900/95">{playLockReason}</p>
          <p className="mt-2 text-xs text-sky-800/90">
            กด「รีเซ็ตกระดาน」หลังได้รับหัวใจแล้ว ระบบจะลองเริ่มรอบใหม่
          </p>
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
        <div
          className={
            mode === "api" && apiGameMode === "central" ? "flex gap-3" : ""
          }
        >
          {mode === "api" && apiGameMode === "central" ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={centralGameCoverUrl.trim() || DEFAULT_CENTRAL_GAME_COVER_PATH}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p>
              <strong>
                {mode === "api" && apiGameMode === "central"
                  ? centralTitle || "เกมส่วนกลาง"
                  : "โหมดสาธิต"}
                :
              </strong>{" "}
              {mode === "api" && apiGameMode === "central"
                ? playLocked
                  ? `กระดานจริง ${cards.length} ป้าย — เปิดป้ายได้เมื่อมีหัวใจพอต่อรอบ`
                  : `เปิดป้ายในชุดเดียวกันครบตามกติกา = ชนะ · ${cards.length} ป้าย`
                : "สะสมภาพครบตามเงื่อนไขก่อน = ชนะ"}
            </p>
          </div>
        </div>
        {mode === "api" && apiGameMode === "central" && centralDescription ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {centralDescription}
          </p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {mode === "api" ? (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-800">
              {apiGameMode === "central"
                ? playLocked
                  ? "เกมส่วนกลาง (ดูอย่างเดียว — ยังไม่เริ่มรอบ)"
                  : "เกมส่วนกลางจากแอดมิน — ค่าใต้ป้ายที่เซิร์ฟเวอร์"
                : "เชื่อม API — กติกาเดิมในโค้ด"}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
              โหมดออฟไลน์ — สุ่มในเบราว์เซอร์
            </span>
          )}
          {mode === "api" && apiGameMode === "central" && (pinkHeartCost > 0 || redHeartCost > 0) ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <span>
                {user
                  ? "หักต่อรอบ (เช็กชมพู/แดงแยกกันตามช่องด้านล่าง — ยังไม่หัก DB อัตโนมัติ):"
                  : "หักต่อรอบ (สาธิตในเครื่อง — หักแยกสีตามที่ตั้ง):"}
              </span>
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
              disabled={
                playLocked ||
                busy ||
                ((winner !== null || centralLoss !== null) && !card.revealed)
              }
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 text-2xl transition ${
                card.revealed
                  ? "border-slate-300 bg-slate-50"
                  : playLocked
                    ? "cursor-not-allowed border-slate-300 bg-slate-200/80 opacity-80"
                    : "border-slate-400 bg-slate-200 hover:bg-slate-300 active:scale-95"
              } ${(winner || centralLoss) && !card.revealed ? "opacity-50" : ""}`}
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
              const cap = p.imagesPerSet ?? imagesPerSet;
              const isNone = p.prizeCategory === "none";
              return (
                <li key={p.key} className="text-xs sm:text-sm">
                  <span className="font-medium text-slate-800">{p.label}</span>
                  <br />
                  <span className="text-slate-600">
                    {isNone
                      ? `ในชุดนี้เปิดแล้ว ${opened}/${cap} ป้าย — ครบ ${p.need} ป้าย = จบรอบ (ไม่มีรางวัล · หัวใจไม่คืน)`
                      : `ในชุดนี้เปิดแล้ว ${opened}/${cap} ป้าย — รางวัลเมื่อเปิดครบ ${p.need} ป้ายในชุด`}
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

      {gameFinished ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-result-title"
            className={`w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-game transition-all duration-300 ease-out ${
              resultOverlayEnter
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-2 scale-[0.96] opacity-0"
            }`}
          >
            {winner ? (
              <>
                <h2
                  id="game-result-title"
                  className="text-2xl font-bold leading-snug text-red-600 sm:text-3xl"
                >
                  ยินดีด้วยคุณได้รับรางวัล
                </h2>
                <p className="mt-4 text-base text-slate-800 sm:text-lg">
                  ได้รับรางวัล
                  {winner.emoji ? ` ${winner.emoji}` : ""}
                  {winner.label ? ` ${winner.label}` : ""}
                </p>
                <p className="mt-5 text-center text-base font-medium text-slate-700">
                  กลับไปเล่นเกมส์
                </p>
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl bg-brand-800 py-3 text-base font-semibold text-white shadow-soft hover:bg-brand-900 disabled:opacity-50"
                >
                  กลับไปเล่นเกมส์
                </button>
              </>
            ) : (
              <>
                <h2
                  id="game-result-title"
                  className="text-2xl font-bold leading-snug text-slate-800 sm:text-3xl"
                >
                  เสียใจด้วยคุณไม่ได้รับรางวัล
                </h2>
                {centralLoss?.label ? (
                  <p className="mt-3 text-sm text-slate-600">{centralLoss.label}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  หัวใจที่ใช้เริ่มรอบนี้ไม่คืน
                </p>
                <p className="mt-5 text-center text-base font-medium text-slate-700">
                  กลับไปเล่นเกมส์
                </p>
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl bg-slate-800 py-3 text-base font-semibold text-white shadow-soft hover:bg-slate-900 disabled:opacity-50"
                >
                  กลับไปเล่นเกมส์
                </button>
              </>
            )}
          </div>
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
