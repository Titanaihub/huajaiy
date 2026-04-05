"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CENTRAL_GAME_COVER_PATH,
  DEFAULT_TILE_BACK_COVER_PATH
} from "../lib/centralGameDefaults";
import { gameApiUrl } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import {
  addHearts,
  canAffordPinkRed,
  getHearts,
  trySpend,
  trySpendPinkRed
} from "../lib/hearts";
import InlineHeart from "./InlineHeart";
import { useMemberAuth } from "./MemberAuthProvider";

function totalRoomGiftRed(user) {
  const arr = user?.roomGiftRed;
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, x) => s + Math.max(0, Math.floor(Number(x.balance)) || 0), 0);
}

function roomGiftRedForCreator(user, creatorId) {
  if (!creatorId || !user?.roomGiftRed) return 0;
  const row = user.roomGiftRed.find((x) => String(x.creatorId) === String(creatorId));
  return row ? Math.max(0, Math.floor(Number(row.balance)) || 0) : 0;
}

/** จับคู่แดงห้องกับเกม — ใช้ gameCreatedBy จาก API หรือสำรองจาก creatorUsername + roomGiftRed */
function resolveCentralGiftCtx(partial, user) {
  const allowGiftRedPlay = Boolean(partial?.allowGiftRedPlay);
  let gameCreatedBy = partial?.gameCreatedBy ?? null;
  if (gameCreatedBy != null && String(gameCreatedBy).trim() !== "") {
    return { gameCreatedBy: String(gameCreatedBy).trim(), allowGiftRedPlay };
  }
  const cu = partial?.creatorUsername
    ? String(partial.creatorUsername).trim().toLowerCase()
    : "";
  if (!allowGiftRedPlay && cu && user?.roomGiftRed?.length) {
    const row = user.roomGiftRed.find(
      (x) => String(x.creatorUsername || "").toLowerCase() === cu
    );
    if (row) {
      return { gameCreatedBy: String(row.creatorId), allowGiftRedPlay };
    }
  }
  return { gameCreatedBy: null, allowGiftRedPlay };
}

function currencyMetaFromApi(meta) {
  if (!meta || typeof meta !== "object") return null;
  const m = meta.heartCurrencyMode;
  return {
    heartCurrencyMode: ["both", "pink_only", "red_only", "either"].includes(m)
      ? m
      : "both",
    acceptsPinkHearts: meta.acceptsPinkHearts !== false
  };
}

/**
 * เกมส่วนกลาง: ไม่ล็อกอิน = กระเป๋าสาธิต · ล็อกอิน = เช็กยอดชมพู + แดงทั่วไป + แดงจากรหัสห้องตามเกม
 * @param {{ heartCurrencyMode?: string; acceptsPinkHearts?: boolean } | null} currencyMeta — โหมด either + รับชมพู = พอแค่ชมพูหรือแดงฝั่งใดฝั่งหนึ่ง
 */
function canAffordCentralEntry(user, pinkCost, redCost, entryCtx, currencyMeta) {
  const ctx = entryCtx || {};
  const p = Math.max(0, Math.floor(Number(pinkCost)) || 0);
  const r = Math.max(0, Math.floor(Number(redCost)) || 0);
  const mode = currencyMeta?.heartCurrencyMode;
  const acc = currencyMeta?.acceptsPinkHearts !== false;
  if (mode === "either" && acc) {
    const fee = Math.max(p, r);
    return (
      canAffordCentralEntry(user, fee, 0, ctx, null) ||
      canAffordCentralEntry(user, 0, fee, ctx, null)
    );
  }
  if (p === 0 && r === 0) return true;
  if (user) {
    const pu = Math.max(0, Math.floor(Number(user.pinkHeartsBalance)) || 0);
    const generalRed = Math.max(0, Math.floor(Number(user.redHeartsBalance)) || 0);
    let giftPool = 0;
    if (ctx.allowGiftRedPlay) {
      giftPool = totalRoomGiftRed(user);
    } else if (ctx.gameCreatedBy) {
      giftPool = roomGiftRedForCreator(user, ctx.gameCreatedBy);
    }
    const totalRed = generalRed + giftPool;
    return pu >= p && totalRed >= r;
  }
  return canAffordPinkRed(p, r);
}

/**
 * ผู้เล่นทั่วไป: หักจาก localStorage · สมาชิก: เซิร์ฟเวอร์หักตอน POST /start แล้ว — ใช้ฟังก์ชันนี้แค่เช็กก่อนเรียก API
 */
