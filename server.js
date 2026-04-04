require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const path = require("path");
const {
  PRIZES,
  CARD_COUNT,
  createSession,
  flip: flipGame,
  abandonSession
} = require("./gameSession");
const {
  router: authRouter,
  optionalAuthMiddleware,
  postLoginLine
} = require("./authRouter");
const userService = require("./services/userService");
const { router: ordersRouter } = require("./ordersRouter");
const { router: adminRouter } = require("./adminRouter");
const { router: ownerRouter } = require("./ownerRouter");
const { router: heartsRouter } = require("./heartsRouter");
const { router: marketplaceRouter } = require("./marketplaceRouter");
const { router: shopOwnerRouter } = require("./shopOwnerRouter");
const { initDb } = require("./db/init");
const { promoteAdminFromEnv } = require("./services/promoteAdminFromEnv");
const { bootstrapAdminFromEnv } = require("./services/bootstrapAdminFromEnv");
const centralGameService = require("./services/centralGameService");
const centralPrizeAwardService = require("./services/centralPrizeAwardService");
const centralGameSession = require("./centralGameSession");
const gameStartDeductionService = require("./services/gameStartDeductionService");
const heartLedgerService = require("./services/heartLedgerService");
const { validateUsername } = require("./authValidators");
const siteThemeService = require("./services/siteThemeService");

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-HUAJAIY-Line-Link-Secret"
    ]
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/api/auth", authRouter);
/** ระบบเก่า / แอปมือถือที่ยิง POST /api/v1/member/login-line — logic เดียวกับ /api/auth/login-line */
app.post("/api/v1/member/login-line", postLoginLine);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/hearts", heartsRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/shops", shopOwnerRouter);
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1h"
  })
);

const PORT = process.env.PORT || 3000;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

/** ข้อมูลกติกาเกมโดยไม่สร้าง session — ให้ฝั่งเว็บเช็กหัวใจก่อนเรียก start */
async function getActiveCentralSnapshot() {
  try {
    return await centralGameService.getActiveGameSnapshot();
  } catch (e) {
    if (e.code === "DB_REQUIRED") return null;
    throw e;
  }
}

function isUuidParam(id) {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim())
  );
}

async function getPublishedCentralSnapshot(gameId) {
  try {
    return await centralGameService.getPublishedGameSnapshotById(gameId);
  } catch (e) {
    if (e.code === "DB_REQUIRED") return null;
    throw e;
  }
}

/** ถ้าเกมไม่มี created_by แต่มี creatorUsername — หา UUID เจ้าของห้องให้หักแดงจากรหัสห้องตรงกัน */
async function resolveGameCreatedById(game) {
  if (!game) return null;
  const existing = game.createdBy;
  if (existing != null && String(existing).trim() !== "") {
    return String(existing).trim();
  }
  const un =
    game.creatorUsername != null
      ? String(game.creatorUsername).trim().toLowerCase()
      : "";
  if (!un) return null;
  try {
    const u = await userService.findByUsername(un);
    return u && u.id ? String(u.id) : null;
  } catch {
    return null;
  }
}

function centralMetaFromSnap(snap, givenByRuleId = null) {
  const pink = snap.game.pinkHeartCost ?? 0;
  const red = snap.game.redHeartCost ?? 0;
  const heartCurrencyMode = snap.game.heartCurrencyMode || "both";
  const acceptsPinkHearts = snap.game.acceptsPinkHearts !== false;
  return {
    gameMode: "central",
    gameId: snap.game.id,
    title: snap.game.title,
    description: snap.game.description || "",
    gameCoverUrl: snap.game.gameCoverUrl || null,
    tileBackCoverUrl: snap.game.tileBackCoverUrl || null,
    creatorUsername: snap.game.creatorUsername || null,
    gameCreatedBy: snap.game.createdBy || null,
    allowGiftRedPlay: Boolean(snap.game.allowGiftRedPlay),
    heartCurrencyMode,
    acceptsPinkHearts,
    pinkHeartCost: pink,
    redHeartCost: red,
    heartCost: pink + red,
    cardCount: snap.game.tileCount,
    setCount: snap.game.setCount,
    imagesPerSet: snap.game.imagesPerSet,
    setImageCounts: snap.game.setImageCounts,
    prizes: centralGameService.prizesForClient(
      snap.rules,
      snap.game.setImageCounts,
      givenByRuleId
    ),
    setPreviewUrls: centralGameService.setPreviewUrlsFromSnapshot(snap)
  };
}

