/** กระเป๋าหัวใจฝั่งเบราว์เซอร์ (สาธิต) — ต่อบัญชีจริง/API ภายหลัง */

const STORAGE_KEY = "huajaiy_hearts_v1";
export const DEFAULT_HEARTS = 20;

function parseStored(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function getHearts() {
  if (typeof window === "undefined") return DEFAULT_HEARTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_HEARTS;
    const n = parseStored(raw);
    return n === null ? DEFAULT_HEARTS : n;
  } catch {
    return DEFAULT_HEARTS;
  }
}

function persist(n) {
  window.localStorage.setItem(STORAGE_KEY, String(n));
  window.dispatchEvent(new Event("hearts-changed"));
}

export function setHearts(n) {
  if (typeof window === "undefined") return;
  const v = Math.max(0, Math.floor(Number(n)) || 0);
  persist(v);
}

export function addHearts(n) {
  if (typeof window === "undefined") return;
  const delta = Math.floor(Number(n)) || 0;
  if (delta <= 0) return;
  setHearts(getHearts() + delta);
}

/** หักหัวใจ — คืน true เมื่อหักได้ */
export function trySpend(n) {
  if (typeof window === "undefined") return true;
  const cost = Math.max(0, Math.floor(Number(n)) || 0);
  if (cost === 0) return true;
  const cur = getHearts();
  if (cur < cost) return false;
  persist(cur - cost);
  return true;
}

export function subscribeHearts(listener) {
  if (typeof window === "undefined") return () => {};
  const wrap = () => listener(getHearts());
  window.addEventListener("hearts-changed", wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener("hearts-changed", wrap);
    window.removeEventListener("storage", wrap);
  };
}