function spendCentralEntryOrFail(user, pinkCost, redCost, entryCtx) {
  const p = Math.max(0, Math.floor(Number(pinkCost)) || 0);
  const r = Math.max(0, Math.floor(Number(redCost)) || 0);
  if (p === 0 && r === 0) return true;
  if (user) {
    return canAffordCentralEntry(user, p, r, entryCtx, null);
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

/** บรรทัด 1 ร่วม: เงื่อนไขป้ายในชุด */
function centralRuleSetConditionLine(p, cap) {
  const setNo = Number(p.setIndex) + 1;
  const c = Math.max(1, Math.floor(Number(cap) || 0));
  const need = Math.max(1, Math.floor(Number(p.need) || 0));
  return `ชุดที่ ${setNo} มี ${c} ป้าย — เปิดครบ ${need} ป้ายก่อน (${need}/${c})`;
}

/** ชุดไม่มีรางวัล — บรรทัดแรกรวมสรุป */
function centralRuleNoneHeadLine(p, cap) {
  return `${centralRuleSetConditionLine(p, cap)} = ไม่มีรางวัล`;
}

/** ชุดมีรางวัล — บรรทัดรายละเอียดรางวัล */
function centralRulePrizeDescriptionLine(p) {
  const cat = { cash: "เงินสด", item: "สิ่งของ", voucher: "บัตรกำนัล" }[p.prizeCategory] || "รางวัล";
  const val = [p.prizeValueText, p.prizeUnit].filter(Boolean).join(" ").trim();
  const title = String(p.prizeTitle || "").trim();
  let rewardBody;
  if (title && val) {
    rewardBody = `${title} ${val}`;
  } else if (title) {
    rewardBody = title;
  } else if (val) {
    rewardBody = `${cat} ${val}`;
  } else {
    rewardBody = cat;
  }
  const qtyRaw = p.totalPrizeQty;
  const qty =
    qtyRaw != null && p.prizeCategory !== "none"
      ? Math.max(1, Math.floor(Number(qtyRaw) || 1))
      : 1;
  return `รับรางวัล ${rewardBody} · รางวัลมีทั้งหมด ${qty} รางวัล`;
}

function centralRuleFulfillmentLine(p) {
  const cat = p.prizeCategory;
  const raw = String(p.prizeFulfillmentMode || "").toLowerCase();
  if (cat === "cash") {
    const m = raw === "pickup" ? "pickup" : "transfer";
    return m === "pickup" ? "การจ่ายรางวัล: มารับเอง" : "การจ่ายรางวัล: โอนรางวัลให้";
  }
  if (cat === "item") {
    const m = raw === "pickup" ? "pickup" : "ship";
    return m === "pickup" ? "การรับรางวัล: มารับเอง" : "การรับรางวัล: จัดส่งตามที่อยู่";
  }
  return "";
}

function centralRulePrizeTotalQty(p) {
  const qtyRaw = p.totalPrizeQty;
  return qtyRaw != null && p.prizeCategory !== "none"
    ? Math.max(1, Math.floor(Number(qtyRaw) || 1))
    : 1;
}

/** อ่าน setIndex จากคีย์ป้าย เช่น "0-3" */
function parseCentralTileSetIndex(key) {
  if (key == null || key === "") return null;
  const s = String(key);
  const dash = s.indexOf("-");
  if (dash <= 0) return null;
  const setIndex = Number(s.slice(0, dash));
  if (!Number.isFinite(setIndex)) return null;
  return Math.max(0, Math.floor(setIndex));
}

async function fetchGameStart(centralGameId, payWith) {
  const headers = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = getMemberToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const body =
    centralGameId && String(centralGameId).trim()
      ? { gameId: String(centralGameId).trim() }
      : {};
  if (payWith === "pink" || payWith === "red") {
    body.payWith = payWith;
  }
  const r = await fetch(gameApiUrl("start"), {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    const err = new Error(data.error || "ไม่สามารถเริ่มเกมจากเซิร์ฟเวอร์ได้");
    err.code = data.code;
    err.status = r.status;
    throw err;
  }
  return data;
}

async function fetchGameFlip(sessionId, index) {
  const headers = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = getMemberToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const r = await fetch(gameApiUrl("flip"), {
    method: "POST",
    headers,
    body: JSON.stringify({ sessionId, index })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "เปิดป้ายไม่สำเร็จ");
  }
  return data;
}

async function fetchGameMeta(centralGameId) {
  const id = centralGameId && String(centralGameId).trim();
  const bust = `_nc=${Date.now()}`;
  const url = id
    ? `${gameApiUrl("meta")}?gameId=${encodeURIComponent(id)}&${bust}`
    : `${gameApiUrl("meta")}?${bust}`;
  const r = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache"
    }
  });
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

const SESSION_STORE_KEY = "huajaiy_central_flip_v1";

function readStoredSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredSession(sessionId, centralGameId) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    sessionStorage.setItem(
      SESSION_STORE_KEY,
      JSON.stringify({
        sessionId,
        centralGameId: centralGameId || null
      })
    );
  } catch {
    /* ignore */
  }
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_STORE_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchGameState(sessionId) {
  const r = await fetch(gameApiUrl("state"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ไม่พบรอบเกม");
  }
  return data;
}

async function fetchRevealRemaining(sessionId) {
  const r = await fetch(gameApiUrl("reveal-remaining"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "เฉลยไม่สำเร็จ");
  }
  return data;
}

/**
 * @param {{ serverCentralPublished?: boolean; centralGameId?: string | null }} props
 * เซิร์ฟเวอร์หน้าเกมรู้แล้วว่ามีเกมเผยแพร่ — ใช้เตือนเมื่อฝั่งเบราว์เซอร์ตกไปโหมดสาธิต (หัวใจไม่พอ / API ล้ม)
 */
export default function FlipGameDemo({
  serverCentralPublished = false,
  centralGameId = null
} = {}) {
  const resolvedGameId =
    centralGameId != null && String(centralGameId).trim()
      ? String(centralGameId).trim()
      : null;
  const { user, loading: authLoading, refresh } = useMemberAuth();
  const [mode, setMode] = useState(null);
  /** @type {'central' | 'legacy' | null} */
  const [apiGameMode, setApiGameMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [heartCost, setHeartCost] = useState(0);
  const [pinkHeartCost, setPinkHeartCost] = useState(0);
  const [redHeartCost, setRedHeartCost] = useState(0);
  const [heartCurrencyMode, setHeartCurrencyMode] = useState("both");
  const [acceptsPinkHeartsMeta, setAcceptsPinkHeartsMeta] = useState(true);
  const [centralPayWith, setCentralPayWith] = useState("pink");
  const [centralEntryGiftCtx, setCentralEntryGiftCtx] = useState({
    gameCreatedBy: null,
    allowGiftRedPlay: false
  });
  /** ใช้จับคู่แดงห้องเมื่อ meta ไม่ส่ง gameCreatedBy */
  const [centralCreatorUsername, setCentralCreatorUsername] = useState(null);
  const centralGiftCtxResolved = useMemo(
    () =>
      resolveCentralGiftCtx(
        {
          ...centralEntryGiftCtx,
          creatorUsername: centralCreatorUsername
        },
        user
      ),
    [centralEntryGiftCtx, centralCreatorUsername, user]
  );
  const centralCurrencyMeta = useMemo(
    () => ({ heartCurrencyMode, acceptsPinkHearts: acceptsPinkHeartsMeta }),
    [heartCurrencyMode, acceptsPinkHeartsMeta]
  );
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
  /** รูปหน้าปิดป้าย (ก่อนเปิด) — จาก API หรือค่าเริ่มต้นในเว็บ */
  const [centralTileBackCoverUrl, setCentralTileBackCoverUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState(null);
  /** มีกระดานจากเกมส่วนกลางแต่ยังเริ่มรอบ/เปิดป้ายไม่ได้ (หัวใจไม่พอ) */
  const [playLocked, setPlayLocked] = useState(false);
  const [playLockReason, setPlayLockReason] = useState("");
  /** เกมส่วนกลางจบแบบกติกา none — ไม่มีรางวัล */
  const [centralLoss, setCentralLoss] = useState(null);
  /** แอนิเมชันโผล่ของกล่องผลลัพธ์ */
  const [resultOverlayEnter, setResultOverlayEnter] = useState(false);
  /** โมดัลผลลัพธ์ — ปิดได้เพื่อดูกระดาน */
  const [resultModalOpen, setResultModalOpen] = useState(false);
  /** กติกา: ดูรายละเอียดผู้ได้รับรางวัล */
  const [recipientsModalPrize, setRecipientsModalPrize] = useState(null);
  const [recipientsModalLoading, setRecipientsModalLoading] = useState(false);
  const [recipientsModalData, setRecipientsModalData] = useState(null);
  const [recipientsModalError, setRecipientsModalError] = useState("");
  /** กดเฉลยภาพใต้ป้ายที่ยังไม่เปิดแล้ว */
  const [centralSolutionShown, setCentralSolutionShown] = useState(false);
  /** ลำดับการเปิดป้ายในรอบ (เกมส่วนกลาง) — ใช้เลือกกรอบเขียวครบ need ใบในชุดที่จบรอบ */
  const centralRevealSeqRef = useRef(0);
  /** รูปตัวแทนแต่ละชุด (จาก API) — แสดงข้างกติกา */
  const [setPreviewUrls, setSetPreviewUrls] = useState([]);

  useEffect(() => {
    if (!recipientsModalPrize) {
      setRecipientsModalData(null);
      setRecipientsModalError("");
      setRecipientsModalLoading(false);
      return undefined;
    }
    if (!resolvedGameId) {
      setRecipientsModalError(
        "เปิดจากหน้าเกมที่มีรหัส (ลิงก์ /game/...) เพื่อดูรายชื่อผู้ได้รับ"
      );
      setRecipientsModalLoading(false);
      return undefined;
    }
    const rid = recipientsModalPrize.ruleId;
    if (rid == null) return undefined;
    let cancel = false;
    setRecipientsModalLoading(true);
    setRecipientsModalError("");
    setRecipientsModalData(null);
    const url = `/api/public/games/${encodeURIComponent(resolvedGameId)}/rules/${encodeURIComponent(String(rid))}/awards`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (!data.ok) throw new Error(data.error || "โหลดไม่สำเร็จ");
        setRecipientsModalData(data);
      })
      .catch((e) => {
        if (!cancel) setRecipientsModalError(e.message);
      })
      .finally(() => {
        if (!cancel) setRecipientsModalLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [recipientsModalPrize, resolvedGameId]);

  const applyLocalDeck = useCallback(() => {
    clearStoredSession();
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
    setHeartCurrencyMode("both");
    setAcceptsPinkHeartsMeta(true);
    setCentralPayWith("pink");
    setCentralEntryGiftCtx({ gameCreatedBy: null, allowGiftRedPlay: false });
    setCentralCreatorUsername(null);
    setBootError(null);
    setSetPreviewUrls([]);
    setCentralSolutionShown(false);
    centralRevealSeqRef.current = 0;
  }, []);

  /** แสดงกระดานเกมส่วนกลางจาก meta โดยไม่มี session — ให้ผู้เล่นเห็นเกมจริงแต่เปิดป้ายไม่ได้จนกว่าจะมีหัวใจ */
  const applyCentralPreviewFromMeta = useCallback((meta, reason) => {
    clearStoredSession();
    setMode("api");
    setApiGameMode("central");
    setSessionId(null);
    setPlayLocked(true);
    setPlayLockReason(
      reason ||
        "กด「เริ่มเล่นเกม」เพื่อหักหัวใจตามที่เกมกำหนด (ถ้ามี) แล้วเริ่มเปิดป้ายได้"
    );
    setResultModalOpen(false);
    setCentralSolutionShown(false);
    centralRevealSeqRef.current = 0;
    const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
    const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
    setPinkHeartCost(p);
    setRedHeartCost(r);
    setHeartCurrencyMode(
      ["both", "pink_only", "red_only", "either"].includes(meta.heartCurrencyMode)
        ? meta.heartCurrencyMode
        : "both"
    );
    setAcceptsPinkHeartsMeta(meta.acceptsPinkHearts !== false);
    setCentralPayWith("pink");
    setCentralEntryGiftCtx({
      gameCreatedBy: meta.gameCreatedBy ?? null,
      allowGiftRedPlay: Boolean(meta.allowGiftRedPlay)
    });
    setCentralCreatorUsername(
      meta.creatorUsername != null && String(meta.creatorUsername).trim()
        ? String(meta.creatorUsername).trim().toLowerCase()
        : null
    );
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
        imageUrl: null,
        openedByPlayer: false
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
    setCentralTileBackCoverUrl(String(meta.tileBackCoverUrl || "").trim());
    setSetCounts(Array.from({ length: sc }, () => 0));
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setSetPreviewUrls(Array.isArray(meta.setPreviewUrls) ? meta.setPreviewUrls : []);
    setBootError(null);
  }, []);

  const applyApiSession = useCallback((data) => {
    centralRevealSeqRef.current = 0;
    setCentralSolutionShown(false);
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
      setHeartCurrencyMode(
        ["both", "pink_only", "red_only", "either"].includes(data.heartCurrencyMode)
          ? data.heartCurrencyMode
          : "both"
      );
      setAcceptsPinkHeartsMeta(data.acceptsPinkHearts !== false);
      setCentralEntryGiftCtx({
        gameCreatedBy: data.gameCreatedBy ?? null,
        allowGiftRedPlay: Boolean(data.allowGiftRedPlay)
      });
      setCentralCreatorUsername(
        data.creatorUsername != null && String(data.creatorUsername).trim()
          ? String(data.creatorUsername).trim().toLowerCase()
          : null
      );
      setHeartCost(p + r);
    } else {
      setPinkHeartCost(0);
      setRedHeartCost(0);
      setHeartCurrencyMode("both");
      setAcceptsPinkHeartsMeta(true);
      setCentralEntryGiftCtx({ gameCreatedBy: null, allowGiftRedPlay: false });
      setCentralCreatorUsername(null);
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
        imageUrl: null,
        openedByPlayer: false
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
      setCentralTileBackCoverUrl(String(data.tileBackCoverUrl || "").trim());
      setSetCounts(Array.from({ length: sc }, () => 0));
      setApiCounts({ cash: 0, coffee: 0, discount: 0 });
      setSetPreviewUrls(Array.isArray(data.setPreviewUrls) ? data.setPreviewUrls : []);
    } else {
      setSetCounts([]);
      setSetImageCounts([]);
      setCentralTitle("");
      setCentralDescription("");
      setCentralGameCoverUrl("");
      setCentralTileBackCoverUrl("");
      setApiCounts({ cash: 0, coffee: 0, discount: 0 });
      setSetPreviewUrls([]);
    }
    setBootError(null);
  }, []);

  const applyRestoredCentralState = useCallback((st) => {
    setMode("api");
    setApiGameMode("central");
    setPlayLocked(false);
    setPlayLockReason("");
    setSessionId(st.sessionId);
    setPinkHeartCost(Math.max(0, Number(st.pinkHeartCost) || 0));
    setRedHeartCost(Math.max(0, Number(st.redHeartCost) || 0));
    setHeartCurrencyMode(
      ["both", "pink_only", "red_only", "either"].includes(st.heartCurrencyMode)
        ? st.heartCurrencyMode
        : "both"
    );
    setAcceptsPinkHeartsMeta(st.acceptsPinkHearts !== false);
    setCentralEntryGiftCtx({
      gameCreatedBy: st.gameCreatedBy ?? null,
      allowGiftRedPlay: Boolean(st.allowGiftRedPlay)
    });
    setCentralCreatorUsername(
      st.creatorUsername != null && String(st.creatorUsername).trim()
        ? String(st.creatorUsername).trim().toLowerCase()
        : null
    );
    setHeartCost(
      Math.max(0, Number(st.pinkHeartCost) || 0) + Math.max(0, Number(st.redHeartCost) || 0)
    );
    setPrizeList(Array.isArray(st.prizes) && st.prizes.length ? st.prizes : PRIZES);
    const rowCells = Array.isArray(st.cells) ? st.cells : [];
    const n =
      rowCells.length > 0 ? rowCells.length : Math.max(1, Number(st.cardCount) || 12);
    centralRevealSeqRef.current = 0;
    let restoreSeq = 0;
    setCards(
      Array.from({ length: n }, (_, i) => {
        const c = rowCells[i];
        if (!c || !c.revealed) {
          return { index: i, revealed: false, key: null, imageUrl: null, openedByPlayer: false };
        }
        restoreSeq += 1;
        return {
          index: i,
          revealed: true,
          key: c.key ?? `${c.setIndex}-${c.imageIndex}`,
          imageUrl: c.imageUrl ?? null,
          openedByPlayer: true,
          revealSeq: restoreSeq
        };
      })
    );
    centralRevealSeqRef.current = restoreSeq;
    setFlips(Number(st.flips) || 0);
    const sc = Math.max(1, Number(st.setCount) || 1);
    const sic = Array.isArray(st.setImageCounts) ? st.setImageCounts : [];
    setSetImageCounts(sic);
    setImagesPerSet(
      sic.length ? Math.max(...sic.map((x) => Number(x) || 0), 1) : Number(st.imagesPerSet) || 4
    );
    setCentralTitle(String(st.title || "เกมส่วนกลาง"));
    setCentralDescription(String(st.description || "").trim());
    setCentralGameCoverUrl(String(st.gameCoverUrl || "").trim());
    setCentralTileBackCoverUrl(String(st.tileBackCoverUrl || "").trim());
    const setCountsUse = Array.from({ length: sc }, () => 0);
    if (Array.isArray(st.setCounts) && st.setCounts.length >= sc) {
      for (let j = 0; j < sc; j++) setCountsUse[j] = Math.max(0, Number(st.setCounts[j]) || 0);
    } else {
      for (const c of rowCells) {
        if (c.revealed && c.setIndex != null) {
          const si = Math.floor(Number(c.setIndex));
          if (si >= 0 && si < sc) setCountsUse[si] += 1;
        }
      }
    }
    setSetCounts(setCountsUse);
    setApiCounts({ cash: 0, coffee: 0, discount: 0 });
    setSetPreviewUrls(Array.isArray(st.setPreviewUrls) ? st.setPreviewUrls : []);
    setBootError(null);
    setCentralSolutionShown(false);
    setWinner(null);
    setCentralLoss(null);
    if (st.finished && st.winner) {
      setWinner({
        key: st.winner.ruleId || "win",
        label: st.winner.label || "ได้รับรางวัล",
        emoji: "🎁",
        outcomeSetIndex:
          st.winner.setIndex != null ? Math.max(0, Math.floor(Number(st.winner.setIndex)) || 0) : undefined
      });
      setCentralSolutionShown(false);
      setResultModalOpen(true);
    } else if (st.finished && st.loss) {
      setCentralLoss({
        ruleId: st.loss.ruleId,
        label: st.loss.label || "จบรอบ — ไม่มีรางวัล",
        setIndex:
          st.loss.setIndex != null ? Math.max(0, Math.floor(Number(st.loss.setIndex)) || 0) : null
      });
      setCentralSolutionShown(false);
      setResultModalOpen(true);
    } else {
      setResultModalOpen(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    let meta = null;
    (async () => {
      try {
        if (user) await refresh();

        const stored = readStoredSession();
        if (stored?.sessionId) {
          const wrongGame =
            resolvedGameId &&
            stored.centralGameId &&
            stored.centralGameId !== resolvedGameId;
          if (wrongGame) {
            clearStoredSession();
          } else {
            try {
              const st = await fetchGameState(stored.sessionId);
              if (cancelled) return;
              if (st.gameMode === "central") {
                if (resolvedGameId && st.gameId && st.gameId !== resolvedGameId) {
                  clearStoredSession();
                } else {
                  applyRestoredCentralState(st);
                  /* snapshot ตอนเริ่มรอบไม่อัปเดตรูป — ดึง meta ล่าสุดเพื่อรูปกติกา/ปกตรงกับที่เผยแพร่ */
                  if (resolvedGameId) {
                    try {
                      const fresh = await fetchGameMeta(resolvedGameId);
                      if (!cancelled && fresh?.gameMode === "central") {
                        if (Array.isArray(fresh.setPreviewUrls)) {
                          setSetPreviewUrls(fresh.setPreviewUrls);
                        }
                        setCentralGameCoverUrl(String(fresh.gameCoverUrl || "").trim());
                        setCentralTileBackCoverUrl(String(fresh.tileBackCoverUrl || "").trim());
                        if (Array.isArray(fresh.prizes) && fresh.prizes.length) {
                          setPrizeList((prev) =>
                            prev.map((p) => {
                              const np = fresh.prizes.find(
                                (x) => String(x.ruleId) === String(p.ruleId)
                              );
                              return np
                                ? {
                                    ...p,
                                    prizesGivenSoFar:
                                      np.prizesGivenSoFar ?? p.prizesGivenSoFar
                                  }
                                : p;
                            })
                          );
                        }
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                  if (user) await refresh();
                  return;
                }
              }
            } catch {
              clearStoredSession();
            }
          }
        }

        if (cancelled) return;
        try {
          meta = await fetchGameMeta(resolvedGameId);
        } catch {
          meta = null;
        }
        if (cancelled) return;
        if (resolvedGameId && !meta) {
          setBootError("ไม่พบเกมนี้หรือยังไม่เปิดแสดงในรายการ");
          setMode("local");
          setApiGameMode(null);
          setSessionId(null);
          setPlayLocked(false);
          setPlayLockReason("");
          setCentralLoss(null);
          setWinner(null);
          setFlips(0);
          setPrizeList(PRIZES);
          setCards([]);
          setSetCounts([]);
          setCentralTitle("");
          setCentralDescription("");
          setCentralGameCoverUrl("");
          setCentralTileBackCoverUrl("");
          return;
        }
        if (meta?.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          const needPay = p > 0 || r > 0;
          const giftCtxFromMeta = resolveCentralGiftCtx(
            {
              gameCreatedBy: meta.gameCreatedBy ?? null,
              allowGiftRedPlay: Boolean(meta.allowGiftRedPlay),
              creatorUsername: meta.creatorUsername ?? null
            },
            user
          );
          const canPay = canAffordCentralEntry(
            user,
            p,
            r,
            giftCtxFromMeta,
            currencyMetaFromApi(meta)
          );
          if (resolvedGameId) {
            if (needPay && !canPay) {
              applyCentralPreviewFromMeta(
                meta,
                user
                  ? "หัวใจในบัญชียังไม่พอต่อรอบนี้ (ครบทุกสีตามที่เกมหัก) — เห็นกติกาและกระดานด้านล่าง แต่ยังกดเริ่มรอบไม่ได้จนกว่าจะมียอดพอ"
                  : "หัวใจสาธิตในเครื่องไม่พอ — เห็นกระดานจริง แต่กดเริ่มเล่นไม่ได้ · ล็อกอินหรือรับหัวใจจากร้านค้า"
              );
            } else {
              applyCentralPreviewFromMeta(
                meta,
                "กด「เริ่มเล่นเกม」เพื่อหักหัวใจตามที่เกมกำหนด แล้วจึงเปิดป้ายได้"
              );
            }
            return;
          }
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
        const payArgBoot =
          user &&
          meta?.gameMode === "central" &&
          meta?.heartCurrencyMode === "either" &&
          meta?.acceptsPinkHearts !== false
            ? centralPayWith
            : undefined;
        const data = await fetchGameStart(resolvedGameId, payArgBoot);
        if (cancelled) return;
        if (data.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
          const chargedOnServer = Boolean(data.heartBalances);
          const giftCtxFromStart = resolveCentralGiftCtx(
            {
              gameCreatedBy: data.gameCreatedBy ?? meta?.gameCreatedBy ?? null,
              allowGiftRedPlay: Boolean(
                data.allowGiftRedPlay ?? meta?.allowGiftRedPlay
              ),
              creatorUsername: data.creatorUsername ?? meta?.creatorUsername ?? null
            },
            user
          );
          if (
            (p > 0 || r > 0) &&
            !chargedOnServer &&
            !spendCentralEntryOrFail(user, p, r, giftCtxFromStart)
          ) {
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
          const chargedOnServer = Boolean(data.heartBalances);
          if (paid > 0 && !chargedOnServer && !trySpend(paid)) {
            void fetchGameAbandon(data.sessionId);
            setBootError("หัวใจไม่พอ — สลับเป็นโหมดออฟไลน์");
            applyLocalDeck();
            return;
          }
        }
        applyApiSession(data);
        if (data.heartBalances) await refresh();
      } catch (e) {
        if (!cancelled) {
          if (meta?.gameMode === "central") {
            applyCentralPreviewFromMeta(
              meta,
              e?.code === "INSUFFICIENT_HEARTS"
                ? "หัวใจในบัญชียังไม่พอเริ่มรอบนี้ — เติมหัวใจหรือรอแอดมินอนุมัติ แล้วกดรีเซ็ตกระดาน"
                : "เรียก API เริ่มรอบไม่สำเร็จ — แสดงกระดานจากข้อมูลเกม (เปิดป้ายไม่ได้จนกว่าระบบจะพร้อม)"
            );
            setBootError(String(e.message || e));
          } else {
            setBootError(e.message);
            if (!resolvedGameId) applyLocalDeck();
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
    applyRestoredCentralState,
    authLoading,
    refresh,
    user?.id,
    resolvedGameId
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mode === "api" && apiGameMode === "central" && sessionId) {
      writeStoredSession(sessionId, resolvedGameId);
    }
  }, [mode, apiGameMode, sessionId, resolvedGameId]);

  const roundFinished = Boolean(winner || centralLoss);
  const resultOverlayVisible = roundFinished && resultModalOpen;

  /** กรอบเขียว: ป้ายที่ผู้เล่นเปิดในชุดที่จบรอบ จำนวนเท่า need ของกติกา — หลังปิดโมดัล */
  const centralOutcomeHighlightIndices = useMemo(() => {
    if (mode !== "api" || apiGameMode !== "central" || !roundFinished || resultModalOpen) {
      return new Set();
    }
    const outcomeSetIdx =
      winner?.outcomeSetIndex != null
        ? Math.max(0, Math.floor(Number(winner.outcomeSetIndex)) || 0)
        : centralLoss?.setIndex != null
          ? Math.max(0, Math.floor(Number(centralLoss.setIndex)) || 0)
          : null;
    if (outcomeSetIdx == null) return new Set();

    const ruleIdStr =
      winner != null ? String(winner.key || "") : String(centralLoss?.ruleId ?? "");
    const rule =
      ruleIdStr && prizeList.length
        ? prizeList.find((p) => String(p.ruleId) === ruleIdStr)
        : null;
    const need =
      rule != null ? Math.max(1, Math.floor(Number(rule.need) || 0)) : null;

    const inSet = cards
      .map((c, idx) => ({ idx, c }))
      .filter(
        ({ c }) =>
          c.revealed &&
          c.openedByPlayer &&
          parseCentralTileSetIndex(c.key) === outcomeSetIdx
      )
      .sort((a, b) => (a.c.revealSeq ?? a.idx) - (b.c.revealSeq ?? b.idx));

    if (need == null) {
      return new Set(inSet.map((x) => x.idx));
    }
    return new Set(inSet.slice(0, need).map((x) => x.idx));
  }, [
    mode,
    apiGameMode,
    roundFinished,
    resultModalOpen,
    cards,
    winner,
    centralLoss,
    prizeList
  ]);

  useEffect(() => {
    if (!resultOverlayVisible) {
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
  }, [resultOverlayVisible]);

  useEffect(() => {
    if (!resultOverlayVisible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [resultOverlayVisible]);

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
        centralRevealSeqRef.current += 1;
        const revealSeq = centralRevealSeqRef.current;
        setCards((prev) =>
          prev.map((x, idx) =>
            idx === i
              ? {
                  ...x,
                  revealed: true,
                  key: `${data.setIndex}-${data.imageIndex}`,
                  imageUrl: data.imageUrl || null,
                  openedByPlayer: true,
                  revealSeq
                }
              : x
          )
        );
        if (data.loss) {
          setCentralLoss({
            ruleId: data.loss.ruleId,
            label: data.loss.label || "จบรอบ — ไม่มีรางวัล",
            setIndex:
              data.loss.setIndex != null
                ? Math.max(0, Math.floor(Number(data.loss.setIndex)) || 0)
                : null
          });
          setCentralSolutionShown(false);
          setResultModalOpen(true);
        } else if (data.winner) {
          setWinner({
            key: data.winner.ruleId || "win",
            label: data.winner.label || "ได้รับรางวัล",
            emoji: "🎁",
            outcomeSetIndex:
              data.winner.setIndex != null
                ? Math.max(0, Math.floor(Number(data.winner.setIndex)) || 0)
                : undefined
          });
          setCentralSolutionShown(false);
          setResultModalOpen(true);
          addHearts(1);
        }
        if (data.prizeTallyUpdate?.ruleId != null) {
          setPrizeList((prev) =>
            prev.map((p) =>
              String(p.ruleId) === String(data.prizeTallyUpdate.ruleId)
                ? {
                    ...p,
                    prizesGivenSoFar: data.prizeTallyUpdate.prizesGivenSoFar
                  }
                : p
            )
          );
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

  async function revealCentralSolution() {
    if (!sessionId || busy || !roundFinished || centralSolutionShown) return;
    setBusy(true);
    try {
      const data = await fetchRevealRemaining(sessionId);
      setCards((prev) =>
        prev.map((c, idx) => {
          const hit = data.cells.find((x) => x.index === idx);
          if (!hit) return c;
          return {
            ...c,
            revealed: true,
            imageUrl: hit.imageUrl,
            key: hit.key,
            openedByPlayer: false
          };
        })
      );
      setCentralSolutionShown(true);
    } catch (e) {
      setBootError(e.message);
    } finally {
      setBusy(false);
    }
  }

  /** หน้าเกมรายตัว (/game/[id]): หลังโหลด meta ต้องกดปุ่มนี้ก่อน — ค่อย POST /start (หักหัวใจ) */
  const startCentralRound = useCallback(async () => {
    if (!resolvedGameId || busy) return;
    if (sessionId || !playLocked || apiGameMode !== "central") return;
    const p = Math.max(0, Math.floor(Number(pinkHeartCost) || 0));
    const r = Math.max(0, Math.floor(Number(redHeartCost) || 0));
    if (
      (p > 0 || r > 0) &&
      !canAffordCentralEntry(user, p, r, centralGiftCtxResolved, centralCurrencyMeta)
    )
      return;
    let meta = null;
    setBusy(true);
    setBootError(null);
    try {
      try {
        meta = await fetchGameMeta(resolvedGameId);
      } catch {
        meta = null;
      }
      if (!meta || meta.gameMode !== "central") {
        setBootError("ไม่พบเกมหรือยังไม่เปิดแสดงในรายการ");
        return;
      }
      const mp = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
      const mr = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
      const ctxLive = resolveCentralGiftCtx(
        {
          gameCreatedBy: meta.gameCreatedBy ?? null,
          allowGiftRedPlay: Boolean(meta.allowGiftRedPlay),
          creatorUsername: meta.creatorUsername ?? null
        },
        user
      );
      if (
        (mp > 0 || mr > 0) &&
        !canAffordCentralEntry(user, mp, mr, ctxLive, currencyMetaFromApi(meta))
      ) {
        applyCentralPreviewFromMeta(
          meta,
          user
            ? "หัวใจในบัญชียังไม่พอเริ่มรอบนี้ — เติมหัวใจแล้วลองอีกครั้ง"
            : "หัวใจสาธิตไม่พอเริ่มรอบ — ล็อกอินหรือรับหัวใจจากร้านค้า"
        );
        return;
      }
      const payArg =
        user &&
        meta?.heartCurrencyMode === "either" &&
        meta?.acceptsPinkHearts !== false
          ? centralPayWith
          : undefined;
      const data = await fetchGameStart(resolvedGameId, payArg);
      if (data.gameMode === "central") {
        const dp = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
        const dr = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
        const chargedOnServer = Boolean(data.heartBalances);
        const ctxAfterStart = resolveCentralGiftCtx(
          {
            gameCreatedBy: data.gameCreatedBy ?? meta?.gameCreatedBy ?? null,
            allowGiftRedPlay: Boolean(
              data.allowGiftRedPlay ?? meta?.allowGiftRedPlay
            ),
            creatorUsername: data.creatorUsername ?? meta?.creatorUsername ?? null
          },
          user
        );
        if (
          (dp > 0 || dr > 0) &&
          !chargedOnServer &&
          !spendCentralEntryOrFail(user, dp, dr, ctxAfterStart)
        ) {
          void fetchGameAbandon(data.sessionId);
          applyCentralPreviewFromMeta(
            meta,
            "เริ่มรอบไม่สำเร็จ (หัวใจไม่พอ) — ลองอีกครั้งเมื่อยอดพอ"
          );
          return;
        }
      }
      applyApiSession(data);
      if (data.heartBalances) await refresh();
    } catch (e) {
      let snap = meta;
      if (!snap) {
        try {
          snap = await fetchGameMeta(resolvedGameId);
        } catch {
          snap = null;
        }
      }
      if (snap?.gameMode === "central") {
        applyCentralPreviewFromMeta(
          snap,
          e?.code === "INSUFFICIENT_HEARTS"
            ? "หัวใจไม่พอเริ่มรอบ — เติมหัวใจแล้วกดเริ่มใหม่"
            : "เริ่มรอบไม่สำเร็จ — ลองอีกครั้ง"
        );
        setBootError(String(e.message || e));
      } else {
        setBootError(String(e.message || e));
      }
    } finally {
      setBusy(false);
    }
  }, [
    resolvedGameId,
    busy,
    sessionId,
    playLocked,
    apiGameMode,
    pinkHeartCost,
    redHeartCost,
    centralGiftCtxResolved,
    centralCurrencyMeta,
    centralPayWith,
    user,
    applyApiSession,
    applyCentralPreviewFromMeta,
    refresh
  ]);

  async function reset() {
    if (mode === "api") {
      setBusy(true);
      if (sessionId) void fetchGameAbandon(sessionId);
      if (apiGameMode === "central") clearStoredSession();
      setResultModalOpen(false);
      setCentralSolutionShown(false);
      let meta = null;
      try {
        try {
          meta = await fetchGameMeta(resolvedGameId);
        } catch {
          meta = null;
        }
        if (resolvedGameId && !meta) {
          setBootError("ไม่พบเกมนี้หรือยังไม่เปิดแสดงในรายการ");
          setMode("local");
          setApiGameMode(null);
          setSessionId(null);
          setPlayLocked(false);
          setPlayLockReason("");
          setCentralLoss(null);
          setWinner(null);
          setFlips(0);
          setPrizeList(PRIZES);
          setCards([]);
          setSetCounts([]);
          setCentralTitle("");
          setCentralDescription("");
          setCentralGameCoverUrl("");
          setCentralTileBackCoverUrl("");
          return;
        }
        if (meta?.gameMode === "central" && resolvedGameId) {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          const needPay = p > 0 || r > 0;
          const gctx = resolveCentralGiftCtx(
            {
              gameCreatedBy: meta.gameCreatedBy ?? null,
              allowGiftRedPlay: Boolean(meta.allowGiftRedPlay),
              creatorUsername: meta.creatorUsername ?? null
            },
            user
          );
          const canPay = canAffordCentralEntry(
            user,
            p,
            r,
            gctx,
            currencyMetaFromApi(meta)
          );
          if (needPay && !canPay) {
            applyCentralPreviewFromMeta(
              meta,
              user
                ? "หัวใจในบัญชียังไม่พอต่อรอบนี้ — กด「เริ่มเล่นเกม」ไม่ได้จนกว่าจะมียอดพอ"
                : "หัวใจสาธิตไม่พอ — กดเริ่มเล่นไม่ได้จนกว่าจะมียอดพอ"
            );
          } else {
            applyCentralPreviewFromMeta(
              meta,
              "กด「เริ่มเล่นเกม」เพื่อหักหัวใจตามที่เกมกำหนด แล้วเริ่มรอบใหม่"
            );
          }
          setWinner(null);
          setCentralLoss(null);
          setFlips(0);
          return;
        }
        if (meta?.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(meta.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(meta.redHeartCost) || 0));
          const needPay = p > 0 || r > 0;
          const gctx2 = resolveCentralGiftCtx(
            {
              gameCreatedBy: meta.gameCreatedBy ?? null,
              allowGiftRedPlay: Boolean(meta.allowGiftRedPlay),
              creatorUsername: meta.creatorUsername ?? null
            },
            user
          );
          const canPay = canAffordCentralEntry(
            user,
            p,
            r,
            gctx2,
            currencyMetaFromApi(meta)
          );
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
        const payArgMain =
          user &&
          meta?.heartCurrencyMode === "either" &&
          meta?.acceptsPinkHearts !== false
            ? centralPayWith
            : undefined;
        const data = await fetchGameStart(resolvedGameId, payArgMain);
        if (data.gameMode === "central") {
          const p = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
          const r = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
          const chargedOnServer = Boolean(data.heartBalances);
          const gctxStart = resolveCentralGiftCtx(
            {
              gameCreatedBy: data.gameCreatedBy ?? meta?.gameCreatedBy ?? null,
              allowGiftRedPlay: Boolean(
                data.allowGiftRedPlay ?? meta?.allowGiftRedPlay
              ),
              creatorUsername: data.creatorUsername ?? meta?.creatorUsername ?? null
            },
            user
          );
          if (
            (p > 0 || r > 0) &&
            !chargedOnServer &&
            !spendCentralEntryOrFail(user, p, r, gctxStart)
          ) {
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
          const chargedOnServer = Boolean(data.heartBalances);
          if (paid > 0 && !chargedOnServer && !trySpend(paid)) {
            void fetchGameAbandon(data.sessionId);
            setBootError("หัวใจไม่พอ");
            applyLocalDeck();
            return;
          }
        }
        applyApiSession(data);
        if (data.heartBalances) await refresh();
      } catch (e) {
        if (meta?.gameMode === "central") {
          applyCentralPreviewFromMeta(meta);
          setBootError(String(e.message || e));
        } else {
          setBootError(e.message);
          if (!resolvedGameId) applyLocalDeck();
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

  const centralNeedsHeartsForStart =
    mode === "api" &&
    apiGameMode === "central" &&
    (pinkHeartCost > 0 || redHeartCost > 0);
  const centralCanAffordStart =
    !centralNeedsHeartsForStart ||
    canAffordCentralEntry(
      user,
      pinkHeartCost,
      redHeartCost,
      centralGiftCtxResolved,
      centralCurrencyMeta
    );

  const centralAffordHint = useMemo(() => {
    if (!user || !centralNeedsHeartsForStart || centralCanAffordStart) return "";
    const p = pinkHeartCost;
    const r = redHeartCost;
    const pu = Math.max(0, Math.floor(Number(user.pinkHeartsBalance)) || 0);
    const gr = Math.max(0, Math.floor(Number(user.redHeartsBalance)) || 0);
    const ctx = centralGiftCtxResolved;
    let gift = 0;
    if (ctx.allowGiftRedPlay) gift = totalRoomGiftRed(user);
    else if (ctx.gameCreatedBy) gift = roomGiftRedForCreator(user, ctx.gameCreatedBy);
    const totalRed = gr + gift;
    if (p > 0 && pu < p) {
      return "เกมนี้หักหัวใจชมพูด้วย — แดงจากรหัสห้องใช้แทนชมพูไม่ได้ ต้องมีชมพูในบัญชีให้พอตามที่เกมกำหนด";
    }
    if (r > 0 && totalRed < r) {
      return "หัวใจแดงรวม (ทั่วไป + หัวใจแดงห้องเกมของเจ้าของเกมนี้) ยังไม่พอต่อรอบ — ตรวจว่าเล่นเกมของ @ เดียวกับที่ออกรหัสให้คุณ";
    }
    return "";
  }, [
    user,
    centralNeedsHeartsForStart,
    centralCanAffordStart,
    pinkHeartCost,
    redHeartCost,
    centralGiftCtxResolved
  ]);
  const showCentralPlayActions =
    Boolean(resolvedGameId) &&
    mode === "api" &&
    apiGameMode === "central" &&
    cards.length > 0;
  const isCentralLiveUi = mode === "api" && apiGameMode === "central";
  /** หน้า /game/[id] — ลดข้อความซ้ำกับหัวข้อหน้า */
  const compactPlayLayout = Boolean(resolvedGameId);
  const showCompactCentralStatsBar =
    compactPlayLayout && mode === "api" && apiGameMode === "central";
  const compactCentralStatsBar = showCompactCentralStatsBar ? (
    <div
      className={
        isCentralLiveUi
          ? "rounded-xl border border-amber-600/35 bg-zinc-950/90 px-3 py-3 text-zinc-200 shadow-lg ring-1 ring-amber-500/20 sm:px-4"
          : "rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 shadow-sm sm:px-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
        <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className={
              isCentralLiveUi
                ? "shrink-0 font-semibold text-amber-200/90"
                : "shrink-0 font-medium text-slate-800"
            }
          >
            {cards.length} ป้าย
          </span>
          {pinkHeartCost > 0 || redHeartCost > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={isCentralLiveUi ? "text-zinc-500" : "text-slate-500"}>หักต่อรอบ</span>
              {pinkHeartCost > 0 ? (
                <span
                  className={
                    isCentralLiveUi
                      ? "inline-flex items-center gap-2 rounded-lg bg-pink-950/55 px-2.5 py-1.5 text-pink-100 ring-1 ring-pink-500/35"
                      : "inline-flex items-center gap-2 rounded-lg bg-pink-50 px-2.5 py-1.5 text-pink-900 ring-1 ring-pink-200/90"
                  }
                  title="หัวใจชมพู"
                >
                  <InlineHeart size="xl" className={isCentralLiveUi ? "text-pink-400" : "text-pink-500"} />
                  <span className="text-sm font-bold tabular-nums">{pinkHeartCost}</span>
                  <span
                    className={
                      isCentralLiveUi
                        ? "text-sm font-semibold text-pink-200/95"
                        : "text-sm font-semibold text-pink-800"
                    }
                  >
                    หัวใจชมพู
                  </span>
                </span>
              ) : null}
              {pinkHeartCost > 0 && redHeartCost > 0 ? (
                <span className={isCentralLiveUi ? "text-zinc-700" : "text-slate-300"} aria-hidden>
                  ·
                </span>
              ) : null}
              {redHeartCost > 0 ? (
                <span
                  className={
                    isCentralLiveUi
                      ? "inline-flex items-center gap-2 rounded-lg bg-red-950/55 px-2.5 py-1.5 text-red-100 ring-1 ring-red-500/40"
                      : "inline-flex items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-red-900 ring-1 ring-red-200/80"
                  }
                  title="หัวใจแดงห้องเกม"
                >
                  <InlineHeart size="xl" className={isCentralLiveUi ? "text-red-500" : "text-red-600"} />
                  <span className="text-sm font-bold tabular-nums">{redHeartCost}</span>
                  <span
                    className={
                      isCentralLiveUi
                        ? "text-sm font-semibold text-red-100/95"
                        : "text-sm font-semibold text-red-800"
                    }
                  >
                    หัวใจแดงห้องเกม
                  </span>
                </span>
              ) : null}
            </span>
          ) : (
            <span className={isCentralLiveUi ? "text-zinc-500" : "text-slate-500"}>เริ่มรอบฟรี</span>
          )}
        </span>
        <span className={isCentralLiveUi ? "shrink-0 text-amber-200/70" : "shrink-0 text-slate-500"}>
          เปิดแล้ว {flips} ครั้ง
        </span>
      </div>
    </div>
  ) : null;

  if (mode === null && cards.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-rose-500"
            aria-hidden
          />
          กำลังเตรียมกระดาน…
        </span>
      </div>
    );
  }

  if (resolvedGameId && mode === "local" && cards.length === 0) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">{bootError || "ไม่สามารถโหลดเกมได้"}</p>
          <Link
            href="/game"
            className="mt-3 inline-block text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-rose-600"
          >
            ← กลับไปหน้ารายการเกม
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isCentralLiveUi ? "space-y-5" : "mt-5 space-y-5 sm:mt-6"
      }
    >
      {serverCentralPublished && mode === "local" && !resolvedGameId ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">มีเกมส่วนกลางเผยแพร่แล้ว แต่ตอนนี้แสดงโหมดสาธิตในเครื่อง</p>
          <p className="mt-1 text-amber-900/95">
            สาเหตุที่พบบ่อย: <strong>หัวใจไม่พอต่อรอบ</strong> (ล็อกอิน = ต้องมียอดชมพูและแดงครบตามที่เกมกำหนดแยกสี) · หรือเรียก API ไม่สำเร็จ
            (ดูข้อความสีส้มด้านล่าง) — ตั้งหักหัวใจเป็น 0 ในเกมส่วนกลางเพื่อทดสอบ หรือให้แอดมินปรับยอด
          </p>
        </div>
      ) : null}
      {playLocked && apiGameMode === "central" && playLockReason ? (
        compactPlayLayout ? null : (
          <div
            className={
              isCentralLiveUi
                ? resolvedGameId && centralCanAffordStart
                  ? "rounded-xl border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-950/80 to-zinc-950 px-4 py-3 text-sm text-zinc-100 shadow-lg ring-1 ring-emerald-500/30"
                  : "rounded-xl border border-amber-600/35 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-200 shadow-lg ring-1 ring-amber-500/20"
                : resolvedGameId && centralCanAffordStart
                  ? "rounded-xl border-2 border-emerald-400 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950"
                  : "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
            }
          >
            <p
              className={
                isCentralLiveUi
                  ? resolvedGameId && centralCanAffordStart
                    ? "font-semibold text-emerald-300"
                    : "font-semibold text-amber-200/90"
                  : "font-semibold"
              }
            >
              {resolvedGameId && centralCanAffordStart
                ? "พร้อมเริ่มรอบ"
                : "ดูเกมได้ — เล่นเปิดป้ายเมื่อมีหัวใจพอ"}
            </p>
            <p
              className={
                isCentralLiveUi
                  ? resolvedGameId && centralCanAffordStart
                    ? "mt-1 text-emerald-100/90"
                    : "mt-1 text-zinc-300"
                  : resolvedGameId && centralCanAffordStart
                    ? "mt-1 text-emerald-900/95"
                    : "mt-1 text-slate-800"
              }
            >
              {playLockReason}
            </p>
            {!resolvedGameId || !centralCanAffordStart ? (
              <p
                className={
                  isCentralLiveUi ? "mt-2 text-sm text-zinc-400" : "mt-2 text-sm text-slate-800"
                }
              >
                กด「รีเซ็ตกระดาน」หลังได้รับหัวใจแล้ว ระบบจะกลับมาหน้าจอเริ่มรอบ
              </p>
            ) : null}
            {centralAffordHint && (!resolvedGameId || !centralCanAffordStart) ? (
              <p
                className={
                  isCentralLiveUi
                    ? "mt-2 rounded-md border border-amber-600/40 bg-amber-950/50 px-2 py-1.5 text-sm font-medium text-amber-200 ring-1 ring-amber-500/25"
                    : "mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-950 ring-1 ring-amber-200/90"
                }
              >
                {centralAffordHint}
              </p>
            ) : null}
            {resolvedGameId && centralCanAffordStart ? (
              <p
                className={
                  isCentralLiveUi
                    ? "mt-2 text-sm text-emerald-200/85"
                    : "mt-2 text-sm text-emerald-800/90"
                }
              >
                กดปุ่ม「เริ่มเล่นเกม」ด้านล่างเพื่อหักหัวใจ (ถ้ามี) แล้วเปิดป้ายได้
              </p>
            ) : null}
          </div>
        )
      ) : null}
      {showCompactCentralStatsBar && !showCentralPlayActions
        ? compactCentralStatsBar
        : null}
      {!showCompactCentralStatsBar ? (
        <div
          className={
            isCentralLiveUi
              ? "rounded-2xl border border-amber-600/35 bg-gradient-to-b from-zinc-900/95 to-black p-4 text-sm text-zinc-200 shadow-lg ring-1 ring-amber-500/15 sm:p-5"
              : "rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
          }
        >
          <div
            className={
              mode === "api" && apiGameMode === "central" ? "flex gap-3" : ""
            }
          >
            {mode === "api" && apiGameMode === "central" ? (
              <div
                className={
                  isCentralLiveUi
                    ? "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-amber-600/40 bg-black/40 ring-1 ring-amber-500/25"
                    : "h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={centralGameCoverUrl.trim() || DEFAULT_CENTRAL_GAME_COVER_PATH}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className={isCentralLiveUi ? "text-zinc-100" : ""}>
                <strong className={isCentralLiveUi ? "text-amber-200" : ""}>
                  {mode === "api" && apiGameMode === "central"
                    ? centralTitle || "เกมส่วนกลาง"
                    : "โหมดสาธิต"}
                  :
                </strong>{" "}
                {mode === "api" && apiGameMode === "central"
                  ? playLocked
                    ? resolvedGameId
                      ? `กระดาน ${cards.length} ป้าย — กด「เริ่มเล่นเกม」เพื่อหักหัวใจแล้วเปิดป้าย`
                      : `กระดานจริง ${cards.length} ป้าย — เปิดป้ายได้เมื่อมีหัวใจพอต่อรอบ`
                    : `เปิดป้ายในชุดเดียวกันครบตามกติกา = ชนะ · ${cards.length} ป้าย`
                  : "สะสมภาพครบตามเงื่อนไขก่อน = ชนะ"}
              </p>
            </div>
          </div>
          {mode === "api" &&
          apiGameMode === "central" &&
          centralDescription &&
          !isCentralLiveUi ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {centralDescription}
            </p>
          ) : null}
          <p
            className={
              isCentralLiveUi
                ? "mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400"
                : "mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500"
            }
          >
            {mode === "api" ? (
              <span
                className={
                  isCentralLiveUi
                    ? "rounded-full border border-amber-600/30 bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
                    : "rounded-full bg-slate-50 px-2 py-0.5 text-rose-600"
                }
              >
                {apiGameMode === "central"
                  ? playLocked
                    ? resolvedGameId
                      ? "เกมส่วนกลาง — รอกดเริ่มเล่นเกม"
                      : "เกมส่วนกลาง (ดูอย่างเดียว — ยังไม่เริ่มรอบ)"
                    : "เกมส่วนกลางจากแอดมิน — ค่าใต้ป้ายที่เซิร์ฟเวอร์"
                  : "เชื่อม API — กติกาเดิมในโค้ด"}
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                โหมดออฟไลน์ — สุ่มในเบราว์เซอร์
              </span>
            )}
            {mode === "api" && apiGameMode === "central" && (pinkHeartCost > 0 || redHeartCost > 0) ? (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span>
                  {user
                    ? "หักต่อรอบจากบัญชีเมื่อเริ่มรอบ (ชมพู/แดงแยกตามที่เกมกำหนด):"
                    : "หักต่อรอบ (สาธิตในเครื่อง — หักแยกสีตามที่ตั้ง):"}
                </span>
                {pinkHeartCost > 0 ? (
                  <span
                    className={
                      isCentralLiveUi
                        ? "inline-flex items-center gap-0.5 text-pink-300"
                        : "inline-flex items-center gap-0.5 text-rose-600"
                    }
                  >
                    <InlineHeart size="sm" className="text-rose-400" />
                    ชมพู {pinkHeartCost}
                  </span>
                ) : null}
                {pinkHeartCost > 0 && redHeartCost > 0 ? (
                  <span className={isCentralLiveUi ? "text-zinc-600" : "text-slate-500"}>
                    ·
                  </span>
                ) : null}
                {redHeartCost > 0 ? (
                  <span
                    className={
                      isCentralLiveUi
                        ? "inline-flex items-center gap-0.5 text-red-300"
                        : "inline-flex items-center gap-0.5 text-red-700"
                    }
                  >
                    <InlineHeart size="sm" className="text-red-600" />
                    แดง {redHeartCost}
                  </span>
                ) : null}
              </span>
            ) : null}
            {mode === "api" && apiGameMode !== "central" && heartCost > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span>หักรวม</span>
                <InlineHeart size="sm" className="text-pink-500" />
                <span>{heartCost} ต่อรอบ (ชมพูก่อน แล้วแดง — สาธิต)</span>
              </span>
            ) : null}
          </p>
          {bootError ? (
            <p
              className={
                isCentralLiveUi ? "mt-1 text-sm text-amber-400" : "mt-1 text-sm text-amber-700"
              }
            >
              {bootError}
            </p>
          ) : null}
          <p className={isCentralLiveUi ? "mt-1 text-sm text-zinc-500" : "mt-1 text-sm text-slate-500"}>
            {mode === "api" && apiGameMode === "central"
              ? setImageCounts.length > 0
                ? `ป้ายในชุดไม่เท่ากัน: ${setImageCounts.map((x, i) => `ช.${i + 1}=${x}`).join(" · ")} — สุ่มตำแหน่งใหม่ทุกรอบ`
                : `แต่ละชุดมีสูงสุด ${imagesPerSet} แบบภาพ — สุ่มตำแหน่งใหม่ทุกรอบ`
              : "กระดาน 12 ป้าย = 💵×5 + ☕×4 + 🎫×3 — สุ่มตำแหน่งใหม่ทุกรอบ"}
          </p>
          <p className={isCentralLiveUi ? "mt-1 text-sm text-amber-200/80" : "mt-1 text-sm"}>
            เปิดป้ายแล้ว: {flips} ครั้ง
          </p>
        </div>
      ) : null}

      {compactPlayLayout && bootError ? (
        <p
          className={
            isCentralLiveUi ? "text-sm text-amber-400" : "text-sm text-amber-700"
          }
        >
          {bootError}
        </p>
      ) : null}

      <div
        className={
          isCentralLiveUi
            ? "rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-4 text-sm shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] ring-1 ring-amber-500/20 sm:p-5"
            : "rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
        }
      >
        <p
          className={
            isCentralLiveUi
              ? "text-xs font-bold uppercase tracking-[0.22em] text-amber-500"
              : "text-sm font-semibold uppercase tracking-wide text-slate-500"
          }
        >
          {compactPlayLayout ? "กติกา" : "กติกา / ความคืบหน้า"}
        </p>
        {mode === "api" && apiGameMode === "central" ? (
          <ul
            className={
              isCentralLiveUi ? "mt-4 space-y-3 text-zinc-200" : "mt-3 space-y-2.5 text-slate-800"
            }
          >
            {prizeList.map((p) => {
              const setIdx = Math.max(0, Math.floor(Number(p.setIndex)) || 0);
              const opened = setCounts[setIdx] ?? setCounts[p.setIndex] ?? 0;
              const cap = p.imagesPerSet ?? imagesPerSet;
              const rawThumb =
                Array.isArray(setPreviewUrls) && setPreviewUrls[setIdx] != null
                  ? setPreviewUrls[setIdx]
                  : null;
              const thumb =
                rawThumb != null && String(rawThumb).trim() !== ""
                  ? String(rawThumb).trim()
                  : "";
              return (
                <li
                  key={p.key}
                  className={
                    isCentralLiveUi
                      ? "flex gap-3 rounded-xl border border-amber-600/25 bg-black/40 p-3.5 backdrop-blur-sm transition hover:border-amber-500/45 hover:bg-black/50 hover:shadow-lg hover:shadow-amber-950/25 sm:p-4"
                      : "flex gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-200"
                  }
                >
                  <div
                    className={
                      isCentralLiveUi
                        ? "h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-amber-600/40 bg-black/50 ring-1 ring-amber-500/20"
                        : "h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                    }
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover object-center"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className={
                          isCentralLiveUi
                            ? "flex h-full items-center justify-center text-xs font-bold text-amber-400/90"
                            : "flex h-full items-center justify-center text-sm font-medium text-slate-500"
                        }
                      >
                        ช.{setIdx + 1}
                      </div>
                    )}
                  </div>
                  <div
                    className={
                      isCentralLiveUi
                        ? "min-w-0 flex-1 text-sm leading-relaxed text-zinc-200"
                        : "min-w-0 flex-1 text-sm leading-relaxed text-slate-800"
                    }
                  >
                    {p.prizeCategory === "none" ? (
                      <>
                        <p className={isCentralLiveUi ? "text-zinc-100" : ""}>
                          {centralRuleNoneHeadLine(p, cap)}
                        </p>
                        <p className="mt-1.5">
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-medium text-amber-200/55"
                                : "font-medium text-slate-500"
                            }
                          >
                            เปิดในชุดแล้ว{" "}
                          </span>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-mono font-semibold tabular-nums text-amber-100"
                                : "font-mono font-semibold tabular-nums text-slate-900"
                            }
                          >
                            {opened}
                          </span>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-mono text-amber-200/40"
                                : "font-mono text-slate-500"
                            }
                          >
                            /
                          </span>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-mono font-semibold tabular-nums text-amber-100"
                                : "font-mono font-semibold tabular-nums text-slate-900"
                            }
                          >
                            {cap}
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={isCentralLiveUi ? "font-medium text-red-300/95" : ""}>
                          {centralRuleSetConditionLine(p, cap)}
                        </p>
                        <p className={isCentralLiveUi ? "mt-1.5 text-amber-100/90" : "mt-1.5"}>
                          {centralRulePrizeDescriptionLine(p)}
                        </p>
                        <p
                          className={
                            isCentralLiveUi ? "mt-1 text-sm text-zinc-400" : "mt-1 text-sm text-slate-800"
                          }
                        >
                          {centralRuleFulfillmentLine(p)}
                        </p>
                        <p className={isCentralLiveUi ? "mt-1.5 text-zinc-200" : "mt-1.5 text-slate-800"}>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-medium text-amber-200/55"
                                : "font-medium text-slate-500"
                            }
                          >
                            เปิดในชุดแล้ว{" "}
                          </span>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-mono font-semibold tabular-nums text-amber-100"
                                : "font-mono font-semibold tabular-nums text-slate-900"
                            }
                          >
                            {opened}/{cap}
                          </span>
                          <span className={isCentralLiveUi ? "text-zinc-600" : "text-slate-500"}>
                            {" "}
                            ,{" "}
                          </span>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-medium text-amber-200/55"
                                : "font-medium text-slate-500"
                            }
                          >
                            รางวัลออกไปแล้ว{" "}
                          </span>
                          <span
                            className={
                              isCentralLiveUi
                                ? "font-mono font-semibold tabular-nums text-amber-100"
                                : "font-mono font-semibold tabular-nums text-slate-900"
                            }
                          >
                            {`${Math.max(0, Math.floor(Number(p.prizesGivenSoFar) || 0))}/${centralRulePrizeTotalQty(p)}`}
                          </span>{" "}
                          <button
                            type="button"
                            onClick={() => setRecipientsModalPrize(p)}
                            className={
                              isCentralLiveUi
                                ? "inline font-semibold text-amber-400 underline decoration-amber-600/60 underline-offset-2 hover:text-amber-300"
                                : "inline font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-rose-600"
                            }
                          >
                            ดูรายละเอียด
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-2 space-y-1 text-slate-800">
            {prizeList.map((p) => (
              <li key={p.key}>
                {p.emoji} {p.label}: {counts[p.key] ?? 0}/{p.need}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCentralPlayActions ? (
        <div className="space-y-2">
          {showCompactCentralStatsBar ? compactCentralStatsBar : null}
          {playLocked &&
          user &&
          heartCurrencyMode === "either" &&
          acceptsPinkHeartsMeta &&
          (pinkHeartCost > 0 || redHeartCost > 0) ? (
            <div
              className={
                isCentralLiveUi
                  ? "rounded-xl border border-amber-600/35 bg-zinc-950/90 px-3 py-3 text-sm text-zinc-200 shadow-lg ring-1 ring-amber-500/20"
                  : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              }
            >
              <p
                className={
                  isCentralLiveUi ? "font-semibold text-amber-200/90" : "font-medium text-slate-800"
                }
              >
                เกมนี้จ่ายได้ทั้งชมพูหรือแดง — เลือกก่อนเริ่มรอบ
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="central-pay-with"
                    checked={centralPayWith === "pink"}
                    onChange={() => setCentralPayWith("pink")}
                  />
                  <span className={isCentralLiveUi ? "text-pink-200" : ""}>ใช้หัวใจชมพู</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="central-pay-with"
                    checked={centralPayWith === "red"}
                    onChange={() => setCentralPayWith("red")}
                  />
                  <span className={isCentralLiveUi ? "text-red-200" : ""}>ใช้หัวใจแดง</span>
                </label>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={() => void startCentralRound()}
              disabled={
                busy ||
                Boolean(sessionId) ||
                !playLocked ||
                !centralCanAffordStart
              }
              className={
                isCentralLiveUi
                  ? "flex-1 rounded-xl border-2 border-amber-500/70 bg-gradient-to-b from-amber-600 to-amber-800 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-zinc-950 shadow-[0_0_24px_rgba(245,158,11,0.25)] transition hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:from-zinc-800 disabled:to-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  : "flex-1 rounded-xl border-2 border-emerald-500 bg-white px-4 py-3.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              }
            >
              เริ่มเล่นเกม
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className={
                isCentralLiveUi
                  ? "shrink-0 rounded-xl border-2 border-amber-700/50 bg-zinc-900/90 px-4 py-3.5 text-sm font-semibold text-amber-100 shadow-md transition hover:border-amber-500/60 hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:px-5"
                  : "shrink-0 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:px-5"
              }
            >
              รีเซ็ตกระดาน
            </button>
            <button
              type="button"
              onClick={() => void revealCentralSolution()}
              disabled={
                busy ||
                !sessionId ||
                !roundFinished ||
                centralSolutionShown
              }
              className="flex-1 rounded-xl border-2 border-red-500 bg-white px-4 py-3.5 text-sm font-semibold text-red-900 shadow-sm transition hover:bg-red-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
            >
              เฉลยเกม
            </button>
          </div>
          {!compactPlayLayout ? (
            <p className="text-center text-sm leading-relaxed text-slate-500 sm:text-left">
              「เริ่มเล่นเกม」หักหัวใจตามที่เกมกำหนด แล้วเริ่มเปิดป้าย · 「เฉลยเกม」หลังจบรอบ
              แสดงภาพใต้ป้ายที่ยังไม่ได้เปิด
            </p>
          ) : null}
          {resolvedGameId && centralAffordHint && !centralCanAffordStart ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-200/90">
              {centralAffordHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/90 p-3 shadow-inner sm:p-4">
        <div className={gridClass}>
        {cards.map((card, i) => {
          const key = card.key;
          const meta =
            mode === "api" && apiGameMode === "legacy" && key
              ? prizeList.find((p) => p.key === key)
              : null;
          /** กรอบแดง: ป้ายที่ยังไม่เปิด ก่อนกดเฉลย */
          const showRedUnpicked =
            mode === "api" &&
            apiGameMode === "central" &&
            roundFinished &&
            !resultModalOpen &&
            !centralSolutionShown &&
            !card.revealed;
          /** กรอบเขียว: ป้ายที่เปิดในชุดที่จบรอบ ครบ need ตามกติกา — หลังปิดโมดัล */
          const isCentralOutcomeHighlight =
            mode === "api" &&
            apiGameMode === "central" &&
            card.revealed &&
            centralOutcomeHighlightIndices.has(i);
          /** หลังกดเฉลย: ป้ายที่ระบบเปิดให้ (ผู้เล่นไม่ได้เลือก) — ทับเงาเทาอ่อน ไม่ใช้กรอบเขียว */
          const showCentralSolutionDim =
            mode === "api" &&
            apiGameMode === "central" &&
            centralSolutionShown &&
            card.revealed &&
            !card.openedByPlayer;
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
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl border-2 text-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${
                showRedUnpicked
                  ? "border-red-500 ring-2 ring-red-400/90"
                  : isCentralOutcomeHighlight
                    ? "z-[1] border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-400/80"
                    : showCentralSolutionDim
                      ? "border-slate-200 bg-slate-50"
                      : card.revealed
                        ? "border-slate-200 bg-slate-50"
                        : playLocked
                          ? "cursor-not-allowed border-slate-200 bg-slate-300/40 opacity-80"
                          : "border-slate-300 bg-slate-200/60 hover:bg-slate-200/80 active:scale-[0.97]"
              } ${roundFinished && !card.revealed && !showRedUnpicked ? "opacity-50" : ""}`}
            >
              {card.revealed && card.imageUrl ? (
                <span className="relative block h-full w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.imageUrl}
                    alt=""
                    className={`h-full w-full object-cover transition-opacity duration-300 ${
                      isCentralOutcomeHighlight ? "brightness-[1.04] contrast-[1.02]" : ""
                    }`}
                  />
                  {showCentralSolutionDim ? (
                    <span
                      className="pointer-events-none absolute inset-0 bg-black/25"
                      aria-hidden
                    />
                  ) : null}
                </span>
              ) : card.revealed ? (
                <span>{meta?.emoji ?? "✓"}</span>
              ) : mode === "api" && apiGameMode === "central" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    centralTileBackCoverUrl.trim()
                      ? centralTileBackCoverUrl.trim()
                      : DEFAULT_TILE_BACK_COVER_PATH
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                "?"
              )}
            </button>
          );
        })}
        </div>
      </div>

      {recipientsModalPrize ? (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setRecipientsModalPrize(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prize-recipients-title"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="prize-recipients-title"
              className="text-lg font-semibold text-slate-900"
            >
              ผู้ได้รับรางวัล — ชุดที่ {Number(recipientsModalPrize.setIndex) + 1}
            </h2>
            {recipientsModalLoading ? (
              <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
            ) : recipientsModalError ? (
              <p className="mt-4 text-sm text-amber-800">{recipientsModalError}</p>
            ) : recipientsModalData ? (
              <div className="mt-4 space-y-3 text-sm text-slate-800">
                <p className="text-slate-800">
                  แจกไปแล้ว{" "}
                  <span className="font-semibold tabular-nums text-slate-900">
                    {recipientsModalData.givenCount}
                  </span>
                  {recipientsModalData.totalQty != null ? (
                    <>
                      {" "}
                      / ทั้งหมด{" "}
                      <span className="font-semibold tabular-nums">
                        {recipientsModalData.totalQty}
                      </span>{" "}
                      รางวัล
                    </>
                  ) : null}
                  {recipientsModalData.totalQty != null &&
                  recipientsModalData.givenCount < recipientsModalData.totalQty ? (
                    <span className="block pt-1 text-sm text-slate-500">
                      เหลืออีก{" "}
                      {recipientsModalData.totalQty - recipientsModalData.givenCount}{" "}
                      รางวัล
                    </span>
                  ) : null}
                </p>
                {Array.isArray(recipientsModalData.recipients) &&
                recipientsModalData.recipients.length > 0 ? (
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {recipientsModalData.recipients.map((row, idx) => (
                      <li
                        key={`${row.username}-${idx}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
                      >
                        <span className="font-medium text-rose-600">
                          @{row.username}
                        </span>
                        <span className="text-sm text-slate-500">
                          {row.wonAt
                            ? new Date(row.wonAt).toLocaleString("th-TH", {
                                dateStyle: "short",
                                timeStyle: "short"
                              })
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">ยังไม่มีผู้ได้รับรางวัลจากชุดนี้</p>
                )}
                <p className="text-sm text-slate-500">
                  สมาชิกที่ล็อกอินและชนะรางวัลจะถูกบันทึกในรายการนี้
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setRecipientsModalPrize(null)}
              className="mt-6 w-full rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      {resultOverlayVisible ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setResultModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-result-title"
            className={`w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-300 ease-out ${
              resultOverlayEnter
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-2 scale-[0.96] opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
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
                <button
                  type="button"
                  onClick={() => setResultModalOpen(false)}
                  className="mt-6 w-full rounded-2xl bg-rose-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2 active:scale-[0.99]"
                >
                  ปิด
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
                  <p className="mt-3 text-sm text-slate-800">{centralLoss.label}</p>
                ) : null}
                <p className="mt-2 text-sm text-slate-500">
                  หัวใจที่ใช้เริ่มรอบนี้ไม่คืน
                </p>
                <button
                  type="button"
                  onClick={() => setResultModalOpen(false)}
                  className="mt-6 w-full rounded-2xl bg-rose-600 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2 active:scale-[0.99]"
                >
                  ปิด
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {!showCentralPlayActions ? (
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="w-full rounded-xl border border-transparent py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
        >
          รีเซ็ตกระดาน
        </button>
      ) : null}
    </div>
  );
}
