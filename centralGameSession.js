const crypto = require("crypto");
const {
  formatWinnerDisplay
} = require("./services/centralGameService");

const sessions = new Map();
const PRUNE_MS = 60 * 60 * 1000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
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

function checkWin(session) {
  const counts = getSetCounts(session);
  const rules = [...session.gameSnapshot.rules].sort(
    (a, b) => a.sortOrder - b.sortOrder || String(a.id).localeCompare(String(b.id))
  );
  for (const r of rules) {
    if (r.prizeCategory === "none") continue;
    if (counts[r.setIndex] >= r.needCount) return r;
  }
  return null;
}

function imageUrlForCell(snapshot, setIndex, imageIndex) {
  return snapshot.imageUrl.get(`${setIndex}-${imageIndex}`) || "";
}

/**
 * @param {object} snapshot จาก getGameSnapshotById / getActiveGameSnapshot
 */
function createSession(snapshot) {
  const { game, imageUrl, rules } = snapshot;
  const { setImageCounts, tileCount, id: gameId } = game;
  const deck = buildDeck(setImageCounts);
  if (deck.length !== tileCount) {
    throw new Error("deck length mismatch");
  }
  const id = crypto.randomBytes(16).toString("hex");
  sessions.set(id, {
    gameId,
    deck,
    revealed: new Array(tileCount).fill(false),
    flips: 0,
    winnerRuleId: null,
    gameSnapshot: { game, imageUrl, rules },
    createdAt: Date.now()
  });
  return id;
}

function flip(sessionId, index) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { ok: false, error: "ไม่พบรอบเกม หรือหมดอายุ" };
  }
  if (session.winnerRuleId) {
    return { ok: false, error: "จบรอบแล้ว กรุณาเริ่มรอบใหม่" };
  }
  const n = session.deck.length;
  if (index < 0 || index >= n || !Number.isInteger(index)) {
    return { ok: false, error: "ตำแหน่งป้ายไม่ถูกต้อง" };
  }
  if (session.revealed[index]) {
    return { ok: false, error: "เปิดป้ายนี้แล้ว" };
  }

  session.revealed[index] = true;
  session.flips += 1;
  const cell = session.deck[index];
  const { setIndex, imageIndex } = cell;
  const url = imageUrlForCell(session.gameSnapshot, setIndex, imageIndex);
  const setCounts = getSetCounts(session);
  const win = checkWin(session);
  if (win) {
    session.winnerRuleId = win.id;
  }

  return {
    ok: true,
    gameMode: "central",
    setIndex,
    imageIndex,
    imageUrl: url,
    flips: session.flips,
    setCounts,
    winner: win
      ? {
          ruleId: win.id,
          label: formatWinnerDisplay(win),
          prizeCategory: win.prizeCategory,
          prizeTitle: win.prizeTitle,
          prizeValueText: win.prizeValueText,
          prizeUnit: win.prizeUnit
        }
      : null,
    finished: !!win
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

function getAdminSnapshotCentral(tileCount, setCount, imagesPerSet, rulesCount) {
  let playing = 0;
  for (const s of sessions.values()) {
    if (!s.winnerRuleId) playing += 1;
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
  getAdminSnapshotCentral
};
