const crypto = require("crypto");
const centralGameService = require("./services/centralGameService");
const {
  formatWinnerDisplay,
  formatLossRuleDisplay
} = centralGameService;

const sessions = new Map();
const PRUNE_MS = 60 * 60 * 1000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(setImageCounts) {
  const cells = [];
  for (let s = 0; s < setImageCounts.length; s += 1) {
    const n = setImageCounts[s] || 0;
    for (let i = 0; i < n; i += 1) {
      cells.push({ setIndex: s, imageIndex: i });
    }
  }
  return shuffle(cells);
}

function getSetCounts(session) {
  const n = session.gameSnapshot.game.setCount;
  const counts = new Array(n).fill(0);
  session.deck.forEach((cell, idx) => {
    if (session.revealed[idx]) counts[cell.setIndex] += 1;
  });
  return counts;
}

/**
 * เรียงตามลำดับตรวจ — กติกาแรกที่ครบเงื่อนไขชนะ
 * - none = จบรอบแพ้ (ไม่มีรางวัล)
 * - อื่น = ชนะรางวัล
 */
function checkRuleOutcome(session) {
  const counts = getSetCounts(session);
  const { setImageCounts } = session.gameSnapshot.game;
  const rules = [...session.gameSnapshot.rules].sort(
    (a, b) => a.sortOrder - b.sortOrder || String(a.id).localeCompare(String(b.id))
  );
  for (const r of rules) {
    if (counts[r.setIndex] < r.needCount) continue;
    const cap = setImageCounts[r.setIndex] ?? setImageCounts[0] ?? 1;
    if (r.prizeCategory === "none") {
      return { kind: "loss", rule: r, imagesInSet: cap };
    }
    return { kind: "win", rule: r, imagesInSet: cap };
  }
  return null;
}

function imageUrlForCell(snapshot, setIndex, imageIndex) {
  const k = `${setIndex}-${imageIndex}`;
  const direct = snapshot.imageUrl.get(k);
  if (direct) return direct;
  return snapshot.imageUrl.get(`${setIndex}-0`) || "";
}

/**
 * @param {object} snapshot จาก getGameSnapshotById / getActiveGameSnapshot
 */
function createSession(snapshot, presetSessionId = null, opts = {}) {
  const { game, imageUrl, rules } = snapshot;
  const { setImageCounts, tileCount, id: gameId } = game;
  const deck = buildDeck(setImageCounts);
  if (deck.length !== tileCount) {
    throw new Error("deck length mismatch");
  }
  let id;
  if (presetSessionId != null && String(presetSessionId).trim()) {
    id = String(presetSessionId).trim();
    if (!/^[0-9a-f]{32}$/i.test(id)) {
      throw new Error("รูปแบบ sessionId ไม่ถูกต้อง");
    }
    if (sessions.has(id)) {
      throw new Error("sessionId ซ้ำ — เริ่มรอบใหม่");
    }
  } else {
    id = crypto.randomBytes(16).toString("hex");
  }
  const ownerUserId =
    opts && opts.ownerUserId != null && String(opts.ownerUserId).trim()
      ? String(opts.ownerUserId).trim()
      : null;
  const sessionProof = crypto.randomBytes(16).toString("hex");
  sessions.set(id, {
    gameId,
    deck,
    revealed: new Array(tileCount).fill(false),
    flips: 0,
    winnerRuleId: null,
    gameSnapshot: { game, imageUrl, rules },
    ownerUserId,
    sessionProof,
    createdAt: Date.now()
  });
  return { sessionId: id, sessionProof };
}

function authorizeSession(session, requesterUserId, sessionProof) {
  if (!session) return { ok: false, status: 404, error: "ไม่พบรอบเกม หรือหมดอายุ" };
  if (session.ownerUserId != null) {
    if (!requesterUserId || String(requesterUserId) !== String(session.ownerUserId)) {
      return { ok: false, status: 403, error: "ไม่มีสิทธิ์เข้าถึงรอบเกมนี้" };
    }
  } else if (!sessionProof || String(sessionProof) !== String(session.sessionProof)) {
    return { ok: false, status: 403, error: "สิทธิ์รอบเกมไม่ถูกต้อง" };
  }
  return { ok: true };
}

