import { redirect } from "next/navigation";

function buildLoginLineQuery(searchParams) {
  if (!searchParams || typeof searchParams !== "object") return "";
  const p = new URLSearchParams();
  for (const key of Object.keys(searchParams)) {
    const val = searchParams[key];
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const item of val) p.append(key, String(item));
    } else {
      p.set(key, String(val));
    }
  }
  return p.toString();
}

/**
 * ลิงก์เก่า /auth และ NextAuth signIn เดิม — ส่งต่อ query (callbackUrl, error ฯลฯ)
 * Middleware ส่ง /auth → /login/line อยู่แล้ว; หน้านี้เป็นทางรองเมื่อเข้าถึง route โดยตรง
 */
export default function AuthPage({ searchParams }) {
  const qs = buildLoginLineQuery(searchParams);
  redirect(qs ? `/login/line?${qs}` : "/login/line");
}
