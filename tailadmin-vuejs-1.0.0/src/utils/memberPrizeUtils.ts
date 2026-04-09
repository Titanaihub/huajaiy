/** Pure helpers ported from web/components/AccountMyPrizesSection.jsx */

export const MIN_WITHDRAW_BAHT = 20

/** ตรงกับค่าที่ API บันทึกเมื่อถอนแบบมารับเอง */
export const PICKUP_WITHDRAW_BANK_LABEL = 'รับเงินสดหน้างาน'

export function isPickupCashWithdrawal(w: PrizeWithdrawalRow | undefined): boolean {
  if (!w || typeof w !== 'object') return false
  return String(w.bankName || '').trim() === PICKUP_WITHDRAW_BANK_LABEL
}

export const CAT_LABEL: Record<string, string> = {
  cash: 'เงินสด',
  item: 'สิ่งของ',
  none: 'ไม่มีรางวัล'
}

export interface PrizeAward {
  id?: string
  prizeCategory?: string
  prizeTitle?: string
  prizeValueText?: string
  prizeUnit?: string
  prizeFulfillmentMode?: string
  itemFulfillmentMode?: string
  itemFulfillmentStatus?: string
  itemShippingAddressSnapshot?: { address?: string }
  itemTrackingCode?: string
  creatorUsername?: string
  creatorPrizeContactLine?: string
  winnerPickupAckAt?: string
  wonAt?: string
  gameCode?: string
  gameId?: string
  gameTitle?: string
}

export interface PrizeWithdrawalRow {
  id?: string
  status?: string
  amountThb?: number | string
  createdAt?: string
  resolvedAt?: string
  creatorUsername?: string
  requesterUsername?: string
  accountHolderName?: string
  accountNumber?: string
  bankName?: string
  creatorNote?: string
  requesterNote?: string
  transferDate?: string
  transferSlipUrl?: string
}

export function prizeLine(a: PrizeAward): string {
  if (!a || typeof a !== 'object') return 'รางวัล'
  const cat = CAT_LABEL[String(a.prizeCategory || '')] || 'รางวัล'
  const title = String(a.prizeTitle || '').trim()
  const val = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(' ').trim()
  if (title && val) return `${title} (${cat}) — ${val}`
  if (title) return `${title} (${cat})`
  if (val) return `${cat} — ${val}`
  return cat
}

export function formatWonAt(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

export function parseCashBaht(a: PrizeAward): number {
  if (String(a.prizeCategory) !== 'cash') return 0
  const raw = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(' ')
  const m = String(raw).replace(/,/g, '').match(/[\d]+(?:\.[\d]+)?/)
  if (!m) return 0
  const n = parseFloat(m[0])
  return Number.isFinite(n) ? n : 0
}

export function formatBaht(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  if (Number.isInteger(n)) return n.toLocaleString('th-TH')
  return n.toLocaleString('th-TH', { maximumFractionDigits: 2 })
}

export function cashPrizeFulfillmentMode(a: PrizeAward): 'pickup' | 'transfer' {
  const m = String(a.prizeFulfillmentMode || '').toLowerCase()
  return m === 'pickup' ? 'pickup' : 'transfer'
}

export function creatorCashAllPickup(cashItems: PrizeAward[]): boolean {
  if (!Array.isArray(cashItems) || cashItems.length === 0) return false
  return cashItems.every((a) => cashPrizeFulfillmentMode(a) === 'pickup')
}

export function cashDeliveryLabelThai(a: PrizeAward): string {
  if (!a || String(a.prizeCategory) !== 'cash') return '—'
  return cashPrizeFulfillmentMode(a) === 'pickup' ? 'มารับเอง' : 'โอนรางวัลให้'
}

export function itemEffectiveFulfillmentMode(a: PrizeAward): 'pickup' | 'ship' | '' {
  const im = String(a.itemFulfillmentMode || '').toLowerCase()
  if (im === 'pickup' || im === 'ship') return im
  const p = String(a.prizeFulfillmentMode || '').toLowerCase()
  if (p === 'pickup' || p === 'ship') return p
  return ''
}

export function itemReceiptMethodLabelThai(a: PrizeAward): string {
  const eff = itemEffectiveFulfillmentMode(a)
  if (eff === 'pickup') return 'มารับเอง'
  if (eff === 'ship') return 'จัดส่งตามที่อยู่'
  return 'รอผู้สร้างกำหนดวิธีรับ'
}

export function lineContactHref(raw: string | undefined): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  const id = s.replace(/^@+/, '').trim()
  if (!id) return null
  return `https://line.me/ti/p/~${id}`
}

export function displayGameCode(a: PrizeAward): string {
  const c = a.gameCode != null ? String(a.gameCode).trim() : ''
  if (c) return c
  const id = String(a.gameId || '').replace(/-/g, '')
  if (id.length >= 8) return `…${id.slice(-8)}`
  return a.gameId ? String(a.gameId).slice(0, 8) + '…' : '—'
}

export function itemStatusLabel(v: string | undefined): string {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'ready_pickup') return 'ผู้สร้างนัดรับเอง'
  if (s === 'shipped') return 'ผู้สร้างจัดส่งแล้ว'
  if (s === 'completed') return 'รับของเรียบร้อย'
  return 'รอผู้สร้างกำหนดวิธีรับ'
}

export function itemUnitsPerWin(a: PrizeAward): number {
  const raw = [a.prizeValueText, a.prizeUnit].filter(Boolean).join(' ')
  const m = String(raw).replace(/,/g, '').match(/[\d]+(?:\.[\d]+)?/)
  if (!m) return 1
  const n = parseFloat(m[0])
  return Number.isFinite(n) && n > 0 ? n : 1
}

