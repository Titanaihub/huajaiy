/** ประวัติออเดอร์สาธิตในเครื่อง — ต่อฐานข้อมูลภายหลัง */

const STORAGE_KEY = "huajaiy_orders_v1";
const MAX = 30;

function persist(list) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("orders-changed"));
}

export function getOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} o
 * @param {number} o.totalPrice
 * @param {number} o.hearts
 * @param {{ name: string, qty: number, lineSubtotal: number, hearts: number }[]} o.items
 */
export function addOrder(o) {
  const list = getOrders();
  const entry = {
    id: `ord_${Date.now()}`,
    at: Date.now(),
    totalPrice: o.totalPrice,
    hearts: o.hearts,
    items: Array.isArray(o.items) ? o.items : []
  };
  list.unshift(entry);
  persist(list.slice(0, MAX));
}

export function subscribeOrders(listener) {
  if (typeof window === "undefined") return () => {};
  const wrap = () => listener(getOrders());
  window.addEventListener("orders-changed", wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener("orders-changed", wrap);
    window.removeEventListener("storage", wrap);
  };
}
