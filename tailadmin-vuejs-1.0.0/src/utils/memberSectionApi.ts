import { huajaiyApiBase, huajaiyMemberToken } from './huajaiyApiBase'
import type { PrizeAward, PrizeWithdrawalRow } from './memberPrizeUtils'

function root(): string {
  return huajaiyApiBase().replace(/\/$/, '')
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export async function apiGetMyCentralPrizeAwards(token: string): Promise<PrizeAward[]> {
  const r = await fetch(`${root()}/api/auth/central-prize-awards/mine`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; awards?: PrizeAward[]; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดรางวัลของฉันไม่สำเร็จ')
  return Array.isArray(data.awards) ? data.awards : []
}

export async function apiGetMyPrizeWithdrawals(token: string): Promise<PrizeWithdrawalRow[]> {
  const r = await fetch(`${root()}/api/auth/central-prize-withdrawals/mine`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    withdrawals?: PrizeWithdrawalRow[]
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดประวัติคำขอถอนไม่สำเร็จ')
  return Array.isArray(data.withdrawals) ? data.withdrawals : []
}

export async function apiCancelPrizeWithdrawalRequest(token: string, id: string): Promise<void> {
  const r = await fetch(
    `${root()}/api/auth/central-prize-withdrawals/${encodeURIComponent(id)}/cancel`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' }
    }
  )
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'ยกเลิกคำขอไม่สำเร็จ')
}

export async function apiPostWinnerPickupAck(token: string, awardId: string): Promise<void> {
  const r = await fetch(
    `${root()}/api/auth/central-prize-awards/${encodeURIComponent(awardId)}/winner-pickup-ack`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' }
    }
  )
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'บันทึกการรับรางวัลไม่สำเร็จ')
}

export async function apiGetIncomingPrizeWithdrawals(token: string): Promise<PrizeWithdrawalRow[]> {
  const r = await fetch(`${root()}/api/auth/central-prize-withdrawals/incoming`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    withdrawals?: PrizeWithdrawalRow[]
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดคำขอถอนไม่สำเร็จ')
  return Array.isArray(data.withdrawals) ? data.withdrawals : []
}

export interface IncomingAward extends PrizeAward {
  winnerUsername?: string
  winnerFirstName?: string
  winnerLastName?: string
  setIndex?: number | string
}

export async function apiGetIncomingPrizeAwards(
  token: string,
  limit?: number
): Promise<IncomingAward[]> {
  const q = new URLSearchParams()
  if (limit != null) q.set('limit', String(limit))
  const qs = q.toString()
  const r = await fetch(
    `${root()}/api/auth/central-prize-awards/incoming${qs ? `?${qs}` : ''}`,
    { headers: authHeaders(token) }
  )
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    awards?: IncomingAward[]
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดประวัติผู้ได้รับรางวัลไม่สำเร็จ')
  return Array.isArray(data.awards) ? data.awards : []
}

export async function apiResolvePrizeWithdrawal(
  token: string,
  id: string,
  body: { action: string; note?: string; transferSlipUrl?: string; transferDate?: string }
): Promise<void> {
  const r = await fetch(
    `${root()}/api/auth/central-prize-withdrawals/${encodeURIComponent(id)}/resolve`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'อัปเดตสถานะไม่สำเร็จ')
}

export async function apiResolveIncomingItemAward(
  token: string,
  id: string,
  body: { mode: string; status: string; note?: string; trackingCode?: string }
): Promise<void> {
  const r = await fetch(
    `${root()}/api/auth/central-prize-awards/${encodeURIComponent(id)}/item-resolve`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'อัปเดตสถานะไม่สำเร็จ')
}

export interface HeartPackage {
  id: string
  title?: string
  description?: string
  redQty?: number
  priceThb?: number
}

export async function apiHeartPackages(): Promise<HeartPackage[]> {
  const r = await fetch(`${root()}/api/hearts/packages`, { cache: 'no-store' })
  const data = (await r.json().catch(() => ({}))) as { packages?: HeartPackage[]; error?: string }
  if (!r.ok) throw new Error(data.error || 'โหลดแพ็กเกจไม่สำเร็จ')
  return Array.isArray(data.packages) ? data.packages : []
}

export interface HeartPurchaseRow {
  id: string
  createdAt?: string
  packageTitle?: string
  status?: string
  slipUrl?: string | null
  paymentAccountName?: string
  paymentAccountNumber?: string
  paymentBankName?: string
  paymentQrUrl?: string | null
}

export async function apiCreateHeartPurchase(token: string, packageId: string): Promise<void> {
  const r = await fetch(`${root()}/api/hearts/purchases`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId })
  })
  const data = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new Error(data.error || 'ส่งคำขอไม่สำเร็จ')
}

