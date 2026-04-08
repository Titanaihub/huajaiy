"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CENTRAL_GAME_COVER_PATH,
  DEFAULT_TILE_BACK_COVER_PATH
} from "../lib/centralGameDefaults";
import { uploadUrl } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCentralGameActivate,
  apiAdminCentralGameCreate,
  apiAdminCentralGameDeactivate,
  apiAdminCentralGameDelete,
  apiAdminCentralGameDetail,
  apiAdminCentralGamePatch,
  apiAdminCentralGamePutImages,
  apiAdminCentralGamePutRules,
  apiAdminCentralGamesList
} from "../lib/rolesApi";
import {
  CENTRAL_GAME_ADMIN_LINE_URL,
  CENTRAL_GAME_MAX_PER_MEMBER,
  CENTRAL_GAME_MAX_TILES
} from "../lib/centralGameLimits";

const UNITS = ["บาท", "ชิ้น", "อัน", "คัน", "ใบ", "หลัง"];

const PUBLISH_CONFIRM_MESSAGE =
  "โปรดตรวจสอบรูปแบบเกมและรางวัลให้ถูกต้องตรงตามความต้องการ\n\nหากกดเผยแพร่แล้วจะไม่สามารถแก้ไขได้\n\nยืนยันเผยแพร่หรือไม่?";

const DELETE_BLOCKED_HINT =
  "เกมนี้มีประวัติการเล่นหรือรับรางวัลแล้ว — ไม่สามารถลบจากที่นี่ได้ กรุณาติดต่อผู้ดูแลระบบให้ลบแทน";

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("อ่านรูปไม่ได้"));
    img.src = objectUrl;
  });
}

/** พื้นหลังก่อนวาด — ลดปัญหา PNG โปร่ง → JPEG กลายเป็นพื้นดำ */
const JPEG_FLAT_BG = "#f8fafc";

async function compressToJpeg(file, maxSide = 1200) {
  const img = await loadImage(file);
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = JPEG_FLAT_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("บีบอัดไม่สำเร็จ"))),
      "image/jpeg",
      0.85
    );
  });
}

function isProbablyPng(file) {
  return (
    (file.type && String(file.type).toLowerCase() === "image/png") ||
    /\.png$/i.test(file.name || "")
  );
}

