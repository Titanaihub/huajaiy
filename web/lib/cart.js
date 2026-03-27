/** ตะกร้าฝั่งเบราว์เซอร์ (สาธิต) — ต่อ API / ชำระเงินจริงภายหลัง */

const STORAGE_KEY = "huajaiy_cart_v1";

function persist(lines) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("cart-changed"));
}

export function getCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((x) => x && typeof x.productId === "string")
      .map((x) => ({
        productId: x.productId,
        qty: Math.max(1, Math.floor(Number(x.qty)) || 1)
      }));
  } catch {
    return [];
  }
}

export function getCartItemCount() {
  return getCart().reduce((s, x) => s + x.qty, 0);
}

export function addToCart(productId, qty = 1) {
  const q = Math.max(1, Math.floor(Number(qty)) || 1);
  const cart = getCart();
  const idx = cart.findIndex((x) => x.productId === productId);
  if (idx >= 0) cart[idx] = { ...cart[idx], qty: cart[idx].qty + q };
  else cart.push({ productId, qty: q });
  persist(cart);
}

export function setLineQty(productId, qty) {
  const n = Math.floor(Number(qty)) || 0;
  let cart = getCart();
  if (n <= 0) {
    cart = cart.filter((x) => x.productId !== productId);
  } else {
    const idx = cart.findIndex((x) => x.productId === productId);
    if (idx >= 0) cart[idx] = { ...cart[idx], qty: n };
    else cart.push({ productId, qty: n });
  }
  persist(cart);
}

export function removeLine(productId) {
  persist(getCart().filter((x) => x.productId !== productId));
}

export function clearCart() {
  persist([]);
}

export function subscribeCart(listener) {
  if (typeof window === "undefined") return () => {};
  const wrap = () => listener(getCart());
  window.addEventListener("cart-changed", wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener("cart-changed", wrap);
    window.removeEventListener("storage", wrap);
  };
}
