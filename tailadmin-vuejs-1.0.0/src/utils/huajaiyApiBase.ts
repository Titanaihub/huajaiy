/** Same source as web/lib/config + bridge `__HUAJAIY_API_BASE__` */
export const HUAJAIY_MEMBER_TOKEN_KEY = 'huajaiy_member_token'

export function huajaiyApiBase(): string {
  const b = (window as unknown as { __HUAJAIY_API_BASE__?: string }).__HUAJAIY_API_BASE__
  const s = String(b || '')
    .trim()
    .replace(/\/$/, '')
  return s || 'https://huajaiy-api.onrender.com'
}

export function huajaiyMemberToken(): string | null {
  try {
    return localStorage.getItem(HUAJAIY_MEMBER_TOKEN_KEY)
  } catch {
    return null
  }
}
