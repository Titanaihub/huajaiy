<template>
  <admin-layout>
    <PageBreadcrumb page-title="หัวใจแดงห้องเกม" />

    <div class="space-y-6">
      <div v-if="authLoading" class="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด…</div>
      <div
        v-else-if="!user"
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
      >
        กรุณาเข้าสู่ระบบเพื่อดูหัวใจ
      </div>
      <template v-else>
        <div
          v-if="loadErr"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {{ loadErr }}
        </div>

        <div
          v-if="dbRequired"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          ระบบยังไม่เชื่อมฐานข้อมูล — ไม่มีประวัติแดงห้องให้แสดง
        </div>

        <section
          v-for="block in roomBlocks"
          :key="block.creatorId"
          class="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-sm dark:border-gray-700 dark:from-gray-900 dark:to-gray-900/80"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80"
          >
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                ห้อง @{{ block.displayUsername }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-gray-400">
                ยอดแดงห้องปัจจุบัน
                <span class="font-semibold tabular-nums text-red-600 dark:text-red-400">{{
                  fmt(block.currentBalance)
                }}</span>
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-rose-500/50 dark:hover:bg-gray-700 dark:hover:text-rose-200"
              @click="toggleRoomDetail(block.creatorId)"
            >
              {{ roomDetailOpen[block.creatorId] ? 'ซ่อนรายละเอียด' : 'รายละเอียด' }}
            </button>
          </div>

          <template v-if="roomDetailOpen[block.creatorId]">
            <div
              v-if="block.rows.length === 0"
              class="px-4 py-8 text-center text-sm text-slate-500"
            >
              ยังไม่มีประวัติในช่วงที่โหลด (หรือยังไม่เคยแลกรหัส/เล่นเกมของห้องนี้)
            </div>
            <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr class="border-b border-slate-200 bg-white text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">วันที่</th>
                  <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wide">รายการ</th>
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">จำนวน</th>
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in block.rows"
                  :key="row.key"
                  :class="i % 2 === 1 ? 'bg-slate-50/60 dark:bg-gray-800/40' : ''"
                  class="border-b border-slate-100 dark:border-gray-800"
                >
                  <td class="whitespace-nowrap px-4 py-2.5 align-top tabular-nums text-slate-600 dark:text-gray-300">
                    {{ row.when }}
                  </td>
                  <td class="max-w-md px-4 py-2.5 align-top text-slate-800 dark:text-gray-100">
                    <span class="font-medium">{{ row.itemLine }}</span>
                    <a
                      v-if="row.gameId"
                      class="mt-1 block text-xs font-semibold text-rose-600 hover:text-rose-800 dark:text-rose-400"
                      :href="gameHref(row.gameId)"
                      target="_parent"
                      rel="noopener noreferrer"
                      >เปิดหน้าเกม</a
                    >
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 align-top">
                    <span
                      class="font-semibold tabular-nums"
                      :class="
                        row.delta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.delta < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500'
                      "
                      >{{ row.delta > 0 ? '+' : '' }}{{ fmt(Math.abs(row.delta)) }}</span
                    >
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 align-top font-semibold tabular-nums text-slate-900 dark:text-white">
                    {{ fmt(row.balanceAfter) }}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </template>
        </section>

        <p
          v-if="roomBlocks.length === 0 && !loadErr && !dbRequired"
          class="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          ยังไม่มีห้องแดง — แลกรหัสจากเจ้าของห้องเพื่อรับแดงห้อง
        </p>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  apiGetMyHeartLedger,
  apiGetMyRoomRedRedemptions,
  huajaiyMemberToken,
  type HeartLedgerEntry,
  type RoomRedRedemptionRow,
} from '@/utils/memberSectionApi'
import { useHuajaiyMemberProfile } from '@/composables/useHuajaiyMemberProfile'

const { user, loading: authLoading, load: loadProfile } = useHuajaiyMemberProfile()