function flip(sessionId, index, opts = {}) {
  const session = sessions.get(sessionId);
  const auth = authorizeSession(session, opts.requesterUserId, opts.sessionProof);
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }
  const n = session.deck.length;
  if (index < 0 || index >= n || !Number.isInteger(index)) {
    return { ok: false, error: "ตำแหน่งป้ายไม่ถูกต้อง" };
  }
  if (session.winnerRuleId || session.lossRuleId) {
    const { winner, loss } = buildWinnerLossPayload(session);
    return {
      ok: true,
      gameMode: "central",
      gameId: session.gameId,
      finished: true,
      alreadyFinished: true,
      flips: session.flips,
      setCounts: getSetCounts(session),
      winner,
      loss
    };
  }
  if (session.revealed[index]) {
    const cell = session.deck[index];
    const { setIndex, imageIndex } = cell;
    const url = imageUrlForCell(session.gameSnapshot, setIndex, imageIndex);
    return {
      ok: true,
      gameMode: "central",
      gameId: session.gameId,
      setIndex,
      imageIndex,
      imageUrl: url,
      flips: session.flips,
      setCounts: getSetCounts(session),
      winner: null,
      loss: null,
      finished: false,
      alreadyRevealed: true
    };
  }

  session.revealed[index] = true;
  session.flips += 1;
  const cell = session.deck[index];
  const { setIndex, imageIndex } = cell;
  const url = imageUrlForCell(session.gameSnapshot, setIndex, imageIndex);
  const setCounts = getSetCounts(session);
  const outcome = checkRuleOutcome(session);
  if (outcome) {
    if (outcome.kind === "win") {
      session.winnerRuleId = outcome.rule.id;
    } else {
      session.lossRuleId = outcome.rule.id;
    }
  }

  const winRule = outcome?.kind === "win" ? outcome.rule : null;
  const lossRule = outcome?.kind === "loss" ? outcome.rule : null;

  return {
    ok: true,
    gameMode: "central",
    gameId: session.gameId,
    setIndex,
    imageIndex,
    imageUrl: url,
    flips: session.flips,
    setCounts,
    winner: winRule
      ? {
          ruleId: winRule.id,
          setIndex: Math.max(0, Math.floor(Number(winRule.setIndex)) || 0),
          label: formatWinnerDisplay(winRule),
          prizeCategory: winRule.prizeCategory,
          prizeTitle: winRule.prizeTitle,
          prizeValueText: winRule.prizeValueText,
          prizeUnit: winRule.prizeUnit
        }
      : null,
    loss: lossRule
      ? {
          ruleId: lossRule.id,
          setIndex: Math.max(0, Math.floor(Number(lossRule.setIndex)) || 0),
          label: formatLossRuleDisplay(lossRule, outcome.imagesInSet),
          prizeCategory: "none"
        }
      : null,
    finished: !!outcome
  };
}

function abandonSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return false;
  return sessions.delete(sessionId);
}

function pruneSessions(maxAgeMs = PRUNE_MS) {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > maxAgeMs) sessions.delete(id);
  }
}

setInterval(() => pruneSessions(), 10 * 60 * 1000).unref();

function buildWinnerLossPayload(session) {
  const { gameSnapshot, winnerRuleId, lossRuleId } = session;
  const { rules, game } = gameSnapshot;
  const { setImageCounts } = game;
  let winner = null;
  let loss = null;
  if (winnerRuleId) {
    const winRule = rules.find((r) => r.id === winnerRuleId);
    if (winRule) {
      winner = {
        ruleId: winRule.id,
        setIndex: Math.max(0, Math.floor(Number(winRule.setIndex)) || 0),
        label: formatWinnerDisplay(winRule),
        prizeCategory: winRule.prizeCategory,
        prizeTitle: winRule.prizeTitle,
        prizeValueText: winRule.prizeValueText,
        prizeUnit: winRule.prizeUnit
      };
    }
  }
  if (lossRuleId) {
    const lossRule = rules.find((r) => r.id === lossRuleId);
    if (lossRule) {
      const cap = setImageCounts[lossRule.setIndex] ?? setImageCounts[0] ?? 1;
      loss = {
        ruleId: lossRule.id,
        setIndex: Math.max(0, Math.floor(Number(lossRule.setIndex)) || 0),
        label: formatLossRuleDisplay(lossRule, cap),
        prizeCategory: "none"
      };
    }
  }
  return { winner, loss };
}