async function centralMetaFromSnapWithCounts(snap) {
  try {
    const map = await centralPrizeAwardService.countAwardsByRuleForGame(snap.game.id);
    const base = centralMetaFromSnap(snap, map);
    const resolved = await resolveGameCreatedById(snap.game);
    if (resolved) {
      return { ...base, gameCreatedBy: resolved };
    }
    return base;
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      const base = centralMetaFromSnap(snap, null);
      const resolved = await resolveGameCreatedById(snap.game);
      return resolved ? { ...base, gameCreatedBy: resolved } : base;
    }
    throw e;
  }
}

/**
 * คำนวณยอดหักชมพู/แดงตามโหมดเกม (both | pink_only | red_only | either)
 */
function resolveCentralEntryHearts(snapGame, reqBody, forLoggedInUser) {
  const mode = snapGame.heartCurrencyMode || "both";
  let pink = Math.max(0, Math.floor(Number(snapGame.pinkHeartCost) || 0));
  let red = Math.max(0, Math.floor(Number(snapGame.redHeartCost) || 0));
  const acceptsPink = snapGame.acceptsPinkHearts !== false;
  const pw = reqBody?.payWith === "red" ? "red" : "pink";

  if (mode === "pink_only") {
    red = 0;
  } else if (mode === "red_only") {
    pink = 0;
  } else if (mode === "either") {
    const fee = Math.max(pink, red);
    if (fee <= 0) {
      return { pinkCost: 0, redCost: 0 };
    }
    if (!acceptsPink) {
      pink = 0;
      red = fee;
    } else if (forLoggedInUser && reqBody?.payWith !== "pink" && reqBody?.payWith !== "red") {
      const e = new Error(
        'เกมนี้เลือกจ่ายได้ทั้งชมพูหรือแดง — ส่ง payWith เป็น "pink" หรือ "red"'
      );
      e.code = "PAY_WITH_REQUIRED";
      throw e;
    } else if (!forLoggedInUser) {
      pink = fee;
      red = 0;
    } else if (pw === "red") {
      pink = 0;
      red = fee;
    } else {
      pink = fee;
      red = 0;
    }
  }

  if (!acceptsPink && pink > 0) {
    const e = new Error("เกมห้องนี้ไม่รับหัวใจชมพู");
    e.code = "PINK_NOT_ACCEPTED";
    throw e;
  }

  return { pinkCost: pink, redCost: red };
}

/** หักหัวใจตอนเริ่มรอบเมื่อมี Bearer (สมาชิก) — คืน user หลังหัก */
async function deductHeartsForGameStart(
  userId,
  { pinkCost = 0, redCost = 0, legacyTotalCost, ledgerContext } = {}
) {
  if (!userId) return null;
  const pink = Math.max(0, Math.floor(Number(pinkCost) || 0));
  const red = Math.max(0, Math.floor(Number(redCost) || 0));
  if (pink > 0 || red > 0) {
    const title = ledgerContext?.gameTitle ? String(ledgerContext.gameTitle).trim() : "";
    return gameStartDeductionService.deductCentralGameStart(userId, {
      pinkCost: pink,
      redCost: red,
      gameId: ledgerContext?.gameId || null,
      gameTitle: title,
      gameCreatedBy: ledgerContext?.gameCreatedBy ?? null,
      allowGiftRedPlay: Boolean(ledgerContext?.allowGiftRedPlay),
      playSessionId: ledgerContext?.playSessionId ?? null
    });
  }
  const u = await userService.findById(userId);
  if (!u) {
    const e = new Error("ไม่พบบัญชี");
    e.code = "AUTH";
    throw e;
  }
  if (legacyTotalCost != null) {
    const total = Math.max(0, Math.floor(Number(legacyTotalCost) || 0));
    if (total <= 0) return null;
    const pHave = u.pinkHeartsBalance;
    const rHave = u.redHeartsBalance;
    const useP = Math.min(pHave, total);
    const needR = total - useP;
    if (rHave < needR) {
      const e = new Error("หัวใจไม่พอเริ่มรอบ");
      e.code = "INSUFFICIENT_HEARTS";
      throw e;
    }
    return userService.adjustDualHearts(userId, -useP, -needR, {
      kind: "game_start",
      label: "เริ่มเล่นเกม (โหมดคลาสสิก)",
      meta: {
        gameMode: "legacy",
        totalCharged: total,
        pinkCharged: useP,
        redCharged: needR
      }
    });
  }
  return null;
}

