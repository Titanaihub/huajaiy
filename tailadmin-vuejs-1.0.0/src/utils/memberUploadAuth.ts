/** คีย์เดียวกับ `web/lib/memberApi.js` (MEMBER_TOKEN_KEY) */
export const HUAJAIY_MEMBER_TOKEN_KEY = 'huajaiy_member_token'

/** หัว Authorization สำหรับ POST `/upload` (rewrite → API) */
export function memberUploadAuthHeaders(): Record<string, string> {
  try {
    const t = localStorage.getItem(HUAJAIY_MEMBER_TOKEN_KEY)
    if (t && t.trim()) return { Authorization: `Bearer ${t.trim()}` }
  } catch {
    /* ignore */
  }
  return {}
}