async function uploadImageFile(file, { maxCompressSide } = {}) {
  const side = maxCompressSide ?? 1200;
  const body = new FormData();
  if (isProbablyPng(file)) {
    body.append(
      "image",
      file,
      file.name && /\.png$/i.test(file.name) ? file.name : `upload-${Date.now()}.png`
    );
  } else {
    const blob = await compressToJpeg(file, side);
    body.append("image", new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" }));
  }
  const res = await fetch(uploadUrl(), { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
  return data.publicUrl;
}

const emptyRule = () => ({
  setIndex: 0,
  needCount: 1,
  prizeCategory: "cash",
  prizeFulfillmentMode: "transfer",
  prizeTitle: "",
  prizeValueText: "",
  prizeUnit: "บาท",
  sortOrder: 1,
  description: "",
  prizeTotalQty: 1
});

/** ชุด s (0-based) → ลำดับตรวจเริ่มต้น = s+1 ให้ผู้สร้างสลับทีหลังได้ */
function emptyRuleForSet(setIdx) {
  const s = Math.max(0, Math.floor(Number(setIdx)) || 0);
  return { ...emptyRule(), setIndex: s, sortOrder: s + 1 };
}

function resizeSetSizes(prev, n, fill) {
  const out = prev.slice(0, n).map((x) => Math.max(1, parseInt(String(x), 10) || 1));
  const f = Math.max(1, parseInt(String(fill), 10) || 1);
  while (out.length < n) out.push(out[out.length - 1] ?? f);
  return out;
}

/** ข้อห้าม + กฎผู้สร้าง — แสดงเฉพาะขั้นตอนกรอกข้อมูลเบื้องต้น (สมาชิก) */
function MemberStudioIntroPolicyStack() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border-2 border-rose-200 bg-rose-50/95 p-5 shadow-sm dark:border-rose-800/55 dark:bg-rose-950/35"
        role="note"
      >
        <p className="text-lg font-bold text-rose-950 dark:text-rose-50">ข้อห้ามใช้งาน</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-rose-950 dark:text-rose-100/95">
          <li>
            <strong>ห้าม</strong>ใช้เกมหรือห้องเกมเพื่อธุรกิจหรือกิจกรรมที่เป็น<strong>การพนัน</strong>{" "}
            หรือชักจูงให้เล่นพนัน
          </li>
          <li>
            <strong>ห้าม</strong>ใช้เนื้อหา<strong>สื่อลามก</strong> หรือเนื้อหาที่ผิดกฎหมายและศีลธรรมอันดี
          </li>
        </ul>
      </div>
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/95 p-5 shadow-sm dark:border-amber-800/45 dark:bg-amber-950/30">
        <p className="text-lg font-bold text-amber-950 dark:text-amber-50">กฎระเบียบสำหรับผู้สร้างเกม</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
          <li>
            ผู้สร้างเกมมีหน้าที่<strong>จ่ายรางวัล</strong>ตามที่กำหนดและประกาศไว้ต่อผู้เล่น
          </li>
          <li>
            ต้อง<strong>แจ้งเงื่อนไข</strong>การได้รับรางวัล วิธีรับ และระยะเวลาให้<strong>ชัดเจน</strong>{" "}
            เพื่อลดความขัดแย้ง
          </li>
        </ul>
      </div>
    </div>
  );
}

function CentralGamePolicyCallout() {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950">
      <p className="font-semibold text-sky-900">ข้อกำหนดการสร้างเกม</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        <li>
          1 เกมมีได้ไม่เกิน <strong>{CENTRAL_GAME_MAX_TILES}</strong> ป้าย (นับรวมทุกชุด)
        </li>
        <li>
          บัญชีสมาชิกสร้างได้ไม่เกิน <strong>{CENTRAL_GAME_MAX_PER_MEMBER}</strong> เกม
        </li>
      </ul>
      <p className="mt-2">
        หากมีปัญหาหรือต้องการปรับเพิ่ม กรุณาติดต่อแอดมิน{" "}
        <a
          href={CENTRAL_GAME_ADMIN_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-800"
        >
          LINE Official
        </a>
      </p>
    </div>
  );
}

/** แถวกติกา — ใช้ทั้งแบบผูกชุด (ไม่โชว์เลขชุด) และแบมแก้ชุดเอง */
function RuleEditorRow({
  r,
  idx,
  needCap,
  showSetPicker,
  setCount,
  setSizes,
  updateRule,
  setRules,
  gamePrizeQtyLocked,
  structureLocked
}) {
  const si = Math.min(
    setCount - 1,
    Math.max(0, Math.floor(Number(r.setIndex)) || 0)
  );
  const cap = needCap ?? Math.max(1, parseInt(String(setSizes[si] ?? setSizes[0]), 10) || 1);
  const isNone = r.prizeCategory === "none";
  const awardedCount = Math.max(0, Math.floor(Number(r.prizeAwardedCount) || 0));
  const totalQty = isNone ? null : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1));
  const remainingQty = totalQty == null ? null : Math.max(0, totalQty - awardedCount);
  const prizeQtyMin =
    gamePrizeQtyLocked && !isNone
      ? Math.max(
          1,
          Math.floor(Number(r.minPrizeTotalQty) || 1),
          Math.floor(Number(awardedCount) || 0)
        )
      : 1;
  const fulfillGrid =
    r.prizeCategory === "cash"
      ? r.prizeFulfillmentMode === "pickup"
        ? "pickup"
        : "transfer"
      : r.prizeCategory === "item"
        ? r.prizeFulfillmentMode === "pickup"
          ? "pickup"
          : "ship"
        : "";

  return (
    <div
      className={`grid w-full grid-cols-1 gap-2 rounded-lg border border-hui-border bg-white p-3 ${
        showSetPicker
          ? "sm:grid-cols-[repeat(13,minmax(0,1fr))]"
          : "sm:grid-cols-12"
      }`}
    >
      {showSetPicker ? (
        <div className="sm:col-span-1">
          <label className="text-sm text-hui-muted">ชุด (0=ชุด1)</label>
          <input
            type="number"
            min={0}
            max={Math.max(0, setCount - 1)}
            value={r.setIndex}
            onChange={(e) => updateRule(idx, "setIndex", e.target.value)}
            disabled={structureLocked}
            className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
          />
        </div>
      ) : null}
      <div className="sm:col-span-1">
        <label className="text-sm text-hui-muted">ลำดับตรวจ</label>
        <input
          type="number"
          min={0}
          value={r.sortOrder}
          onChange={(e) => updateRule(idx, "sortOrder", e.target.value)}
          disabled={structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
          title="เลขน้อยตรวจก่อน — ค่าเริ่มต้นตามเลขชุด ปรับได้เมื่อต้องการสลับลำดับระหว่างชุด"
        />
      </div>
      <div className="sm:col-span-1">
        <label className="text-sm text-hui-muted">เปิดครบ (สูงสุด {cap})</label>
        <input
          type="number"
          min={1}
          max={cap}
          value={r.needCount}
          onChange={(e) => updateRule(idx, "needCount", e.target.value)}
          disabled={structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
        />
      </div>
      <div className="sm:col-span-1">
        <label className="text-sm text-hui-muted">จำนวนรางวัล</label>
        {r.prizeCategory === "none" ? (
          <div
            className="mt-1 rounded border border-dashed border-hui-border bg-hui-pageTop px-1 py-1.5 text-center text-sm leading-tight text-hui-muted"
            title="หมวดไม่มีรางวัล"
          >
            ไม่จำกัด
          </div>
        ) : (
          <>
            <input
              type="number"
              min={prizeQtyMin}
              max={999999}
              value={r.prizeTotalQty ?? 1}
              onChange={(e) =>
                updateRule(
                  idx,
                  "prizeTotalQty",
                  Math.max(prizeQtyMin, parseInt(e.target.value, 10) || prizeQtyMin)
                )
              }
              className="mt-1 w-full rounded border px-1 py-1 text-sm"
              title={
                gamePrizeQtyLocked && prizeQtyMin > 1
                  ? `หลังเผยแพร่แล้วตั้งขั้นต่ำ ${prizeQtyMin} — เพิ่มได้อย่างเดียว`
                  : gamePrizeQtyLocked
                    ? "หลังเผยแพร่แล้วเพิ่มจำนวนได้อย่างเดียว ลดไม่ได้"
                    : undefined
              }
            />
            {gamePrizeQtyLocked ? (
              <p className="mt-0.5 text-sm leading-tight text-hui-muted">
                หลังเผยแพร่: เพิ่มได้เท่านั้น (ขั้นต่ำ {prizeQtyMin})
              </p>
            ) : null}
            <p className="mt-0.5 text-sm leading-tight text-hui-muted">
              รับรางวัลแล้ว {awardedCount} · เหลือ {remainingQty} จากทั้งหมด {totalQty}
            </p>
          </>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm text-hui-muted">หมวดรางวัล</label>
        <select
          value={r.prizeCategory}
          onChange={(e) => {
            const v = e.target.value;
            setRules((prev) =>
              prev.map((row, j) =>
                j === idx
                  ? {
                      ...row,
                      prizeCategory: v,
                      prizeFulfillmentMode:
                        v === "none"
                          ? ""
                          : v === "cash"
                            ? "transfer"
                            : "ship",
                      prizeTotalQty: v === "none" ? null : (row.prizeTotalQty ?? 1),
                      minPrizeTotalQty:
                        v === "none"
                          ? null
                          : (row.minPrizeTotalQty ?? row.prizeTotalQty ?? 1)
                    }
                  : row
              )
            );
          }}
          disabled={structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
        >
          <option value="cash">เงินสด</option>
          <option value="item">สิ่งของ</option>
          <option value="none">ไม่มีรางวัล</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm text-hui-muted">หัวข้อรางวัล</label>
        <input
          value={r.prizeTitle}
          onChange={(e) => updateRule(idx, "prizeTitle", e.target.value)}
          disabled={isNone || structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop disabled:text-hui-muted"
          placeholder="เช่น รางวัลที่ 1"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm text-hui-muted">รายละเอียด</label>
        <input
          value={r.prizeValueText}
          onChange={(e) => updateRule(idx, "prizeValueText", e.target.value)}
          disabled={isNone || structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop disabled:text-hui-muted"
          placeholder="เช่น 1000"
        />
      </div>
      <div className="sm:col-span-1">
        <label className="text-sm text-hui-muted">หน่วย</label>
        <select
          value={UNITS.includes(r.prizeUnit) ? r.prizeUnit : UNITS[0]}
          onChange={(e) => updateRule(idx, "prizeUnit", e.target.value)}
          disabled={isNone || structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop disabled:text-hui-muted"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm text-hui-muted">การจ่ายรางวัล</label>
        <select
          value={fulfillGrid}
          onChange={(e) => updateRule(idx, "prizeFulfillmentMode", e.target.value)}
          disabled={isNone || structureLocked}
          className="mt-1 w-full rounded border px-1 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop disabled:text-hui-muted"
        >
          {r.prizeCategory === "cash" ? (
            <>
              <option value="pickup">มารับเอง</option>
              <option value="transfer">โอนรางวัลให้</option>
            </>
          ) : r.prizeCategory === "item" ? (
            <>
              <option value="pickup">มารับเอง</option>
              <option value="ship">จัดส่งตามที่อยู่</option>
            </>
          ) : (
            <option value="">—</option>
          )}
        </select>
      </div>
      <div className={showSetPicker ? "sm:col-span-full" : "sm:col-span-12"}>
        <label className="text-sm text-hui-muted">หมายเหตุ</label>
        <input
          value={r.description}
          onChange={(e) => updateRule(idx, "description", e.target.value)}
          disabled={structureLocked}
          className="mt-1 w-full rounded border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
        />
      </div>
    </div>
  );
}

export default function AdminCentralGamePanel({
  embedded = false,
  /** ฝังใน /member + TailAdmin — หลังเผยแพร่ไปหน้าเกมของฉันในเชลล์สมาชิก */
  memberShellEmbed = false,
  /** สมาชิก: แสดงเฉพาะชื่อเกม + คำอธิบาย — ตั้งค่าป้าย/รูป/รางวัลไปที่ ?edit=full */
  memberBasicInfoOnly = false,
  focusGameId = null,
  /** หน้า /member/create-game โชว์กล่องนโยบายด้านบนแล้ว — ไม่ซ้ำที่นี่ */
  suppressTopPolicyCallouts = false,
  /** หน้าสร้างเกม: ไม่เลือกเกมแรกในรายการอัตโนมัติเมื่อยังไม่มี focus */
  disableEmbeddedAutoSelect = false,
  /** หน้าเดียว: ไม่โชว์ตารางรายการเกม — แก้เฉพาะเกมที่ focus */
  hideEmbeddedGamesTable = false,
  /** เพิ่มค่าเมื่อ parent PATCH meta แล้ว — โหลดรายละเอียดเกมใหม่โดยไม่รีเมาต์ทั้งแผง */
  externalReloadToken = 0,
  /** หน้าสร้างเกมสมาชิก: คืน { title, description } จากฟอร์มบน — รวมบันทึกกับปุ่มล่าง */
  beforePersistMeta = null,
  /** เมื่อ beforePersistMeta throw — แจ้ง parent (เช่น setErr ใต้ฟอร์มบน) */
  onBeforePersistMetaError = null,
  /** หลังบันทึกสำเร็จ (เช่น เคลียร์ err ใต้ฟอร์มบน) */
  onAfterSuccessfulSave = null
}) {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [title, setTitle] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [setCount, setSetCount] = useState(5);
  const [setSizes, setSetSizes] = useState([4, 4, 4, 4, 4]);
  const [pinkHeartCost, setPinkHeartCost] = useState(0);
  const [redHeartCost, setRedHeartCost] = useState(0);
  /** @type {['both'|'pink_only'|'red_only'|'either', function]} */
  const [heartCurrencyMode, setHeartCurrencyMode] = useState("both");
  const [acceptsPinkHearts, setAcceptsPinkHearts] = useState(true);

  const [imageMap, setImageMap] = useState({});
  /** URL รูปหน้าปก — ว่าง = ใช้รูปหัวใจชมพูเริ่มต้นบนเว็บ */
  const [gameCoverUrl, setGameCoverUrl] = useState("");
  /** รูปหน้าปิดป้าย (ก่อนเปิด) — ว่าง = ใช้ค่าเริ่มต้นบนเว็บ */
  const [tileBackCoverUrl, setTileBackCoverUrl] = useState("");
  /** แสดงในรายการหน้า /game (ล็อบบี้) */
  const [lobbyVisible, setLobbyVisible] = useState(false);
  const creatorLimitedMode = embedded && lobbyVisible;
  /** อนุญาตให้ใช้หัวใจแดงจากรหัสห้อง (ทุกเจ้าของห้อง) หักเล่นในเกมนี้ — มักใช้กับเกมส่วนกลางที่แอดมินตั้ง */
  const [allowGiftRedPlay, setAllowGiftRedPlay] = useState(false);
  const [rules, setRules] = useState([]);

  const [newTitle, setNewTitle] = useState("เกมส่วนกลาง");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [newSets, setNewSets] = useState(5);
  const [newSetSizes, setNewSetSizes] = useState([4, 4, 4, 4, 4]);
  const [newPinkHeart, setNewPinkHeart] = useState(0);
  const [newRedHeart, setNewRedHeart] = useState(0);
  const [newHeartCurrencyMode, setNewHeartCurrencyMode] = useState("both");
  const [newAcceptsPink, setNewAcceptsPink] = useState(true);
  /** หลังสร้างเกมใหม่ — ชวนเผยแพร่ */
  const [publishPrompt, setPublishPrompt] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [savingBasicIntro, setSavingBasicIntro] = useState(false);
  /** เผยแพร่ / ปิดใช้ / ลบ — กันซ้ำและให้เห็นสถานะ */
  const [gameActionBusy, setGameActionBusy] = useState(false);
  /** ซ่อนฟอร์มสร้างเกม — ลดความซ้ำกับโหมดแก้ไข */
  const [createExpanded, setCreateExpanded] = useState(false);
  /** จำนวนรางวัลที่บันทึกในระบบสำหรับเกมที่เลือก — ใช้บล็อกปุ่มลบ */
  const [prizeAwardCount, setPrizeAwardCount] = useState(0);
  /** จำนวนครั้งที่มีการเริ่มเล่นเกมนี้แล้ว — ใช้บล็อกปุ่มลบ */
  const [playCount, setPlayCount] = useState(0);
  /** หลังเผยแพร่/เปิดใช้ — จำนวนรางวัลต่อกติกาเพิ่มได้อย่างเดียว */
  const [gamePrizeQtyLocked, setGamePrizeQtyLocked] = useState(false);
  /** รหัสเกม (ออกเมื่อเผยแพร่แล้ว — อ่านอย่างเดียว) */
  const [gameCode, setGameCode] = useState("");
  const awardEditLocked = creatorLimitedMode && prizeAwardCount > 0;

  const tileCount = useMemo(
    () => setSizes.reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0),
    [setSizes]
  );
  const newTileCount = useMemo(
    () => newSetSizes.reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0),
    [newSetSizes]
  );

  /** กันคำขอ list ซ้ำซ้อน (mount + focusGameId) หรือรีเฟรชติดๆ — คำขอเก่าที่ล้มหรือช้ากว่าไม่ทับ state */
  const gamesListRequestIdRef = useRef(0);

  const loadList = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    const reqId = ++gamesListRequestIdRef.current;
    setErr("");
    try {
      const data = await apiAdminCentralGamesList(token);
      if (reqId !== gamesListRequestIdRef.current) return;
      setGames(data.games || []);
    } catch (e) {
      if (reqId !== gamesListRequestIdRef.current) return;
      setErr(e.message || String(e));
      setGames([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadList();
      if (cancelled) return;
      if (focusGameId) setSelectedId(focusGameId);
    })();
    return () => {
      cancelled = true;
    };
  }, [focusGameId, loadList]);

  // โหมด embedded: ถ้าไม่ได้ส่ง focusGameId และยังไม่เลือกเกม ให้เลือกเกมล่าสุดอัตโนมัติ
  useEffect(() => {
    if (!embedded) return;
    if (disableEmbeddedAutoSelect) return;
    if (focusGameId) return;
    if (selectedId) return;
    if (!Array.isArray(games) || games.length === 0) return;
    const firstId = String(games[0]?.id || "").trim();
    if (firstId) setSelectedId(firstId);
  }, [embedded, disableEmbeddedAutoSelect, focusGameId, selectedId, games]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    const token = getMemberToken();
    if (!token) return;
    setLoading(true);
    setErr("");
    setMsg("");
    setPrizeAwardCount(0);
    setPlayCount(0);
    try {
      const data = await apiAdminCentralGameDetail(token, id);
      setPrizeAwardCount(Math.max(0, Math.floor(Number(data.prizeAwardCount)) || 0));
      setPlayCount(Math.max(0, Math.floor(Number(data.playCount)) || 0));
      const g = data.game;
      if (!g) {
        setErr("ไม่ได้รับข้อมูลเกมจากเซิร์ฟเวอร์");
        return;
      }
      const rawTitle = String(g.title ?? "").trim();
      const rawDesc = typeof g.description === "string" ? g.description : "";
      const descTrimmed = String(rawDesc).trim();
      const unpublishedDraft = !g.isPublished && !g.isActive;
      /** ร่างที่สร้างจากหน้า /member/create-game — โชว์ช่องว่างให้ผู้ใช้กรอกเอง */
      const looksLikeAutoMemberDraft =
        hideEmbeddedGamesTable &&
        unpublishedDraft &&
        !descTrimmed &&
        /^เกมใหม่\s*[—\-–]/u.test(rawTitle);
      if (looksLikeAutoMemberDraft) {
        setTitle("");
        setGameDescription("");
      } else {
        setTitle(g.title ?? "");
        setGameDescription(rawDesc);
      }
      setGameCoverUrl(g.gameCoverUrl && String(g.gameCoverUrl).trim() ? String(g.gameCoverUrl).trim() : "");
      setTileBackCoverUrl(
        g.tileBackCoverUrl && String(g.tileBackCoverUrl).trim()
          ? String(g.tileBackCoverUrl).trim()
          : ""
      );
      setSetCount(g.setCount);
      const sc = Math.max(1, g.setCount || 1);
      const fromApi = Array.isArray(g.setImageCounts) ? g.setImageCounts : null;
      if (fromApi && fromApi.length) {
        setSetSizes(
          resizeSetSizes(
            fromApi.map((x) => Math.max(1, parseInt(String(x), 10) || 1)),
            sc,
            g.imagesPerSet || 4
          )
        );
      } else {
        setSetSizes(Array(sc).fill(Math.max(1, g.imagesPerSet || 4)));
      }
      setPinkHeartCost(
        typeof g.pinkHeartCost === "number" ? g.pinkHeartCost : g.heartCost ?? 0
      );
      setRedHeartCost(typeof g.redHeartCost === "number" ? g.redHeartCost : 0);
      setLobbyVisible(Boolean(g.isPublished || g.isActive));
      setAllowGiftRedPlay(Boolean(g.allowGiftRedPlay));
      const hcm = g.heartCurrencyMode;
      setHeartCurrencyMode(
        ["both", "pink_only", "red_only", "either"].includes(hcm) ? hcm : "both"
      );
      setAcceptsPinkHearts(g.acceptsPinkHearts !== false);
      const map = {};
      for (const im of data.images || []) {
        const k0 = `${im.setIndex}-0`;
        if (map[k0] === undefined) map[k0] = im.imageUrl;
      }
      setImageMap((prev) => {
        for (const v of Object.values(prev)) {
          if (v && String(v).startsWith("blob:")) URL.revokeObjectURL(v);
        }
        return map;
      });
      setRules(
        (data.rules || []).length
          ? data.rules.map((r) => {
              const si = Math.max(0, Math.floor(Number(r.setIndex)) || 0);
              const so = Math.floor(Number(r.sortOrder));
              const sortOrder = Number.isFinite(so) && so > 0 ? so : si + 1;
              const q =
                r.prizeCategory === "none"
                  ? null
                  : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1));
              const pfm = String(r.prizeFulfillmentMode || "").toLowerCase();
              const normalizedFulfill =
                r.prizeCategory === "cash"
                  ? pfm === "pickup"
                    ? "pickup"
                    : "transfer"
                  : r.prizeCategory === "item"
                    ? pfm === "pickup"
                      ? "pickup"
                      : "ship"
                    : "";
              return {
                id: r.id,
                setIndex: r.setIndex,
                needCount: r.needCount,
                prizeCategory: r.prizeCategory,
                prizeFulfillmentMode: normalizedFulfill,
                prizeTitle: r.prizeTitle || "",
                prizeValueText: r.prizeValueText || "",
                prizeUnit: UNITS.includes(r.prizeUnit) ? r.prizeUnit : UNITS[0],
                sortOrder,
                description: r.description || "",
                prizeTotalQty: q,
                minPrizeTotalQty: r.prizeCategory === "none" ? null : q,
                prizeAwardedCount:
                  r.prizeCategory === "none"
                    ? 0
                    : Math.max(0, Math.floor(Number(r.prizeAwardedCount) || 0)),
                prizeRemainingQty:
                  r.prizeCategory === "none"
                    ? null
                    : Math.max(
                        0,
                        q - Math.max(0, Math.floor(Number(r.prizeAwardedCount) || 0))
                      )
              };
            })
          : Array.from({ length: sc }, (_, s) => emptyRuleForSet(s))
      );
    } catch (e) {
      setPrizeAwardCount(0);
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [hideEmbeddedGamesTable]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId) return;
    if (externalReloadToken <= 0) return;
    void loadDetail(selectedId);
  }, [externalReloadToken, selectedId, loadDetail]);

  /** ให้ทุกชุดมีอย่างน้อยหนึ่งแถวกติกา (ไม่ใช้ปุ่มเพิ่มแถว) */
  useEffect(() => {
    if (!selectedId || loading) return;
    setRules((prev) => {
      const covered = new Set();
      for (const row of prev) {
        const si = Math.max(0, Math.floor(Number(row.setIndex)) || 0);
        if (si >= 0 && si < setCount) covered.add(si);
      }
      const toAdd = [];
      for (let s = 0; s < setCount; s += 1) {
        if (!covered.has(s)) toAdd.push(emptyRuleForSet(s));
      }
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
  }, [selectedId, loading, setCount]);

  async function createGame(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setMsg("");
    try {
      const counts = newSetSizes
        .slice(0, newSets)
        .map((x) => Math.max(1, parseInt(String(x), 10) || 1));
      const newTotal = counts.reduce((a, b) => a + b, 0);
      if (newTotal > CENTRAL_GAME_MAX_TILES) {
        setMsg(
          `ป้ายรวมต้องไม่เกิน ${CENTRAL_GAME_MAX_TILES} ป้าย — หากต้องการยกเว้น ติดต่อแอดมิน ${CENTRAL_GAME_ADMIN_LINE_URL}`
        );
        return;
      }
      const data = await apiAdminCentralGameCreate(token, {
        title: newTitle,
        description: newGameDescription,
        setCount: newSets,
        setImageCounts: counts,
        tileCount: counts.reduce((a, b) => a + b, 0),
        pinkHeartCost: newPinkHeart,
        redHeartCost: newRedHeart,
        heartCurrencyMode: newHeartCurrencyMode,
        acceptsPinkHearts: newAcceptsPink
      });
      const gid = data.snapshot?.game?.id;
      const gtitle = data.snapshot?.game?.title || newTitle;
      setMsg("สร้างเกมแล้ว — กดเผยแพร่ด้านล่างเมื่อพร้อม หรือตั้งรูปและกติกาก่อน");
      await loadList();
      if (gid) {
        setSelectedId(gid);
        setPublishPrompt({ id: gid, title: gtitle });
        setCreateExpanded(false);
      }
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  function rulesPayload() {
    return rules.map((r, idx) => {
      const rawQty =
        r.prizeCategory === "none"
          ? null
          : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1));
      const prizeTotalQty =
        r.prizeCategory === "none"
          ? null
          : gamePrizeQtyLocked && r.minPrizeTotalQty != null
            ? Math.max(r.minPrizeTotalQty, rawQty)
            : rawQty;
      const pfmRaw = String(r.prizeFulfillmentMode || "").toLowerCase();
      const prizeFulfillmentMode =
        r.prizeCategory === "none"
          ? null
          : r.prizeCategory === "cash"
            ? pfmRaw === "pickup"
              ? "pickup"
              : "transfer"
            : pfmRaw === "pickup"
              ? "pickup"
              : "ship";
      const row = {
        setIndex: Math.floor(Number(r.setIndex)),
        needCount: Math.floor(Number(r.needCount)),
        prizeCategory: r.prizeCategory,
        prizeFulfillmentMode,
        prizeTitle: r.prizeTitle,
        prizeValueText: r.prizeValueText,
        prizeUnit: r.prizeUnit,
        sortOrder: r.sortOrder != null ? Number(r.sortOrder) : idx,
        description: r.description,
        prizeTotalQty
      };
      if (r.id) row.id = r.id;
      return row;
    });
  }

  /** ไม่ส่ง isPublished ผ่าน PATCH — การเผยแพร่ใช้ POST activate/deactivate เท่านั้น (กันช่องล็อบบี้ทำให้ PATCH ล้มเมื่อรูปยังไม่ครบ) */
  async function persistMeta(gameIdOverride, introMerge) {
    const gid = gameIdOverride ?? selectedId;
    if (!gid) throw new Error("ยังไม่ได้เลือกเกม");
    const token = getMemberToken();
    if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
    const t =
      introMerge && typeof introMerge.title === "string"
        ? String(introMerge.title).trim()
        : String(title || "").trim();
    if (!t) throw new Error("กรุณากรอกชื่อเกม");
    const desc =
      introMerge && typeof introMerge.description === "string"
        ? introMerge.description
        : gameDescription;
    const counts = setSizes
      .slice(0, setCount)
      .map((x) => Math.max(1, parseInt(String(x), 10) || 1));
    const tileTotal = counts.reduce((a, b) => a + b, 0);
    if (tileTotal > CENTRAL_GAME_MAX_TILES) {
      throw new Error(
        `ป้ายรวมต้องไม่เกิน ${CENTRAL_GAME_MAX_TILES} ป้าย — หากต้องการยกเว้น ติดต่อแอดมิน ${CENTRAL_GAME_ADMIN_LINE_URL}`
      );
    }
    await apiAdminCentralGamePatch(token, gid, {
      title: t,
      description: desc,
      gameCoverUrl: gameCoverUrl.trim() ? gameCoverUrl.trim() : null,
      tileBackCoverUrl: tileBackCoverUrl.trim() ? tileBackCoverUrl.trim() : null,
      setCount,
      setImageCounts: counts,
      tileCount: counts.reduce((a, b) => a + b, 0),
      pinkHeartCost,
      redHeartCost,
      heartCurrencyMode,
      acceptsPinkHearts,
      allowGiftRedPlay
    });
  }

  function imagesReadyForSave() {
    for (let s = 0; s < setCount; s += 1) {
      const url = imageMap[`${s}-0`];
      if (!url || String(url).startsWith("blob:")) return false;
    }
    return true;
  }

  async function persistImages(gameIdOverride) {
    const gid = gameIdOverride ?? selectedId;
    if (!gid) throw new Error("ยังไม่ได้เลือกเกม");
    const token = getMemberToken();
    if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
    const images = [];
    for (let s = 0; s < setCount; s += 1) {
      const url = imageMap[`${s}-0`];
      if (!url || String(url).startsWith("blob:")) {
        throw new Error(
          `ชุด ${s + 1}: ยังไม่มีรูปหรือกำลังอัปโหลด — รอจนเห็นรูปจากระบบแล้วค่อยบันทึกรูป`
        );
      }
      images.push({ setIndex: s, imageUrl: url });
    }
    await apiAdminCentralGamePutImages(token, gid, images, { oneImagePerSet: true });
  }

  async function persistRules(gameIdOverride) {
    const gid = gameIdOverride ?? selectedId;
    if (!gid) throw new Error("ยังไม่ได้เลือกเกม");
    const token = getMemberToken();
    if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
    await apiAdminCentralGamePutRules(token, gid, rulesPayload());
  }

  /** บันทึกโครง+รูป+กติกาแบบครบก่อนเผยแพร่ — ใช้ gameId ชัดเจน (ไม่พึ่ง state หลัง setState) */
  async function persistAllForPublish(gameId) {
    if (!gameId) throw new Error("ไม่พบรหัสเกม");
    await persistMeta(gameId);
    if (!imagesReadyForSave()) {
      throw new Error(
        "เผยแพร่ไม่ได้: อัปโหลดรูปให้ครบทุกชุดก่อน (รอ URL จริงของระบบ ไม่ใช่ blob:)"
      );
    }
    await persistImages(gameId);
    await persistRules(gameId);
  }

  /** บันทึกโครง + รูป (ถ้าครบ) + กติกา ในครั้งเดียว — ลดปัญหากดบันทึกไม่ครบขั้น */
  async function saveAllGameData() {
    if (!selectedId || savingAll) return;
    setSavingAll(true);
    setErr("");
    setMsg("");
    const parts = [];
    try {
      let introMerge = null;
      if (typeof beforePersistMeta === "function") {
        try {
          introMerge = await beforePersistMeta();
        } catch (e) {
          const m = e?.message || String(e);
          setErr(m);
          onBeforePersistMetaError?.(m);
          setSavingAll(false);
          return;
        }
      }
      await persistMeta(undefined, introMerge);
      parts.push("โครง");
      if (imagesReadyForSave()) {
        await persistImages();
        parts.push("รูป");
      } else {
        parts.push("รูปยังไม่ครบ (ข้าม)");
      }
      await persistRules();
      parts.push("กติกา");
      await loadList();
      await loadDetail(selectedId);
      setMsg(
        `บันทึกข้อมูลแล้ว — ${parts.join(" · ")} · กรุณาตรวจสอบเกมให้ถูกต้อง ก่อนเผยแพร่`
      );
      onAfterSuccessfulSave?.();
    } catch (e) {
      setErr(e.message || String(e));
      setMsg("");
    } finally {
      setSavingAll(false);
    }
  }

  /** สมาชิกขั้นตอนแรก — บันทึกเฉพาะชื่อและคำอธิบาย */
  async function saveBasicIntro() {
    if (!selectedId || savingBasicIntro) return;
    setSavingBasicIntro(true);
    setErr("");
    setMsg("");
    try {
      const token = getMemberToken();
      if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
      const t = String(title || "").trim();
      if (!t) throw new Error("กรุณากรอกชื่อเกม");
      const coverTrim = String(gameCoverUrl || "").trim();
      await apiAdminCentralGamePatch(token, selectedId, {
        title: t,
        description: gameDescription,
        gameCoverUrl: coverTrim ? coverTrim : ""
      });
      await loadList();
      await loadDetail(selectedId);
      const studioFull = memberShellEmbed
        ? `/member/game-studio?game=${encodeURIComponent(selectedId)}&edit=full`
        : `/account/game-studio?game=${encodeURIComponent(selectedId)}&edit=full`;
      router.push(studioFull);
    } catch (e) {
      setErr(e.message || String(e));
      setMsg("");
    } finally {
      setSavingBasicIntro(false);
    }
  }

  async function publishGameById(id) {
    if (!id) {
      setErr("ไม่พบรหัสเกม — รีเฟรชรายการแล้วลองใหม่");
      setMsg("");
      return;
    }
    if (!window.confirm(PUBLISH_CONFIRM_MESSAGE)) return;
    const token = getMemberToken();
    if (!token) {
      setErr("หมดเซสชัน — ล็อกอินใหม่แล้วลองกดเผยแพร่อีกครั้ง");
      setMsg("");
      return;
    }
    setGameActionBusy(true);
    setErr("");
    setMsg("");
    try {
      await persistAllForPublish(id);
      await apiAdminCentralGameActivate(token, id);
      setSelectedId(id);
      setLobbyVisible(true);
      setPublishPrompt((p) => (p?.id === id ? null : p));
      if (embedded) {
        if (memberShellEmbed) {
          window.top.location.assign("/member/game?published=1");
        } else {
          window.location.assign("/account/my-games?published=1");
        }
        return;
      }
      setMsg("เผยแพร่แล้ว — เกมนี้เป็นเกมหลักบนเว็บ และแสดงในรายการหน้า /game");
      await loadList();
      await loadDetail(id);
    } catch (e) {
      setErr(e.message || String(e));
      setMsg("");
    } finally {
      setGameActionBusy(false);
    }
  }

  async function activate() {
    if (!selectedId) {
      setErr("ยังไม่ได้เลือกเกม — คลิกแถวในตาราง「รายการเกม」ก่อน แล้วค่อยกดเผยแพร่");
      setMsg("");
      return;
    }
    if (!window.confirm(PUBLISH_CONFIRM_MESSAGE)) return;
    const token = getMemberToken();
    if (!token) {
      setErr("หมดเซสชัน — ล็อกอินใหม่แล้วลองอีกครั้ง");
      setMsg("");
      return;
    }
    setGameActionBusy(true);
    setErr("");
    setMsg("");
    try {
      await persistAllForPublish(selectedId);
      await apiAdminCentralGameActivate(token, selectedId);
      setLobbyVisible(true);
      setPublishPrompt((p) => (p?.id === selectedId ? null : p));
      if (embedded) {
        if (memberShellEmbed) {
          window.top.location.assign("/member/game?published=1");
        } else {
          window.location.assign("/account/my-games?published=1");
        }
        return;
      }
      setMsg("เผยแพร่แล้ว — เกมหลักบนเว็บ และแสดงในรายการหน้า /game");
      await loadList();
      await loadDetail(selectedId);
    } catch (e) {
      setErr(e.message || String(e));
      setMsg("");
    } finally {
      setGameActionBusy(false);
    }
  }

  async function deactivate() {
    if (!selectedId) {
      setErr("ยังไม่ได้เลือกเกม — คลิกแถวในตารางก่อน");
      setMsg("");
      return;
    }
    const token = getMemberToken();
    if (!token) {
      setErr("หมดเซสชัน — ล็อกอินใหม่");
      setMsg("");
      return;
    }
    setGameActionBusy(true);
    setErr("");
    setMsg("");
    try {
      await apiAdminCentralGameDeactivate(token, selectedId);
      setLobbyVisible(false);
      if (embedded) {
        if (memberShellEmbed) {
          window.top.location.assign("/member/game?published=0");
        } else {
          window.location.assign("/account/my-games?published=0");
        }
        return;
      }
      setMsg("หยุดการเผยแพร่แล้ว — ซ่อนจากรายการหน้า /game ด้วย");
      await loadList();
    } catch (e) {
      setErr(e.message || String(e));
      setMsg("");
    } finally {
      setGameActionBusy(false);
    }
  }

  async function removeGame() {
    if (!selectedId) return;
    if (prizeAwardCount > 0 || playCount > 0) {
      setMsg(DELETE_BLOCKED_HINT);
      return;
    }
    if (!window.confirm("ลบเกมนี้ถาวร?")) return;
    const token = getMemberToken();
    if (!token) {
      setMsg("หมดเซสชัน — ล็อกอินใหม่");
      return;
    }
    setGameActionBusy(true);
    setMsg("");
    try {
      await apiAdminCentralGameDelete(token, selectedId);
      setSelectedId("");
      setMsg("ลบแล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setGameActionBusy(false);
    }
  }

  function scrollToEditor() {
    window.setTimeout(() => {
      document.getElementById("central-game-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 150);
  }

  function openEditGame(id) {
    if (!id) return;
    setErr("");
    setMsg("");
    setSelectedId(id);
    scrollToEditor();
  }

  async function deleteGameById(id, title, awardCount = 0, playCountInList = 0) {
    if (!id) return;
    if (awardCount > 0 || playCountInList > 0) {
      setMsg(DELETE_BLOCKED_HINT);
      return;
    }
    if (!window.confirm(`ลบเกม「${title}」ถาวร?`)) return;
    const token = getMemberToken();
    if (!token) return;
    setMsg("");
    setErr("");
    try {
      await apiAdminCentralGameDelete(token, id);
      if (selectedId === id) setSelectedId("");
      setMsg("ลบแล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function onPickCoverFile(file) {
    if (!file) return;
    setMsg("กำลังอัปโหลดรูปหน้าปก…");
    try {
      const url = await uploadImageFile(file, { maxCompressSide: 800 });
      setGameCoverUrl(url);
      setMsg("อัปโหลดรูปหน้าปกแล้ว — กดบันทึกข้อมูลเพื่อบันทึกลงเซิร์ฟเวอร์");
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function onPickTileBackFile(file) {
    if (!file) return;
    setMsg("กำลังอัปโหลดรูปหน้าปิดป้าย…");
    try {
      const url = await uploadImageFile(file);
      setTileBackCoverUrl(url);
      setMsg("อัปโหลดรูปหน้าปิดป้ายแล้ว — กดบันทึกข้อมูลเพื่อบันทึกลงเซิร์ฟเวอร์");
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function onPickImage(setIndex, imageIndex, file) {
    if (!file) return;
    const slot = `${setIndex}-${imageIndex}`;
    setImageMap((m) => {
      const prev = m[slot];
      if (prev && String(prev).startsWith("blob:")) URL.revokeObjectURL(prev);
      return { ...m, [slot]: URL.createObjectURL(file) };
    });
    setMsg("กำลังอัปโหลด…");
    try {
      const url = await uploadImageFile(file);
      setImageMap((m) => {
        const cur = m[slot];
        if (cur && String(cur).startsWith("blob:")) URL.revokeObjectURL(cur);
        return { ...m, [slot]: url };
      });
      setMsg("อัปโหลดรูปแล้ว — กดบันทึกรูปเมื่อครบทุกชุด");
    } catch (e) {
      setImageMap((m) => {
        const cur = m[slot];
        if (cur && String(cur).startsWith("blob:")) URL.revokeObjectURL(cur);
        const next = { ...m };
        delete next[slot];
        return next;
      });
      setMsg(e.message || String(e));
    }
  }

  function updateRule(i, field, value) {
    setRules((prev) =>
      prev.map((r, j) => (j === i ? { ...r, [field]: value } : r))
    );
  }

  const showMemberBasicIntro = Boolean(
    memberShellEmbed && memberBasicInfoOnly && selectedId
  );
  const memberCancelHref = memberShellEmbed ? "/member/game" : "/account/my-games";
  const memberSinglePageGuide = Boolean(memberShellEmbed && hideEmbeddedGamesTable);
  const memberPublishCta = memberSinglePageGuide ? "เผยแพร่เกม" : "เผยแพร่บนเว็บ";
  const gameCoverBlockTitle = memberSinglePageGuide ? "รูปหน้าห้องเกม" : "รูปหน้าปกเกม";
  const tileBackBlockTitle = memberSinglePageGuide ? "รูปหน้าป้าย" : "รูปหน้าปิดป้าย";

  return (
    <section className="space-y-8 text-sm">
      {err ? <p className="text-red-600">{err}</p> : null}
      {msg ? (
        <p
          className={
            msg.includes("แล้ว") ? "text-green-700" : "text-amber-800"
          }
        >
          {msg}
        </p>
      ) : null}

      {suppressTopPolicyCallouts ? null : (
        <div className={showMemberBasicIntro ? "space-y-6" : undefined}>
          <CentralGamePolicyCallout />
          {showMemberBasicIntro ? <MemberStudioIntroPolicyStack /> : null}
        </div>
      )}

      {!embedded ? (
      <div className="rounded-xl border border-hui-border bg-hui-pageTop/90 p-3">
        <button
          type="button"
          onClick={() => setCreateExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-hui-section"
          aria-expanded={createExpanded}
        >
          <span>สร้างเกมใหม่ {createExpanded ? "▼" : "▶"}</span>
          <span className="text-sm font-normal text-hui-muted">แสดงเฉพาะเมื่อต้องการสร้าง — ไม่ซ้ำกับฟอร์มแก้ไขด้านล่าง</span>
        </button>
        {createExpanded ? (
          <form onSubmit={createGame} className="mt-4 grid gap-3 border-t border-hui-border pt-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-hui-body">ชื่อเกม</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm text-hui-body">รหัสเกม</label>
              <input
                readOnly
                value=""
                placeholder="หลังเผยแพร่"
                className="mt-1 w-full rounded-lg border border-dashed border-hui-border bg-hui-pageTop px-3 py-2 text-sm text-hui-muted"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-hui-body">รายละเอียด</label>
              <textarea
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-hui-border px-3 py-2"
                placeholder="อธิบายเกมให้ผู้เล่นเห็น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-hui-body">จำนวนชุดภาพ</label>
              <input
                type="number"
                min={1}
                value={newSets}
                onChange={(e) => {
                  const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                  setNewSets(n);
                  setNewSetSizes((prev) => resizeSetSizes(prev, n, prev[prev.length - 1] || 4));
                }}
                className="mt-1 w-full max-w-xs rounded-lg border border-hui-border px-3 py-2"
              />
            </div>
            <p className="sm:col-span-2 text-sm text-hui-muted">
              เริ่มต้นชุดละ 4 ป้าย — หลังสร้างแล้วเลือกเกมในตารางเพื่อแก้โครงและรูป
            </p>
            <div>
              <label className="text-sm text-hui-body">ป้ายรวม</label>
              <p
                className={`mt-2 font-mono ${
                  newTileCount > CENTRAL_GAME_MAX_TILES ? "font-semibold text-red-700" : "text-hui-body"
                }`}
              >
                {newTileCount}
                {newTileCount > CENTRAL_GAME_MAX_TILES
                  ? ` — เกินกำหนดสูงสุด ${CENTRAL_GAME_MAX_TILES} ป้าย`
                  : null}
              </p>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
              <p className="text-sm font-semibold text-hui-body">การหักหัวใจต่อรอบ</p>
              <p className="mt-1 text-sm leading-relaxed text-hui-body">
                เลือกโหมดชำระและจำนวนต่อรอบ — โหมดจ่ายอย่างใดอย่างหนึ่งให้ใส่ชมพูและแดงให้เท่ากัน
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm text-hui-body">โหมดชำระหัวใจ</label>
                  <select
                    value={newHeartCurrencyMode}
                    onChange={(e) => setNewHeartCurrencyMode(e.target.value)}
                    className="mt-1 w-full max-w-md rounded-lg border border-hui-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="both">หักทั้งชมพูและแดง</option>
                    <option value="pink_only">รับเฉพาะหัวใจชมพู</option>
                    <option value="red_only">รับเฉพาะหัวใจแดง</option>
                    <option value="either">รับชมพูหรือแดงอย่างใดอย่างหนึ่ง</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex gap-2 rounded-lg border border-hui-border bg-white/80 px-3 py-2">
                  <input
                    id="new-central-accepts-pink"
                    type="checkbox"
                    checked={newAcceptsPink}
                    onChange={(e) => setNewAcceptsPink(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-hui-border"
                  />
                  <label htmlFor="new-central-accepts-pink" className="text-sm leading-relaxed text-hui-body">
                    ห้องนี้รับหัวใจชมพู
                  </label>
                </div>
                <div>
                  <label className="text-sm text-hui-body">หักหัวใจชมพูต่อรอบ</label>
                  <input
                    type="number"
                    min={0}
                    value={newPinkHeart}
                    onChange={(e) => setNewPinkHeart(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-lg border border-hui-border bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-hui-body">หักหัวใจแดงต่อรอบ</label>
                  <input
                    type="number"
                    min={0}
                    value={newRedHeart}
                    onChange={(e) => setNewRedHeart(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-lg border border-hui-border bg-white px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                className="hui-btn-primary text-sm py-2 px-4"
              >
                สร้างเกม
              </button>
              <button
                type="button"
                onClick={() => setCreateExpanded(false)}
                className="rounded-lg border border-hui-border px-4 py-2 text-sm text-hui-body hover:bg-hui-pageTop"
              >
                ปิด
              </button>
            </div>
          </form>
        ) : null}
      </div>
      ) : null}

      {publishPrompt ? (
        <div
          className="rounded-2xl border-2 border-hui-cta bg-gradient-to-br from-hui-pageTop to-white p-5 shadow-md"
          role="status"
        >
          <p className="font-semibold text-hui-section">สร้างเกม「{publishPrompt.title}」แล้ว</p>
          <p className="mt-2 text-sm text-hui-body">
            กด <strong>{memberPublishCta}</strong> เพื่อให้โผล่ในเมนูหลักและการ์ด「เกม」ที่หน้าแรก — แนะนำให้บันทึกรูปและกติกาก่อนถ้ายังไม่ครบ
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={gameActionBusy}
              aria-busy={gameActionBusy}
              onClick={() => publishGameById(publishPrompt.id)}
              className="hui-btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {memberPublishCta}
            </button>
            <button
              type="button"
              onClick={() => setPublishPrompt(null)}
              className="rounded-xl border border-hui-border bg-white px-4 py-2.5 text-sm font-semibold text-hui-body hover:bg-hui-pageTop"
            >
              ภายหลัง
            </button>
          </div>
        </div>
      ) : null}

      {games.length > 0 &&
      !showMemberBasicIntro &&
      !(embedded && hideEmbeddedGamesTable) ? (
        <div className="overflow-x-auto rounded-xl border border-hui-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hui-border bg-hui-pageTop px-3 py-2">
            <h3 className="text-sm font-semibold text-hui-body">รายการเกม — คลิกแถวเพื่อเลือกแก้ไข</h3>
            <button
              type="button"
              onClick={() => loadList()}
              className="rounded border border-hui-border bg-white px-2 py-1 text-sm font-medium text-hui-body hover:bg-hui-pageTop"
            >
              รีเฟรชรายการ
            </button>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hui-border bg-hui-pageTop text-sm font-semibold text-hui-body">
              <tr>
                <th className="px-3 py-2">เกม</th>
                <th className="px-3 py-2">รหัส</th>
                <th className="px-3 py-2">ป้าย</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2 text-right">การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr
                  key={g.id}
                  className={`cursor-pointer border-b border-hui-border/70 transition hover:bg-hui-pageTop ${
                    g.id === selectedId ? "bg-hui-pageTop/80" : ""
                  }`}
                  onClick={() => {
                    setErr("");
                    setMsg("");
                    setSelectedId(g.id);
                    scrollToEditor();
                  }}
                >
                  <td className="px-3 py-2 font-medium text-hui-section">{g.title}</td>
                  <td className="px-3 py-2 font-mono text-sm text-hui-body">
                    {g.gameCode && String(g.gameCode).trim() ? String(g.gameCode).trim() : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-hui-body">{g.tileCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {g.isPublished ? (
                        <span className="w-fit rounded-full bg-hui-pageTop px-2 py-0.5 text-sm font-semibold text-hui-section ring-1 ring-hui-border">
                          แสดงใน /game
                        </span>
                      ) : (
                        <span className="text-sm text-hui-muted">ซ่อน</span>
                      )}
                      {g.isActive ? (
                        <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-800">
                          กำลังใช้
                        </span>
                      ) : (
                        <span className="text-sm text-hui-muted">ไม่ได้ใช้</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEditGame(g.id)}
                      className="mr-2 rounded-lg border border-hui-border bg-white px-2 py-1 text-sm font-semibold text-hui-body hover:bg-hui-pageTop"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      disabled={Number(g.prizeAwardCount) > 0 || Number(g.playCount) > 0}
                      title={
                        Number(g.prizeAwardCount) > 0 || Number(g.playCount) > 0
                          ? "มีประวัติการเล่นหรือรับรางวัลแล้ว — ติดต่อผู้ดูแลระบบเพื่อลบ"
                          : undefined
                      }
                      onClick={() =>
                        deleteGameById(
                          g.id,
                          g.title,
                          Number(g.prizeAwardCount) || 0,
                          Number(g.playCount) || 0
                        )
                      }
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {embedded && games.length === 0 && !hideEmbeddedGamesTable ? (
        <div className="rounded-xl border border-hui-border bg-white/90 px-4 py-5 text-sm text-hui-body shadow-sm">
          ยังไม่มีห้องเกมในบัญชีนี้ — กดปุ่ม "เปิดสร้างห้องเกม" ด้านบนก่อน แล้วระบบจะเปิดแผงตั้งค่าให้อัตโนมัติ
        </div>
      ) : null}

      {selectedId && showMemberBasicIntro ? (
        <div id="central-game-editor" className="relative space-y-4 scroll-mt-24 pb-6">
          {loading ? <p className="text-hui-muted">กำลังโหลด…</p> : null}
          {awardEditLocked ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
              <strong>มีผู้ได้รับรางวัลจากเกมนี้แล้ว ({prizeAwardCount} รายการ)</strong> — แก้ได้เฉพาะเพิ่มจำนวนรางวัลเท่านั้น
            </div>
          ) : null}
          <form
            onSubmit={(e) => e.preventDefault()}
            noValidate
            className="space-y-4 rounded-xl border border-hui-border bg-hui-surface/90 p-4 shadow-soft"
          >
            <h3 className="text-lg font-semibold text-hui-section">
              ข้อมูลรายละเอียดเบื้องต้นของเกม
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-hui-section">หัวข้อเกม / ชื่อเกม</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  readOnly={creatorLimitedMode}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-hui-body ${creatorLimitedMode ? "border-hui-border bg-hui-pageTop" : "border-hui-border"}`}
                  placeholder={creatorLimitedMode ? "ชื่อเกม (ล็อก)" : "ชื่อเกมที่แสดงให้ผู้เล่น"}
                  title={creatorLimitedMode ? "ชื่อเกมถูกล็อก แก้ไขไม่ได้" : undefined}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-hui-section">คำอธิบายรายละเอียดเบื้องต้น</label>
                <textarea
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  rows={6}
                  className="mt-1 w-full resize-y rounded-lg border border-hui-border px-3 py-2 text-hui-body"
                  placeholder="อธิบายเกมหรือเงื่อนไขให้ผู้เล่น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
                />
              </div>
              <div className="sm:col-span-2">
                <h4 className="text-sm font-semibold text-hui-section">หมวดหมู่เกม</h4>
                <p className="mt-1 text-sm leading-relaxed text-hui-muted">
                  ระบุประเภทหรือวัตถุประสงค์ในช่องคำอธิบายด้านบน (เช่น ร้านค้า / แจกรางวัล / โปรโมทสินค้า) เพื่อให้ผู้เล่นเข้าใจบริบทเกม
                </p>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-hui-border bg-white p-4">
                <h4 className="text-sm font-semibold text-hui-section">รูปภาพหน้าปกเกม</h4>
                <p className="mt-1 text-sm leading-relaxed text-hui-body">
                  แสดงบนหน้าแรกและหน้าเล่น — ถ้าไม่อัปโหลด จะใช้รูปหัวใจชมพูเริ่มต้น
                </p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="w-28 shrink-0 sm:w-32">
                    <p className="mb-1 text-sm text-hui-muted">ตัวอย่าง</p>
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-hui-border bg-hui-pageTop">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={gameCoverUrl.trim() || "default-cover-intro"}
                        src={gameCoverUrl.trim() || DEFAULT_CENTRAL_GAME_COVER_PATH}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="text-sm font-medium text-hui-body">
                      อัปโหลดรูปหน้าปก (1 ไฟล์)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={creatorLimitedMode}
                      className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-hui-pageMid file:px-2 file:py-1 file:text-sm file:font-medium file:text-hui-burgundy disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        void onPickCoverFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={creatorLimitedMode}
                      onClick={() => setGameCoverUrl("")}
                      className="text-sm text-hui-body underline hover:text-hui-section disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ใช้รูปหัวใจชมพูเริ่มต้น
                    </button>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-hui-body">รหัสเกม</label>
                <input
                  readOnly
                  value={gameCode}
                  placeholder="ออกหลังเผยแพร่"
                  className="mt-1 w-full rounded-lg border border-hui-border bg-hui-pageTop px-3 py-2 font-mono text-sm text-hui-body"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={savingBasicIntro || loading || !selectedId}
                onClick={() => void saveBasicIntro()}
                className="hui-btn-primary px-6 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBasicIntro ? "กำลังบันทึก…" : "บันทึกและไปต่อ"}
              </button>
              <Link
                href={memberCancelHref}
                className="text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                ยกเลิก
              </Link>
            </div>
          </form>
        </div>
      ) : null}

      {selectedId && !showMemberBasicIntro ? (
        <div id="central-game-editor" className="relative space-y-4 scroll-mt-24 pb-6">
          {loading ? <p className="text-hui-muted">กำลังโหลด…</p> : null}

          {awardEditLocked ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
              <strong>มีผู้ได้รับรางวัลจากเกมนี้แล้ว ({prizeAwardCount} รายการ)</strong> — แก้ได้เฉพาะเพิ่มจำนวนรางวัลเท่านั้น
            </div>
          ) : null}

          {memberShellEmbed && !memberSinglePageGuide ? (
            <p className="text-sm text-hui-muted">
              <Link
                href={`/member/game-studio?game=${encodeURIComponent(selectedId || "")}`}
                className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                ← กลับแก้ชื่อเกมและคำอธิบายเบื้องต้น
              </Link>
            </p>
          ) : null}

          {memberSinglePageGuide ? (
            <p className="text-sm text-hui-muted">
              กรอก <strong className="text-hui-section">รายละเอียด</strong> และ <strong className="text-hui-section">ชื่อเกม</strong> · ตั้งโครงชุด รูป และกติกา · กด{" "}
              <strong className="text-hui-section">บันทึกข้อมูล</strong> ด้านล่างแผงนี้ · การเผยแพร่หรือลบเกมทำได้ที่เมนู{" "}
              <Link href="/member/game" className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
                เกมของฉัน
              </Link>
            </p>
          ) : (
            <p className="text-sm text-hui-muted">
              แต่ละชุด = <strong className="text-hui-section">จำนวนป้าย + รูป + กติกาของชุดนั้น</strong> ในแถวเดียว · ชุดละรูปเดียวใช้ทุกป้ายในชุด · กด{" "}
              <strong className="text-hui-section">บันทึกข้อมูล</strong> แถบล่าง (โครง + กติกา + รูปเมื่อครบ)
            </p>
          )}

          <form
            onSubmit={(e) => e.preventDefault()}
            noValidate
            className="space-y-4 rounded-xl border border-hui-border bg-hui-surface/90 p-4 shadow-soft"
          >
            <div>
              <h3 className="font-semibold text-hui-section">
                ตั้งค่า กิจกรรม / รางวัล — โครงชุดและรูปภาพ
              </h3>
              <p className="mt-1 text-sm text-hui-muted">
                รวม <span className="font-mono text-hui-body">{tileCount}</span> ป้าย · ตั้งกติกาในแต่ละแถวชุดด้านขวา
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {memberSinglePageGuide ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-hui-section">รายละเอียด</label>
                    <textarea
                      value={gameDescription}
                      onChange={(e) => setGameDescription(e.target.value)}
                      rows={4}
                      className="mt-1 w-full resize-y rounded-lg border border-hui-border px-3 py-2"
                      placeholder="อธิบายเกมให้ผู้เล่นเห็น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-hui-section">
                      ชื่อเกม {creatorLimitedMode ? "(แก้ไขไม่ได้)" : ""}
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      readOnly={creatorLimitedMode}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-hui-body ${creatorLimitedMode ? "border-hui-border bg-hui-pageTop" : ""}`}
                      placeholder={creatorLimitedMode ? "ชื่อเกม (ล็อก)" : "ชื่อเกม"}
                      title={creatorLimitedMode ? "ชื่อเกมถูกล็อก แก้ไขไม่ได้" : undefined}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-hui-body">รหัสเกม (คงเดิม)</label>
                    <input
                      readOnly
                      value={gameCode}
                      placeholder="ออกหลังเผยแพร่"
                      className="mt-1 w-full rounded-lg border border-hui-border bg-hui-pageTop px-3 py-2 font-mono text-sm text-hui-body"
                      title="รหัสเกมคงเดิม ไม่สามารถแก้ไขได้"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-hui-section">
                      ชื่อเกม {creatorLimitedMode ? "(แก้ไขไม่ได้)" : ""}
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      readOnly={creatorLimitedMode}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-hui-body ${creatorLimitedMode ? "border-hui-border bg-hui-pageTop" : ""}`}
                      placeholder={creatorLimitedMode ? "ชื่อเกม (ล็อก)" : "ชื่อเกม"}
                      title={creatorLimitedMode ? "ชื่อเกมถูกล็อก แก้ไขไม่ได้" : undefined}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-hui-body">รหัสเกม (คงเดิม)</label>
                    <input
                      readOnly
                      value={gameCode}
                      placeholder="รหัสเกมจะเป็นรหัสเดิม ไม่เปลี่ยนแปลง"
                      className="mt-1 w-full rounded-lg border border-hui-border bg-hui-pageTop px-3 py-2 font-mono text-sm text-hui-body"
                      title="รหัสเกมคงเดิม ไม่สามารถแก้ไขได้"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-hui-section">รายละเอียด</label>
                    <textarea
                      value={gameDescription}
                      onChange={(e) => setGameDescription(e.target.value)}
                      rows={4}
                      className="mt-1 w-full resize-y rounded-lg border border-hui-border px-3 py-2"
                      placeholder="อธิบายเกมให้ผู้เล่นเห็น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-lg border border-hui-border bg-hui-pageTop/80 p-3">
                    <p className="text-sm leading-relaxed text-hui-body">
                      <span className="font-semibold text-hui-section">
                        สถานะการแสดงในรายการหน้า /game:
                      </span>{" "}
                      {lobbyVisible ? "แสดง (เผยแพร่แล้วหรือเป็นเกมที่กำลังเปิดใช้)" : "ยังไม่แสดง"} — เปิด/ปิดด้วยปุ่มเผยแพร่หรือ「หยุดการเผยแพร่」ด้านล่าง (ไม่ใช่ช่องติ๊ก เพื่อไม่ให้บันทึกล้มเมื่อรูปยังไม่ครบ)
                    </p>
                  </div>
                  <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3">
                    <input
                      id="central-game-allow-gift-red"
                      type="checkbox"
                      checked={allowGiftRedPlay}
                      onChange={(e) => setAllowGiftRedPlay(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-hui-border"
                    />
                    <label htmlFor="central-game-allow-gift-red" className="text-sm leading-relaxed text-amber-950">
                      <span className="font-semibold">รับหัวใจแดงจากรหัสห้อง (ทุกเจ้าของห้อง)</span>
                    </label>
                  </div>
                </>
              )}
              <div>
                <label className="text-sm text-hui-section">
                  จำนวนชุด
                </label>
                <input
                  type="number"
                  min={1}
                  value={setCount}
                  onChange={(e) => {
                    const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setSetCount(n);
                    setSetSizes((prev) => resizeSetSizes(prev, n, prev[prev.length - 1] || 4));
                  }}
                  disabled={awardEditLocked}
                  className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-hui-pageTop"
                />
              </div>
              <div>
                <label className="text-sm text-hui-section">
                  ป้ายรวม (คำนวณอัตโนมัติ)
                </label>
                <p
                  className={`mt-2 font-mono text-sm ${
                    tileCount > CENTRAL_GAME_MAX_TILES ? "font-semibold text-red-700" : "text-hui-body"
                  }`}
                >
                  {tileCount}
                  {tileCount > CENTRAL_GAME_MAX_TILES
                    ? ` — เกินกำหนดสูงสุด ${CENTRAL_GAME_MAX_TILES} ป้าย`
                    : null}
                </p>
              </div>
              <div className="sm:col-span-2 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                <p className="text-sm font-semibold text-hui-body">การหักหัวใจต่อรอบ</p>
                <p className="mt-1 text-sm leading-relaxed text-hui-body">
                  เลือกโหมดชำระ: หักทั้งชมพูและแดงในรอบเดียวกัน · เฉพาะชมพู · เฉพาะแดง ·
                  หรือให้ผู้เล่นเลือกจ่ายชมพูหรือแดงอย่างใดอย่างหนึ่ง (ใส่สองช่องให้เท่ากัน)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm text-hui-body">โหมดชำระหัวใจ</label>
                    <select
                      value={heartCurrencyMode}
                      onChange={(e) => setHeartCurrencyMode(e.target.value)}
                      disabled={awardEditLocked}
                      className="mt-1 w-full max-w-md rounded-lg border border-hui-border bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
                    >
                      <option value="both">หักทั้งชมพูและแดง (ตามจำนวนที่ใส่)</option>
                      <option value="pink_only">รับเฉพาะหัวใจชมพู</option>
                      <option value="red_only">รับเฉพาะหัวใจแดง</option>
                      <option value="either">รับชมพูหรือแดงอย่างใดอย่างหนึ่ง (ผู้เล่นเลือกตอนเริ่ม)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex gap-2 rounded-lg border border-hui-border bg-white/80 px-3 py-2">
                    <input
                      id="central-accepts-pink"
                      type="checkbox"
                      checked={acceptsPinkHearts}
                      onChange={(e) => setAcceptsPinkHearts(e.target.checked)}
                      disabled={awardEditLocked}
                      className="mt-0.5 h-4 w-4 rounded border-hui-border"
                    />
                    <label htmlFor="central-accepts-pink" className="text-sm leading-relaxed text-hui-body">
                      ห้องนี้รับหัวใจชมพู (ปิดถ้าต้องการให้เล่นด้วยแดงเท่านั้น — โหมดจ่ายอย่างใดอย่างหนึ่งจะเหลือแค่แดง)
                    </label>
                  </div>
                  <div>
                    <label className="text-sm text-hui-body">หักหัวใจชมพูต่อรอบ</label>
                    <input
                      type="number"
                      min={0}
                      value={pinkHeartCost}
                      onChange={(e) => setPinkHeartCost(parseInt(e.target.value, 10) || 0)}
                      disabled={awardEditLocked}
                      className="mt-1 w-full rounded-lg border border-hui-border bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-hui-pageTop"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-hui-body">หักหัวใจแดงต่อรอบ</label>
                    <input
                      type="number"
                      min={0}
                      value={redHeartCost}
                      onChange={(e) => setRedHeartCost(parseInt(e.target.value, 10) || 0)}
                      disabled={awardEditLocked}
                      className="mt-1 w-full rounded-lg border border-hui-border bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-hui-pageTop"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-hui-section">
                แต่ละชุด — ซ้าย: ป้ายและรูป · ขวา: กติกาและรางวัล (ชิดรูปเพื่อมีที่สำหรับคอลัมน์การจ่ายรางวัล)
              </p>
              {Array.from({ length: setCount }, (_, s) => {
                const cap = Math.max(1, parseInt(String(setSizes[s]), 10) || 1);
                const preview = imageMap[`${s}-0`];
                const ruleEntries = rules
                  .map((r, idx) => ({ r, idx }))
                  .filter(
                    ({ r }) => (Math.max(0, Math.floor(Number(r.setIndex)) || 0)) === s
                  )
                  .sort(
                    (a, b) => (Number(a.r.sortOrder) || 0) - (Number(b.r.sortOrder) || 0)
                  );

                return (
                  <div
                    key={s}
                    className="flex flex-col gap-4 rounded-xl border border-hui-border bg-hui-pageTop/80 p-4 xl:flex-row xl:items-stretch"
                  >
                    <div className="flex flex-shrink-0 flex-wrap items-end gap-3 border-b border-hui-border pb-4 xl:w-[min(100%,240px)] xl:border-b-0 xl:border-r xl:border-hui-border xl:pb-0 xl:pr-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-hui-body">ชุดที่ {s + 1}</span>
                        <label className="mt-1 text-sm text-hui-muted">จำนวนป้ายในชุดนี้</label>
                        <input
                          type="number"
                          min={1}
                          value={cap}
                          onChange={(e) => {
                            const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setSetSizes((prev) => {
                              const next = [...prev];
                              next[s] = v;
                              return next;
                            });
                          }}
                          disabled={awardEditLocked}
                          className="mt-0.5 w-24 rounded-lg border border-hui-border px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-hui-pageTop"
                        />
                      </div>
                      <div className="w-28 shrink-0 sm:w-32">
                        <p className="mb-1 text-sm text-hui-muted">ตัวอย่าง</p>
                        <div className="aspect-square w-full overflow-hidden rounded-lg border border-hui-border bg-hui-pageTop">
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={preview}
                              src={preview}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-1 text-center text-sm leading-tight text-hui-muted">
                              เลือกรูป
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <label className="text-sm font-medium text-hui-body">
                          อัปโหลดรูปชุดนี้ (1 ไฟล์)
                        </label>
                        <p className="mt-1 text-xs leading-relaxed text-hui-muted">
                          แนะนำสี่เหลี่ยมจัตุรัส{" "}
                          <span className="font-medium text-hui-body/90">1:1</span> เช่น{" "}
                          <span className="whitespace-nowrap font-medium text-hui-body/90">
                            800×800 px
                          </span>{" "}
                          หรือ{" "}
                          <span className="whitespace-nowrap font-medium text-hui-body/90">
                            1024×1024 px
                          </span>{" "}
                          — แสดงบนกระดานแบบครอปเต็มช่องป้าย
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={awardEditLocked}
                          className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-hui-pageMid file:px-2 file:py-1 file:text-sm file:font-medium file:text-hui-burgundy disabled:cursor-not-allowed disabled:opacity-50"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            void onPickImage(s, 0, f);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2 xl:pl-1">
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold text-hui-body">
                          กติกาและรางวัล — ชุดที่ {s + 1}
                        </span>
                        <p className="text-sm leading-snug text-hui-muted">
                          ลำดับตรวจเริ่มที่เลขชุด ({s + 1}) — ปรับได้ถ้าต้องการให้ชุดอื่นตรวจก่อน/หลัง
                        </p>
                      </div>
                      <div className="space-y-3 pb-1">
                        {ruleEntries.map(({ r, idx }) => (
                          <RuleEditorRow
                            key={r.id || `rule-${idx}`}
                            r={r}
                            idx={idx}
                            needCap={cap}
                            showSetPicker={false}
                            setCount={setCount}
                            setSizes={setSizes}
                            updateRule={updateRule}
                            setRules={setRules}
                            gamePrizeQtyLocked={gamePrizeQtyLocked || awardEditLocked}
                            structureLocked={awardEditLocked}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(() => {
                const orphans = rules
                  .map((r, idx) => ({ r, idx }))
                  .filter(({ r }) => {
                    const si = Math.floor(Number(r.setIndex));
                    if (Number.isNaN(si)) return true;
                    return si < 0 || si >= setCount;
                  });
                if (orphans.length === 0) return null;
                return (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4">
                    <p className="text-sm font-semibold text-amber-950">
                      กติกาที่อ้างอิงชุดไม่ถูกต้อง
                    </p>
                    <p className="mt-1 text-sm text-amber-900">
                      มักเกิดหลังลดจำนวนชุด — แก้เลขชุดหรือลบแถว
                    </p>
                    <div className="mt-3 space-y-3">
                      {orphans.map(({ r, idx }) => {
                        const siClamp = Math.min(
                          setCount - 1,
                          Math.max(0, Math.floor(Number(r.setIndex)) || 0)
                        );
                        const capOr = Math.max(
                          1,
                          parseInt(String(setSizes[siClamp] ?? setSizes[0]), 10) || 1
                        );
                        return (
                          <RuleEditorRow
                            key={r.id || `orphan-${idx}`}
                            r={r}
                            idx={idx}
                            needCap={capOr}
                            showSetPicker
                            setCount={setCount}
                            setSizes={setSizes}
                            updateRule={updateRule}
                            setRules={setRules}
                            gamePrizeQtyLocked={gamePrizeQtyLocked || awardEditLocked}
                            structureLocked={awardEditLocked}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-hui-border bg-white p-4">
                <h3 className="text-sm font-semibold text-hui-section">{gameCoverBlockTitle}</h3>
                <p className="mt-1 text-sm leading-relaxed text-hui-body">
                  แสดงบนหน้าแรกและหน้าเล่นเกม — ถ้าไม่อัปโหลดหรือกดคืนค่า จะใช้รูปหัวใจสีชมพูเป็นค่าเริ่มต้น
                </p>
                <p className="mt-2 text-xs leading-relaxed text-hui-muted">
                  แนะนำรูปสี่เหลี่ยมจัตุรัส{" "}
                  <span className="font-medium text-hui-body/90">1:1</span> เช่น{" "}
                  <span className="whitespace-nowrap font-medium text-hui-body/90">
                    800×800 px
                  </span>{" "}
                  — การ์ดในรายการเกมและหน้าเล่นแสดงเป็นสี่เหลี่ยมจัตุรัส (ระบบอาจย่อความละเอียดอัตโนมัติเมื่ออัปโหลดไม่ใช่ PNG)
                </p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="w-28 shrink-0 sm:w-32">
                    <p className="mb-1 text-sm text-hui-muted">ตัวอย่าง</p>
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-hui-border bg-hui-pageTop">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={gameCoverUrl.trim() || "default-cover"}
                        src={gameCoverUrl.trim() || DEFAULT_CENTRAL_GAME_COVER_PATH}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="text-sm font-medium text-hui-body">
                      {memberSinglePageGuide
                        ? "อัปโหลดรูปหน้าห้องเกม (1 ไฟล์)"
                        : "อัปโหลดรูปหน้าปก (1 ไฟล์)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-hui-pageMid file:px-2 file:py-1 file:text-sm file:font-medium file:text-hui-burgundy"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        void onPickCoverFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setGameCoverUrl("")}
                      className="text-sm text-hui-body underline hover:text-hui-section"
                    >
                      ใช้รูปหัวใจชมพูเริ่มต้น
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-hui-border bg-white p-4">
                <h3 className="text-sm font-semibold text-hui-section">{tileBackBlockTitle}</h3>
                <p className="mt-1 text-sm leading-relaxed text-hui-body">
                  แสดงบนกระดานก่อนผู้เล่นเปิดป้าย — ถ้าไม่อัปโหลดหรือกดคืนค่า ระบบใช้รูปเริ่มต้นของเว็บ
                </p>
                <p className="mt-2 text-xs leading-relaxed text-hui-muted">
                  แนะนำสี่เหลี่ยมจัตุรัส{" "}
                  <span className="font-medium text-hui-body/90">1:1</span> เช่น{" "}
                  <span className="whitespace-nowrap font-medium text-hui-body/90">
                    800×800 px
                  </span>{" "}
                  — ให้ตรงกับช่องป้ายบนกระดาน (แสดงแบบครอปเต็มช่อง)
                </p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="w-28 shrink-0 sm:w-32">
                    <p className="mb-1 text-sm text-hui-muted">ตัวอย่าง</p>
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-hui-border bg-hui-pageTop">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={tileBackCoverUrl.trim() || "default-tile"}
                        src={tileBackCoverUrl.trim() || DEFAULT_TILE_BACK_COVER_PATH}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="text-sm font-medium text-hui-body">
                      {memberSinglePageGuide
                        ? "อัปโหลดรูปหน้าป้าย (1 ไฟล์)"
                        : "อัปโหลดรูปหน้าปิดป้าย (1 ไฟล์)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-hui-pageMid file:px-2 file:py-1 file:text-sm file:font-medium file:text-hui-burgundy"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        void onPickTileBackFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setTileBackCoverUrl("")}
                      className="text-sm text-hui-body underline hover:text-hui-section"
                    >
                      ใช้รูปเริ่มต้นของเว็บ
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {memberSinglePageGuide ? (
              <div
                className="mt-4 rounded-2xl border border-hui-border bg-white px-4 py-4 shadow-sm"
                role="region"
                aria-label="บันทึกข้อมูลเกม"
              >
                <button
                  type="button"
                  disabled={savingAll || loading || gameActionBusy || !selectedId}
                  onClick={() => saveAllGameData()}
                  className="hui-btn-primary block w-full px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {savingAll ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
                </button>
                <p className="mt-3 text-sm leading-snug text-hui-muted">
                  โปรดตรวจสอบรูป กติกา และรางวัลให้ถูกต้องก่อนบันทึก · เผยแพร่ หยุดเผยแพร่ ลบเกม หรือดูตัวอย่าง — ไปที่{" "}
                  <Link
                    href="/member/game"
                    className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                  >
                    เกมของฉัน
                  </Link>
                </p>
              </div>
            ) : (
              <div
                className="mt-4 rounded-2xl border border-hui-border bg-white px-4 py-3 shadow-sm"
                role="region"
                aria-label="บันทึกและเผยแพร่เกม"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start sm:gap-4">
                  <button
                    type="button"
                    disabled={savingAll || loading || gameActionBusy || !selectedId}
                    onClick={() => saveAllGameData()}
                    className="hui-btn-primary shrink-0 self-start px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingAll ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-hui-section">บันทึกข้อมูล</p>
                    <p className="mt-0.5 text-sm leading-snug text-hui-muted">
                      โปรดตรวจสอบรูปแบบเกม รางวัล ให้ถูกต้องตรงตามความต้องการ · หากกดเผยแพร่แล้วจะไม่สามารถแก้ไขได้
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-hui-border pt-3">
                  <button
                    type="button"
                    disabled={gameActionBusy || savingAll || !selectedId}
                    aria-busy={gameActionBusy}
                    onClick={() => activate()}
                    className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {memberPublishCta}
                  </button>
                  <button
                    type="button"
                    disabled={gameActionBusy || savingAll || !selectedId}
                    onClick={() => deactivate()}
                    className="rounded-2xl border border-hui-border bg-white px-3 py-2 text-sm font-medium text-hui-body shadow-soft hover:bg-hui-pageTop disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    หยุดการเผยแพร่
                  </button>
                  <button
                    type="button"
                    disabled={
                      gameActionBusy ||
                      savingAll ||
                      !selectedId ||
                      prizeAwardCount > 0 ||
                      playCount > 0
                    }
                    title={
                      prizeAwardCount > 0 || playCount > 0
                        ? "มีประวัติการเล่นหรือรับรางวัลแล้ว — ติดต่อผู้ดูแลระบบเพื่อลบ"
                        : undefined
                    }
                    onClick={() => removeGame()}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ลบเกม
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      ) : null}
    </section>
  );
}