/**
 * คืนสถานะรอบเกมให้ฝั่งเว็บหลังรีเฟรช — ไม่หักหัวใจซ้ำ
 */
function getSessionStateForClient(sessionId, opts = {}) {
  const session = sessions.get(sessionId);
  const auth = authorizeSession(session, opts.requesterUserId, opts.sessionProof);
  if (!auth.ok) return null;
  const { deck, revealed, flips, gameSnapshot } = session;
  const { game, rules } = gameSnapshot;
  const cells = deck.map((cell, idx) => {
    if (!revealed[idx]) {
      return { index: idx, revealed: false };
    }
    const { setIndex, imageIndex } = cell;
    const imageUrl = imageUrlForCell(gameSnapshot, setIndex, imageIndex);
    return {
      index: idx,
      revealed: true,
      setIndex,
      imageIndex,
      imageUrl,
      key: `${setIndex}-${imageIndex}`
    };
  });
  const setCounts = getSetCounts(session);
  const finished = Boolean(session.winnerRuleId || session.lossRuleId);
  const { winner, loss } = buildWinnerLossPayload(session);
  const prizes = centralGameService.prizesForClient(rules, game.setImageCounts);
  const setPreviewUrls = centralGameService.setPreviewUrlsFromSnapshot(gameSnapshot);
  return {
    ok: true,
    gameMode: "central",
    sessionId,
    sessionProof: session.sessionProof,
    gameId: game.id,
    title: game.title,
    description: game.description || "",
    gameCoverUrl: game.gameCoverUrl || null,
    tileBackCoverUrl: game.tileBackCoverUrl || null,
    creatorUsername: game.creatorUsername || null,
    gameCreatedBy: game.createdBy || null,
    allowGiftRedPlay: Boolean(game.allowGiftRedPlay),
    pinkHeartCost: game.pinkHeartCost ?? 0,
    redHeartCost: game.redHeartCost ?? 0,
    heartCost: (game.pinkHeartCost ?? 0) + (game.redHeartCost ?? 0),
    cardCount: game.tileCount,
    setCount: game.setCount,
    imagesPerSet: game.imagesPerSet,
    setImageCounts: game.setImageCounts,
    prizes,
    setPreviewUrls,
    cells,
    flips,
    setCounts,
    finished,
    winner,
    loss
  };
}

/** หลังจบรอบแล้ว — ส่ง URL ภาพใต้ป้ายที่ยังไม่เปิด (ให้ปุ่มเฉลย) */
function revealRemainingForClient(sessionId, opts = {}) {
  const session = sessions.get(sessionId);
  const auth = authorizeSession(session, opts.requesterUserId, opts.sessionProof);
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }
  if (!session.winnerRuleId && !session.lossRuleId) {
    return { ok: false, error: "ยังไม่จบรอบ — ใช้ได้หลังจบรอบเท่านั้น" };
  }
  const { deck, revealed, gameSnapshot } = session;
  const cells = [];
  for (let idx = 0; idx < deck.length; idx += 1) {
    if (revealed[idx]) continue;
    const cell = deck[idx];
    const { setIndex, imageIndex } = cell;
    const imageUrl = imageUrlForCell(gameSnapshot, setIndex, imageIndex);
    cells.push({
      index: idx,
      imageUrl,
      setIndex,
      imageIndex,
      key: `${setIndex}-${imageIndex}`
    });
  }
  return { ok: true, gameMode: "central", cells };
}

function getAdminSnapshotCentral(tileCount, setCount, imagesPerSet, rulesCount) {
  let playing = 0;
  for (const s of sessions.values()) {
    if (!s.winnerRuleId && !s.lossRuleId) playing += 1;
  }
  return {
    activeSessions: sessions.size,
    sessionsPlaying: playing,
    sessionsFinished: sessions.size - playing,
    tileCount,
    setCount,
    imagesPerSet,
    rulesCount,
    pruneAfterMs: PRUNE_MS
  };
}

module.exports = {
  createSession,
  flip,
  abandonSession,
  getSessionStateForClient,
  revealRemainingForClient,
  getAdminSnapshotCentral
};