export interface ItemPrizeGroup {
  groupKey: string
  creatorUsername: string
  items: PrizeAward[]
}

export function groupItemAwardsByCreatorAndPrize(itemAwards: PrizeAward[]): ItemPrizeGroup[] {
  const map = new Map<string, ItemPrizeGroup>()
  for (const a of itemAwards) {
    const cu = (a.creatorUsername || '').trim().toLowerCase() || '_unknown'
    const pt = (a.prizeTitle || '').trim()
    const pv = (a.prizeValueText || '').trim()
    const pu = (a.prizeUnit || '').trim()
    const key = `${cu}||${pt}||${pv}||${pu}`
    if (!map.has(key)) {
      map.set(key, { groupKey: key, creatorUsername: (a.creatorUsername || '').trim(), items: [] })
    }
    map.get(key)!.items.push(a)
  }
  const groups = [...map.values()]
  for (const g of groups) {
    g.items.sort((x, y) => new Date(y.wonAt || 0).getTime() - new Date(x.wonAt || 0).getTime())
  }
  groups.sort((a, b) => {
    const ta = a.items[0]?.wonAt ? new Date(a.items[0].wonAt!).getTime() : 0
    const tb = b.items[0]?.wonAt ? new Date(b.items[0].wonAt!).getTime() : 0
    return tb - ta
  })
  return groups
}

export interface CreatorAwardGroup {
  creatorKey: string
  creatorUsername: string
  items: PrizeAward[]
}

export function groupAwardsByCreator(list: PrizeAward[]): CreatorAwardGroup[] {
  const map = new Map<string, CreatorAwardGroup>()
  for (const a of list) {
    const key = (a.creatorUsername || '').trim() || '_unknown'
    if (!map.has(key)) {
      map.set(key, { creatorKey: key, creatorUsername: (a.creatorUsername || '').trim(), items: [] })
    }
    map.get(key)!.items.push(a)
  }
  const groups = [...map.values()]
  for (const g of groups) {
    g.items.sort((x, y) => new Date(y.wonAt || 0).getTime() - new Date(x.wonAt || 0).getTime())
  }
  groups.sort((a, b) => {
    const ta = a.items[0]?.wonAt ? new Date(a.items[0].wonAt!).getTime() : 0
    const tb = b.items[0]?.wonAt ? new Date(b.items[0].wonAt!).getTime() : 0
    return tb - ta
  })
  return groups
}

function eventTimeMs(iso: string | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

export type LedgerRow =
  | {
      kind: 'win'
      key: string
      award: PrizeAward
      cashAmt: number | null
      runningCash: number
      atLabel: string | undefined
    }
  | {
      kind: 'withdraw'
      key: string
      withdrawal: PrizeWithdrawalRow
      cashAmt: number
      runningCash: number
      atLabel: string | undefined
    }

export function buildMergedLedgerRows(
  items: PrizeAward[],
  withdrawalsForCreator: PrizeWithdrawalRow[]
): LedgerRow[] {
  const wds = Array.isArray(withdrawalsForCreator) ? withdrawalsForCreator : []
  const approved = wds.filter((w) => String(w.status) === 'approved')
  const events: Array<
    | { kind: 'win'; atMs: number; award: PrizeAward }
    | { kind: 'withdraw'; atMs: number; withdrawal: PrizeWithdrawalRow }
  > = []

  for (const a of items) {
    events.push({ kind: 'win', atMs: eventTimeMs(a.wonAt), award: a })
  }
  for (const w of approved) {
    const at = w.resolvedAt || w.createdAt
    events.push({ kind: 'withdraw', atMs: eventTimeMs(at), withdrawal: w })
  }

  events.sort((x, y) => {
    if (x.atMs !== y.atMs) return x.atMs - y.atMs
    if (x.kind !== y.kind) return x.kind === 'win' ? -1 : 1
    return 0
  })

  let run = 0
  return events.map((e) => {
    if (e.kind === 'win') {
      const a = e.award
      const cashAmt = String(a.prizeCategory) === 'cash' ? parseCashBaht(a) : 0
      if (String(a.prizeCategory) === 'cash') run += cashAmt
      return {
        kind: 'win' as const,
        key: `win-${a.id}`,
        award: a,
        cashAmt: String(a.prizeCategory) === 'cash' ? cashAmt : null,
        runningCash: run,
        atLabel: a.wonAt
      }
    }
    const w = e.withdrawal
    const amt = Math.max(0, Math.floor(Number(w.amountThb) || 0))
    run -= amt
    return {
      kind: 'withdraw' as const,
      key: `wd-${w.id}`,
      withdrawal: w,
      cashAmt: -amt,
      runningCash: run,
      atLabel: w.resolvedAt || w.createdAt
    }
  })
}

export function sumPendingWithdrawalsBaht(withdrawalsForCreator: PrizeWithdrawalRow[]): number {
  const wds = Array.isArray(withdrawalsForCreator) ? withdrawalsForCreator : []
  return wds
    .filter((w) => String(w.status) === 'pending')
    .reduce((s, w) => s + Math.max(0, Math.floor(Number(w.amountThb) || 0)), 0)
}

export function withdrawalStatusThai(s: string | undefined): string {
  if (s === 'pending') return 'รออนุมัติ'
  if (s === 'approved') return 'อนุมัติแล้ว'
  if (s === 'rejected') return 'ปฏิเสธ'
  if (s === 'cancelled') return 'ยกเลิกแล้ว'
  return s || '—'
}