export async function apiAttachHeartPurchaseSlip(
  token: string,
  purchaseId: string,
  slipUrl: string
): Promise<void> {
  const r = await fetch(`${root()}/api/hearts/purchases/${encodeURIComponent(purchaseId)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ slipUrl })
  })
  const data = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new Error(data.error || 'แนบสลิปไม่สำเร็จ')
}

export async function apiMyHeartPurchases(token: string): Promise<HeartPurchaseRow[]> {
  const r = await fetch(`${root()}/api/hearts/purchases/mine`, { headers: authHeaders(token) })
  const data = (await r.json().catch(() => ({}))) as {
    purchases?: HeartPurchaseRow[]
    error?: string
  }
  if (!r.ok) throw new Error(data.error || 'โหลดประวัติไม่สำเร็จ')
  return Array.isArray(data.purchases) ? data.purchases : []
}

export interface RoomRedGiftCode {
  id?: string
  code?: string
  redAmount?: number
  maxUses?: number
  usesCount?: number
  cancelled?: boolean
  exhausted?: boolean
  expired?: boolean
  redeemedByUsernames?: string[]
}

export async function apiListRoomRedGiftCodes(token: string): Promise<RoomRedGiftCode[]> {
  const r = await fetch(`${root()}/api/hearts/room-red-codes/mine`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; codes?: RoomRedGiftCode[]; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดรายการรหัสไม่สำเร็จ')
  return Array.isArray(data.codes) ? data.codes : []
}

export async function apiCreateRoomRedGiftCode(
  token: string,
  payload: { redAmount: number; codeCount: number; maxUses: number }
): Promise<{ codes?: RoomRedGiftCode[]; code?: RoomRedGiftCode; redDeducted?: number }> {
  const r = await fetch(`${root()}/api/hearts/room-red-codes`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    codes?: RoomRedGiftCode[]
    code?: RoomRedGiftCode
    redDeducted?: number
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'สร้างรหัสไม่สำเร็จ')
  return data
}

export async function apiDeleteRoomRedGiftCode(token: string, codeId: string): Promise<void> {
  const r = await fetch(`${root()}/api/hearts/room-red-codes/${encodeURIComponent(codeId)}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!r.ok || !data.ok) throw new Error(data.error || 'ลบรหัสไม่สำเร็จ')
}

export interface MyShopRow {
  id: string
  slug?: string
  name?: string
  createdAt?: string
}

export async function apiGetMyShops(token: string): Promise<MyShopRow[]> {
  const r = await fetch(`${root()}/api/auth/shops/mine`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    shops?: MyShopRow[]
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดร้านของฉันไม่สำเร็จ')
  return Array.isArray(data.shops) ? data.shops : []
}

export interface HeartLedgerEntry {
  id: string
  createdAt?: string
  pinkDelta?: number
  redDelta?: number
  pinkBalanceAfter?: number
  redBalanceAfter?: number
  kind?: string
  label?: string
  meta?: Record<string, unknown> | null
}

export async function apiGetMyHeartLedger(
  token: string,
  opts?: { limit?: number; offset?: number; pinkOnly?: boolean }
): Promise<{ entries: HeartLedgerEntry[]; dbRequired?: boolean }> {
  const lim = opts?.limit ?? (opts?.pinkOnly ? 500 : 300)
  const off = opts?.offset ?? 0
  const qs = new URLSearchParams({ limit: String(lim), offset: String(off) })
  if (opts?.pinkOnly) qs.set('pinkOnly', '1')
  const r = await fetch(`${root()}/api/auth/heart-ledger/mine?${qs}`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    entries?: HeartLedgerEntry[]
    dbRequired?: boolean
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดประวัติหัวใจไม่สำเร็จ')
  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    dbRequired: Boolean(data.dbRequired)
  }
}

export interface RoomRedRedemptionRow {
  id: string
  redeemedAt?: string
  redAmount?: number
  code?: string | null
  creatorId?: string | null
  creatorUsername?: string | null
}

export async function apiGetMyRoomRedRedemptions(
  token: string,
  opts?: { limit?: number }
): Promise<{ items: RoomRedRedemptionRow[]; dbRequired?: boolean }> {
  const lim = opts?.limit ?? 400
  const qs = new URLSearchParams({ limit: String(lim) })
  const r = await fetch(`${root()}/api/auth/room-red-redemptions/mine?${qs}`, {
    headers: authHeaders(token)
  })
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean
    items?: RoomRedRedemptionRow[]
    dbRequired?: boolean
    error?: string
  }
  if (!r.ok || !data.ok) throw new Error(data.error || 'โหลดประวัติแลกรหัสไม่สำเร็จ')
  return {
    items: Array.isArray(data.items) ? data.items : [],
    dbRequired: Boolean(data.dbRequired)
  }
}

/** Re-export token helper for pages */
export { huajaiyMemberToken }
