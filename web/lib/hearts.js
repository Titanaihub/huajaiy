/** กระเป๋าหัวใจฝั่งเบราว์เซอร์ (สาธิต) — แยกชมพู/แดงให้สอดคล้องบัญชีจริง */

const KEY_PINK = "huajaiy_hearts_pink_v1";
const KEY_RED = "huajaiy_hearts_red_v1";
const LEGACY_KEY = "huajaiy_hearts_v1";

export const DEFAULT_HEARTS = 20;
export const DEFAULT_PINK = 20;
export const DEFAULT_RED = 0;

function parseN(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("hearts-changed"));
}

function migrateLegacyOnce() {
  if (typeof window === "undefined") return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy === null) return;
    const n = parseN(legacy);
    if (n !== null) {
      if (window.localStorage.getItem(KEY_PINK) === null) {
        window.localStorage.setItem(KEY_PINK, String(n));
      }
      if (window.localStorage.getItem(KEY_RED) === null) {
        window.localStorage.setItem(KEY_RED, "0");
      }
    }
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function getPinkHearts() {
  if (typeof window === "undefined") return DEFAULT_PINK;
  try {
    migrateLegacyOnce();
    const raw = window.localStorage.getItem(KEY_PINK);
    if (raw === null) return DEFAULT_PINK;
    const n = parseN(raw);
    return n === null ? DEFAULT_PINK : n;
  } catch {
    return DEFAULT_PINK;
  }
}

export function getRedHearts() {
  if (typeof window === "undefined") return DEFAULT_RED;
  try {
    migrateLegacyOnce();
    const raw = window.localStorage.getItem(KEY_RED);
    if (raw === null) return DEFAULT_RED;
    const n = parseN(raw);
    return n === null ? DEFAULT_RED : n;
  } catch {
    return DEFAULT_RED;
  }
}

/** รวมชมพู+แดง — ใช้กับ UI ที่ต้องการตัวเลขเดียว */
export function getHearts() {
  return getPinkHearts() + getRedHearts();
}

function persistPink(n) {
  window.localStorage.setItem(KEY_PINK, String(n));
  emitChanged();
}

function persistRed(n) {
  window.localStorage.setItem(KEY_RED, String(n));
  emitChanged();
}

export function setPinkHearts(n) {
  if (typeof window === "undefined") return;
  const v = Math.max(0, Math.floor(Number(n)) || 0);
  persistPink(v);
}

export function setRedHearts(n) {
  if (typeof window === "undefined") return;
  const v = Math.max(0, Math.floor(Number(n)) || 0);
  persistRed(v);
}

/** เซ็ตยอดรวมทั้งหมดเป็นชมพู (พฤติกรรมเดิมของ setHearts) */
export function setHearts(n) {
  if (typeof window === "undefined") return;
  const v = Math.max(0, Math.floor(Number(n)) || 0);
  window.localStorage.setItem(KEY_PINK, String(v));
  window.localStorage.setItem(KEY_RED, "0");
  emitChanged();
}

export function addHearts(n) {
  if (typeof window === "undefined") return;
  const delta = Math.floor(Number(n)) || 0;
  if (delta <= 0) return;
  setPinkHearts(getPinkHearts() + delta);
}

export function addPinkHearts(n) {
  addHearts(n);
}

export function addRedHearts(n) {
  if (typeof window === "undefined") return;
  const delta = Math.floor(Number(n)) || 0;
  if (delta <= 0) return;
  setRedHearts(getRedHearts() + delta);
}

/** หักหัวใจแบบรวม — ใช้ชมพูก่อน แล้วจึงแดง (กติกา legacy รอบเดียว) */
export function trySpend(n) {
  if (typeof window === "undefined") return true;
  const cost = Math.max(0, Math.floor(Number(n)) || 0);
  if (cost === 0) return true;
  let p = getPinkHearts();
  let r = getRedHearts();
  if (p + r < cost) return false;
  let need = cost;
  const useP = Math.min(p, need);
  p -= useP;
  need -= useP;
  r -= need;
  window.localStorage.setItem(KEY_PINK, String(p));
  window.localStorage.setItem(KEY_RED, String(r));
  emitChanged();
  return true;
}

/** หักชมพูและแดงตามจำนวนที่กำหนดแยกกัน (เกมส่วนกลาง) */
export function trySpendPinkRed(pinkCost, redCost) {
  if (typeof window === "undefined") return true;
  const pNeed = Math.max(0, Math.floor(Number(pinkCost)) || 0);
  const rNeed = Math.max(0, Math.floor(Number(redCost)) || 0);
  if (pNeed === 0 && rNeed === 0) return true;
  const p = getPinkHearts();
  const r = getRedHearts();
  if (p < pNeed || r < rNeed) return false;
  window.localStorage.setItem(KEY_PINK, String(p - pNeed));
  window.localStorage.setItem(KEY_RED, String(r - rNeed));
  emitChanged();
  return true;
}

export function canAffordPinkRed(pinkCost, redCost) {
  const pNeed = Math.max(0, Math.floor(Number(pinkCost)) || 0);
  const rNeed = Math.max(0, Math.floor(Number(redCost)) || 0);
  return getPinkHearts() >= pNeed && getRedHearts() >= rNeed;
}

export function subscribeHearts(listener) {
  if (typeof window === "undefined") return () => {};
  const wrap = () => listener();
  window.addEventListener("hearts-changed", wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener("hearts-changed", wrap);
    window.removeEventListener("storage", wrap);
  };
}