function heartBalancesPayload(u) {
  if (!u) return null;
  return {
    pinkHeartsBalance: u.pinkHeartsBalance,
    redHeartsBalance: u.redHeartsBalance,
    redGiveawayBalance: u.redGiveawayBalance ?? 0,
    heartsBalance: u.heartsBalance
  };
}

/** โปรไฟล์สาธารณะตาม username — ไม่ส่งเบอร์/ที่อยู่/ยอดหัวใจ */
app.get("/api/public/members/:username", async (req, res) => {
  try {
    const v = validateUsername(req.params.username);
    if (!v.ok) {
      return res.status(400).json({ ok: false, error: v.error });
    }
    const u = await userService.findByUsername(v.value);
    if (!u) {
      return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
    }
    const fn = String(u.firstName || "").trim();
    const ln = String(u.lastName || "").trim();
    const displayName = [fn, ln].filter(Boolean).join(" ").trim() || u.username;
    return res.json({
      ok: true,
      username: u.username,
      displayName,
      firstName: fn,
      lastName: ln
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ธีมพื้นหลังเว็บ (สาธารณะ) — ใช้ใน layout ฝั่ง Next */
app.get("/api/public/site-theme", async (_req, res) => {
  try {
    const theme = await siteThemeService.getSiteTheme();
    return res.json({ ok: true, theme });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** รายชื่อผู้ได้รับรางวัลต่อกติกา (สาธารณะ) — ไม่มีข้อมูลบัญชี */
app.get(
  "/api/public/games/:gameId/rules/:ruleId/awards",
  async (req, res) => {
    try {
      const gameId = String(req.params.gameId || "").trim();
      const ruleId = String(req.params.ruleId || "").trim();
      if (!isUuidParam(gameId) || !isUuidParam(ruleId)) {
        return res.status(400).json({ ok: false, error: "รูปแบบรหัสไม่ถูกต้อง" });
      }
      const data = await centralPrizeAwardService.listPublicRecipientsForRule(
        gameId,
        ruleId
      );
      if (!data) {
        return res
          .status(404)
          .json({ ok: false, error: "ไม่พบเกมหรือกติกา" });
      }
      return res.json({
        ok: true,
        recipients: data.recipients,
        givenCount: data.givenCount,
        totalQty: data.totalQty
      });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.json({
          ok: true,
          recipients: [],
          givenCount: 0,
          totalQty: null
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

app.get("/api/game/list", async (_req, res) => {
  try {
    res.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    const games = await centralGameService.listPublishedGamesForPublic();
    return res.json({ ok: true, games });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, games: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/game/meta", async (req, res) => {
  try {
    res.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    const q = req.query?.gameId;
    if (q != null && String(q).trim()) {
      const gameId = String(q).trim();
      if (!isUuidParam(gameId)) {
        return res.status(400).json({ ok: false, error: "รูปแบบรหัสเกมไม่ถูกต้อง" });
      }
      const pub = await getPublishedCentralSnapshot(gameId);
      if (pub) {
        const meta = await centralMetaFromSnapWithCounts(pub);
        return res.json({ ok: true, ...meta });
      }
      return res.status(404).json({ ok: false, error: "ไม่พบเกมหรือยังไม่เปิดแสดงในรายการ" });
    }
    const snap = await getActiveCentralSnapshot();
    if (snap) {
      const meta = await centralMetaFromSnapWithCounts(snap);
      return res.json({ ok: true, ...meta });
    }
    const heartCost = Number(process.env.GAME_HEART_COST || 0);
    return res.json({
      ok: true,
      gameMode: "legacy",
      heartCost,
      cardCount: CARD_COUNT,
      prizes: PRIZES
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** เริ่มรอบเกม — ถ้ามี gameId ใช้เกมที่เผยแพร่นั้น · ไม่งั้นเกม active · ไม่งั้น legacy · Bearer หักหัวใจที่นี่ */
app.post("/api/game/start", optionalAuthMiddleware, async (req, res) => {
  try {
    const bodyGameId = req.body?.gameId;
    let snap = null;
    if (bodyGameId != null && String(bodyGameId).trim()) {
      const gid = String(bodyGameId).trim();
      if (!isUuidParam(gid)) {
        return res.status(400).json({ ok: false, error: "รูปแบบรหัสเกมไม่ถูกต้อง" });
      }
      snap = await getPublishedCentralSnapshot(gid);
      if (!snap) {
        return res.status(404).json({ ok: false, error: "ไม่พบเกมหรือยังไม่เปิดแสดงในรายการ" });
      }
    } else {
      snap = await getActiveCentralSnapshot();
    }
    if (snap) {
      const resolvedCreator = await resolveGameCreatedById(snap.game);
      if (resolvedCreator) {
        snap.game.createdBy = resolvedCreator;
      }
      let pink;
      let red;
      try {
        const resolved = resolveCentralEntryHearts(
          snap.game,
          req.body || {},
          Boolean(req.userId)
        );
        pink = resolved.pinkCost;
        red = resolved.redCost;
      } catch (err) {
        if (err.code === "PAY_WITH_REQUIRED" || err.code === "PINK_NOT_ACCEPTED") {
          return res.status(400).json({
            ok: false,
            error: err.message,
            code: err.code
          });
        }
        throw err;
      }
      const playSessionId = crypto.randomBytes(16).toString("hex");
      let afterUser = null;
      try {
        afterUser = await deductHeartsForGameStart(req.userId, {
          pinkCost: pink,
          redCost: red,
          ledgerContext: {
            gameMode: "central",
            gameId: snap.game.id,
            gameTitle: snap.game.title,
            gameCreatedBy: resolvedCreator || snap.game.createdBy || null,
            allowGiftRedPlay: Boolean(snap.game.allowGiftRedPlay),
            playSessionId
          }
        });
      } catch (err) {
        if (err.code === "INSUFFICIENT_HEARTS") {
          return res.status(400).json({
            ok: false,
            error: err.message,
            code: "INSUFFICIENT_HEARTS"
          });
        }
        if (err.code === "AUTH") {
          return res.status(401).json({ ok: false, error: err.message });
        }
        throw err;
      }
      const sessionId = centralGameSession.createSession(snap, playSessionId);
      const meta = await centralMetaFromSnapWithCounts(snap);
      const body = {
        ok: true,
        sessionId,
        ...meta
      };
      const hb = heartBalancesPayload(afterUser);
      if (hb) body.heartBalances = hb;
      return res.json(body);
    }
    const heartCost = Number(process.env.GAME_HEART_COST || 0);
    let afterUser = null;
    try {
      afterUser = await deductHeartsForGameStart(req.userId, {
        pinkCost: 0,
        redCost: 0,
        legacyTotalCost: heartCost,
        ledgerContext: { gameMode: "legacy" }
      });
    } catch (err) {
      if (err.code === "INSUFFICIENT_HEARTS") {
        return res.status(400).json({
          ok: false,
          error: err.message,
          code: "INSUFFICIENT_HEARTS"
        });
      }
      if (err.code === "AUTH") {
        return res.status(401).json({ ok: false, error: err.message });
      }
      throw err;
    }
    const sessionId = createSession();
    const body = {
      ok: true,
      gameMode: "legacy",
      sessionId,
      cardCount: CARD_COUNT,
      prizes: PRIZES,
      heartCost
    };
    const hb = heartBalancesPayload(afterUser);
    if (hb) body.heartBalances = hb;
    return res.json(body);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** คืนสถานะรอบเกมส่วนกลาง (รีเฟรชหน้า — ไม่หักหัวใจซ้ำ) */
app.post("/api/game/state", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี sessionId" });
    }
    let state = centralGameSession.getSessionStateForClient(sessionId);
    if (!state) {
      return res.status(404).json({ ok: false, error: "ไม่พบรอบเกม หรือหมดอายุ" });
    }
    if (state.gameMode === "central" && state.gameId) {
      try {
        const map = await centralPrizeAwardService.countAwardsByRuleForGame(state.gameId);
        state = {
          ...state,
          prizes: state.prizes.map((p) => ({
            ...p,
            prizesGivenSoFar: map[String(p.ruleId)] ?? 0
          }))
        };
      } catch (e) {
        if (e.code !== "DB_REQUIRED") throw e;
      }
    }
    return res.json(state);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** หลังจบรอบ — เฉลยภาพใต้ป้ายที่ยังไม่เปิด */
app.post("/api/game/reveal-remaining", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี sessionId" });
    }
    const r = centralGameSession.revealRemainingForClient(sessionId);
    if (!r.ok) {
      return res.status(400).json(r);
    }
    return res.json(r);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** เปิดป้าย — ลอง session เกมส่วนกลางก่อน (รองรับหลายเกมโดยไม่พึ่งเกม active) */
app.post("/api/game/flip", optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId, index } = req.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี sessionId" });
    }
    const idx = Number(index);
    const r = centralGameSession.flip(sessionId, idx);
    if (r.ok) {
      let prizeTallyUpdate = null;
      if (r.finished && r.gameMode === "central") {
        try {
          /** @type {Record<string, unknown>} */
          const patch = {};
          if (r.winner) {
            patch.roundOutcome = "won";
            const sum =
              r.winner.label != null && String(r.winner.label).trim()
                ? String(r.winner.label).trim()
                : [
                    r.winner.prizeTitle,
                    r.winner.prizeValueText,
                    r.winner.prizeUnit
                  ]
                    .filter((x) => x != null && String(x).trim())
                    .join(" ")
                    .trim() || "รางวัล";
            patch.roundPrizeSummary = sum;
          } else if (r.loss) {
            patch.roundOutcome = "lost";
            patch.roundPrizeSummary =
              r.loss.label != null && String(r.loss.label).trim()
                ? String(r.loss.label).trim()
                : "ไม่ได้รับรางวัล";
          }
          if (Object.keys(patch).length) {
            await heartLedgerService.mergeMetaJsonByPlaySession(sessionId, patch);
            if (req.userId) {
              try {
                await heartLedgerService.recordCentralRoundOutcome({
                  userId: req.userId,
                  playSessionId: sessionId,
                  outcome: String(patch.roundOutcome || ""),
                  summary:
                    patch.roundPrizeSummary != null
                      ? String(patch.roundPrizeSummary)
                      : null
                });
              } catch (e2) {
                console.error("[central_game_round_outcomes]", e2.message);
              }
            }
          }
        } catch (err) {
          console.error("[heart_ledger round meta]", err.message);
        }
      }
      if (
        r.gameMode === "central" &&
        r.winner &&
        r.gameId &&
        req.userId
      ) {
        try {
          const rec = await centralPrizeAwardService.tryRecordWin({
            userId: req.userId,
            gameId: r.gameId,
            ruleId: r.winner.ruleId,
            playSessionId: sessionId
          });
          if (rec.inserted) {
            const map = await centralPrizeAwardService.countAwardsByRuleForGame(
              r.gameId
            );
            prizeTallyUpdate = {
              ruleId: r.winner.ruleId,
              prizesGivenSoFar: map[String(r.winner.ruleId)] ?? 0
            };
          }
        } catch (err) {
          console.error("[central_prize_awards]", err.message);
        }
      }
      return res.json(
        prizeTallyUpdate ? { ...r, prizeTallyUpdate } : r
      );
    }
    if (r.error !== "ไม่พบรอบเกม หรือหมดอายุ") {
      return res.status(400).json(r);
    }
    const result = flipGame(sessionId, idx);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json({ ...result, gameMode: "legacy" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/game/abandon", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี sessionId" });
    }
    if (centralGameSession.abandonSession(sessionId)) {
      return res.json({ ok: true, removed: true });
    }
    const removed = abandonSession(sessionId);
    return res.json({ ok: true, removed });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing Cloudinary envs: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Please upload file field name: image"
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        ok: false,
        error: "Only image files are allowed"
      });
    }

    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "uploads",
          resource_type: "image"
        },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.json({
      ok: true,
      fileName: uploaded.public_id,
      publicUrl: uploaded.secure_url
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

async function start() {
  try {
    await initDb();
    try {
      await bootstrapAdminFromEnv();
      await promoteAdminFromEnv();
    } catch (e) {
      console.error("[admin] bootstrap/promote:", e.message);
    }
  } catch (e) {
    console.error("[db] init failed:", e.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

start();