const loadErr = ref('')
const dbRequired = ref(false)
const ledger = ref<HeartLedgerEntry[]>([])
const redemptions = ref<RoomRedRedemptionRow[]>([])
const roomDetailOpen = reactive<Record<string, boolean>>({})

function toggleRoomDetail(creatorId: string) {
  roomDetailOpen[creatorId] = !roomDetailOpen[creatorId]
}

interface RawEv {
  id: string
  ts: number
  typeOrder: number
  creatorId: string
  delta: number
  itemLine: string
  gameId?: string | null
}

function fmt(n: number) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('th-TH')
}

function parseTs(iso: string | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
}

function normUser(u: string | undefined | null) {
  return u != null ? String(u).trim().replace(/^@+/, '').toLowerCase() : ''
}

function gameHref(id: string) {
  const g = encodeURIComponent(String(id).trim())
  return `/game/${g}`
}

/** ชื่อแสดงใน ledger — ใช้ meta.gameTitle ก่อน แล้วค่อยดึงจาก label รูป เริ่มเล่นเกม「…」 */
function gameDisplayNameFromEntry(e: HeartLedgerEntry, m: Record<string, unknown> | null): string {
  const fromMeta = m?.gameTitle != null ? String(m.gameTitle).trim() : ''
  if (fromMeta) return fromMeta
  const lab = e.label != null ? String(e.label).trim() : ''
  const br = lab.match(/เริ่มเล่นเกม「\s*(.+?)\s*」/)
  if (br) return br[1].trim()
  if (lab) return lab
  return '—'
}

/** รหัสเกมสั้น (YYYYMMDD+ลำดับ) จาก meta — ไม่โชว์ UUID; รายการเก่าไม่มีใน meta จะเป็น — */
function gameCodeFromMeta(m: Record<string, unknown> | null): string {
  const a = m?.gameCode != null ? String(m.gameCode).trim() : ''
  if (a) return a
  const b = m?.game_code != null ? String(m.game_code).trim() : ''
  if (b) return b
  return '—'
}

function roomRowsFromUser() {
  const u = user.value
  const arr = Array.isArray(u?.roomGiftRed) ? u!.roomGiftRed! : []
  return arr
    .map((x: Record<string, unknown>) => ({
      creatorId: x.creatorId != null ? String(x.creatorId) : '',
      creatorUsername: x.creatorUsername != null ? String(x.creatorUsername) : '',
      balance: Math.max(0, Math.floor(Number(x.balance) || 0)),
    }))
    .filter((r) => r.creatorId)
}

function usernameForCreator(cid: string, rowsMeta: ReturnType<typeof roomRowsFromUser>) {
  const r = redemptions.value.find((x) => String(x.creatorId) === cid)
  const u = r?.creatorUsername != null ? normUser(r.creatorUsername) : ''
  if (u) return u
  const row = rowsMeta.find((x) => x.creatorId === cid)
  if (row?.creatorUsername) return normUser(row.creatorUsername)
  return cid.slice(0, 8)
}

function collectRawEvents(): RawEv[] {
  const out: RawEv[] = []

  for (const r of redemptions.value) {
    const cid = r.creatorId != null ? String(r.creatorId) : ''
    const amt = Math.max(0, Math.floor(Number(r.redAmount) || 0))
    if (!cid || amt <= 0) continue
    const code = r.code != null ? String(r.code).trim().toUpperCase() : ''
    const cu = normUser(r.creatorUsername)
    out.push({
      id: `redeem-${r.id}`,
      ts: parseTs(r.redeemedAt),
      typeOrder: 0,
      creatorId: cid,
      delta: amt,
      itemLine: `แลกรหัส ${code || '—'} · รับแดงห้อง${cu ? ` จาก @${cu}` : ''}`,
    })
  }

  for (const e of ledger.value) {
    if (e.kind !== 'game_start') continue
    const m = e.meta && typeof e.meta === 'object' && !Array.isArray(e.meta) ? e.meta : null
    const gifts = m?.redFromRoomGifts
    if (!gifts || typeof gifts !== 'object' || Array.isArray(gifts)) continue
    const gid = m.gameId != null ? String(m.gameId).trim() : null
    const gName = gameDisplayNameFromEntry(e, m)
    const gCode = gameCodeFromMeta(m)
    const itemLine = `ชื่อเกม ${gName} · รหัสเกม ${gCode}`
    for (const [cidRaw, v] of Object.entries(gifts as Record<string, unknown>)) {
      const cid = String(cidRaw)
      const deducted = Math.max(0, Math.floor(Number(v) || 0))
      if (!cid || deducted <= 0) continue
      out.push({
        id: `game-${e.id}-${cid}`,
        ts: parseTs(e.createdAt),
        typeOrder: 1,
        creatorId: cid,
        delta: -deducted,
        itemLine,
        gameId: gid,
      })
    }
  }

  return out
}

