const crypto = require("crypto");

const PRIZES = [
  { key: "cash", label: "เงินสด 1,000 บาท", emoji: "💵", need: 5 },
  { key: "coffee", label: "กาแฟ 1 กล่อง", emoji: "☕", need: 4 },
  { key: "discount", label: "ส่วนลด 20%", emoji: "🎫", need: 3 }
];

const CARD_COUNT = PRIZES.reduce((s, p) => s + p.need, 0);

const sessions = new Map();

function shuffleDeck() {
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
  return list;
}

function getCounts(session) {
  const c = { cash: 0, coffee: 0, discount: 0 };
  session.deck.forEach((key, i) => {
    if (session.revealed[i]) c[key] += 1;
  });
  return c;
}

function checkWin(counts) {
  for (const p of PRIZES) {
    if (counts[p.key] >= p.need) return p;
  }
  return null;
}

function createSession() {
  const id = crypto.randomBytes(16).toString("hex");
  sessions.set(id, {
    deck: shuffleDeck(),
    revealed: new Array(CARD_COUNT).fill(false),
    flips: 0,
    winner: null,
    createdAt: Date.now()
  });
  return id;
}

function flip(sessionId, index) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { ok: false, error: "ไม่พบรอบเกม หรือหมดอายุ" };
  }
  if (session.winner) {
    const win = PRIZES.find((p) => p.key === session.winner) || null;
    return {
      ok: true,
      counts: getCounts(session),
      flips: session.flips,
      winner: win ? { key: win.key, label: win.label, emoji: win.emoji } : null,
      finished: true,
      alreadyFinished: true
    };
  }
  if (index < 0 || index >= CARD_COUNT || !Number.isInteger(index)) {
    return { ok: false, error: "ตำแหน่งป้ายไม่ถูกต้อง" };
  }
  if (session.revealed[index]) {
    const symbol = session.deck[index];
    return {
      ok: true,
      symbol,
      counts: getCounts(session),
      flips: session.flips,
      winner: null,
      finished: false,
      alreadyRevealed: true
    };
  }

  session.revealed[index] = true;
  session.flips += 1;
  const symbol = session.deck[index];
  const counts = getCounts(session);
  const win = checkWin(counts);
  if (win) {
    session.winner = win.key;
  }

  return {
    ok: true,
    symbol,
    counts,
    flips: session.flips,
    winner: win
      ? { key: win.key, label: win.label, emoji: win.emoji }
      : null,
    finished: !!win
  };
}

/** ลบรอบเมื่อไม่ใช้ต่อ (เช่น หักหัวใจไม่สำเร็จหลัง start) */
function abandonSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return false;
  return sessions.delete(sessionId);
}

function pruneSessions(maxAgeMs = 60 * 60 * 1000) {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > maxAgeMs) sessions.delete(id);
  }
}

setInterval(() => pruneSessions(), 10 * 60 * 1000).unref();

/** สรุปให้แอดมิน — ไม่เปิดเผยค่าใต้การ์ด */
function getAdminSnapshot() {
  let playing = 0;
  for (const s of sessions.values()) {
    if (!s.winner) playing += 1;
  }
  return {
    activeSessions: sessions.size,
    sessionsPlaying: playing,
    sessionsFinished: sessions.size - playing,
    prizes: PRIZES,
    cardCount: CARD_COUNT,
    pruneAfterMs: 60 * 60 * 1000
  };
}

module.exports = {
  PRIZES,
  CARD_COUNT,
  createSession,
  flip,
  abandonSession,
  getAdminSnapshot
};
