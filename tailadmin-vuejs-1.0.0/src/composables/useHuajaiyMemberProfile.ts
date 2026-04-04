import { ref, computed, type Ref, type ComputedRef } from 'vue'

const TOKEN_KEY = 'huajaiy_member_token'

function apiBase(): string {
  const b = (window as unknown as { __HUAJAIY_API_BASE__?: string }).__HUAJAIY_API_BASE__
  const s = String(b || '')
    .trim()
    .replace(/\/$/, '')
  return s || 'https://huajaiy-api.onrender.com'
}

export interface HuajaiyPublicUser {
  id?: string
  username?: string
  firstName?: string
  lastName?: string
  phone?: string | null
  email?: string | null
  linePictureUrl?: string | null
  profilePictureUrl?: string | null
  socialFacebookUrl?: string | null
  socialLineUrl?: string | null
  socialTiktokUrl?: string | null
  shippingAddressParts?: Record<string, string>
  role?: string
  selfServiceNameEditsRemaining?: number
  lineLoginLinked?: boolean
  /** ตรงกับ userService.publicUser — สมาชิกใหม่/เก่าได้ชุดเดียวกันจาก GET /api/auth/me */
  pinkHeartsBalance?: number
  redHeartsBalance?: number
  redGiveawayBalance?: number
  heartsBalance?: number
  roomGiftRed?: unknown[]
}

export function useHuajaiyMemberProfile() {
  const user: Ref<HuajaiyPublicUser | null> = ref(null)
  const loading = ref(true)
  const error: Ref<string | null> = ref(null)
  const saving = ref(false)
  const uploading = ref(false)

  const displayName: ComputedRef<string> = computed(() => {
    const u = user.value
    if (!u) return 'สมาชิก'
    const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
    return n || u.username || 'สมาชิก'
  })

  const avatarUrl: ComputedRef<string> = computed(() => {
    const u = user.value
    const custom = u?.profilePictureUrl
    const line = u?.linePictureUrl
    const raw = (custom && String(custom).trim()) || (line && String(line).trim()) || ''
    if (raw) return raw
    return `${import.meta.env.BASE_URL}images/default-member-avatar-heart.svg`
  })

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      user.value = null
      loading.value = false
      return
    }
    try {
      const r = await fetch(`${apiBase()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = (await r.json()) as { ok?: boolean; user?: HuajaiyPublicUser; error?: string }
      if (data.ok && data.user) user.value = data.user
      else error.value = data.error || 'โหลดโปรไฟล์ไม่สำเร็จ'
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function patch(body: Record<string, unknown>): Promise<HuajaiyPublicUser> {
    saving.value = true
    error.value = null
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) throw new Error('ยังไม่ได้ล็อกอิน')
    try {
      const r = await fetch(`${apiBase()}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      const data = (await r.json()) as { ok?: boolean; user?: HuajaiyPublicUser; error?: string }
      if (!data.ok || !data.user) throw new Error(data.error || 'บันทึกไม่สำเร็จ')
      user.value = data.user
      return data.user
    } finally {
      saving.value = false
    }
  }

  async function uploadProfileImage(file: File): Promise<string> {
    uploading.value = true
    try {
      const fd = new FormData()
      fd.append('image', file)
      const r = await fetch(`${apiBase()}/upload`, {
        method: 'POST',
        body: fd
      })
      const data = (await r.json()) as {
        ok?: boolean
        publicUrl?: string
        error?: string
      }
      if (!data.ok || !data.publicUrl) {
        throw new Error(data.error || 'อัปโหลดรูปไม่สำเร็จ')
      }
      return String(data.publicUrl)
    } finally {
      uploading.value = false
    }
  }

  async function changePassword(payload: {
    currentPassword?: string
    newPassword: string
    newPasswordConfirm: string
  }): Promise<void> {
    saving.value = true
    error.value = null
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) throw new Error('ยังไม่ได้ล็อกอิน')
    try {
      const body: Record<string, string> = {
        newPassword: payload.newPassword,
        newPasswordConfirm: payload.newPasswordConfirm
      }
      const cur = String(payload.currentPassword ?? '').trim()
      if (cur) body.currentPassword = cur
      const r = await fetch(`${apiBase()}/api/auth/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      const data = (await r.json()) as { ok?: boolean; error?: string }
      if (!data.ok) throw new Error(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ')
    } finally {
      saving.value = false
    }
  }

  return {
    user,
    loading,
    error,
    saving,
    uploading,
    displayName,
    avatarUrl,
    load,
    patch,
    uploadProfileImage,
    changePassword
  }
}

export type HuajaiyProfileContext = ReturnType<typeof useHuajaiyMemberProfile>