interface DisplayRow {
  key: string
  when: string
  itemLine: string
  delta: number
  balanceAfter: number
  gameId?: string | null
}

interface RoomBlock {
  creatorId: string
  displayUsername: string
  currentBalance: number
  rows: DisplayRow[]
}

const roomBlocks = computed((): RoomBlock[] => {
  const rowsMeta = roomRowsFromUser()
  const byId = new Map<string, { username: string; balance: number }>()
  for (const r of rowsMeta) {
    byId.set(r.creatorId, {
      username: normUser(r.creatorUsername) || r.creatorId.slice(0, 8),
      balance: r.balance,
    })
  }

  const raw = collectRawEvents()
  const byCreator = new Map<string, RawEv[]>()
  for (const ev of raw) {
    const list = byCreator.get(ev.creatorId) || []
    list.push(ev)
    byCreator.set(ev.creatorId, list)
  }

  for (const [cid] of byCreator) {
    if (!byId.has(cid)) {
      byId.set(cid, { username: usernameForCreator(cid, rowsMeta), balance: 0 })
    }
  }

  const creatorIds = [...new Set([...byId.keys(), ...byCreator.keys()])].sort()

  const blocks: RoomBlock[] = []
  for (const cid of creatorIds) {
    const meta = byId.get(cid) || { username: cid.slice(0, 8), balance: 0 }
    const evs = (byCreator.get(cid) || []).slice().sort((a, b) => {
      if (a.ts !== b.ts) return a.ts - b.ts
      if (a.typeOrder !== b.typeOrder) return a.typeOrder - b.typeOrder
      return a.id.localeCompare(b.id)
    })

    let bal = 0
    const chronological: DisplayRow[] = []
    for (const ev of evs) {
      bal += ev.delta
      if (bal < 0) bal = 0
      const when = ev.ts
        ? new Date(ev.ts).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
        : '—'
      chronological.push({
        key: ev.id,
        when,
        itemLine: ev.itemLine,
        delta: ev.delta,
        balanceAfter: bal,
        gameId: ev.gameId,
      })
    }

    const rows = chronological.reverse()

    blocks.push({
      creatorId: cid,
      displayUsername: meta.username,
      currentBalance: meta.balance,
      rows,
    })
  }

  return blocks
})

async function loadHistory() {
  loadErr.value = ''
  dbRequired.value = false
  const token = huajaiyMemberToken()
  if (!token) return
  try {
    const [L, R] = await Promise.all([
      apiGetMyHeartLedger(token, { limit: 400, offset: 0 }),
      apiGetMyRoomRedRedemptions(token, { limit: 500 }),
    ])
    ledger.value = L.entries
    redemptions.value = R.items
    dbRequired.value = Boolean(L.dbRequired || R.dbRequired)
  } catch (e) {
    loadErr.value = e instanceof Error ? e.message : String(e)
    ledger.value = []
    redemptions.value = []
  }
}

onMounted(() => {
  void loadProfile()
})

watch(
  () => user.value?.id,
  (id) => {
    if (id) void loadHistory()
  },
  { immediate: true },
)
</script>
