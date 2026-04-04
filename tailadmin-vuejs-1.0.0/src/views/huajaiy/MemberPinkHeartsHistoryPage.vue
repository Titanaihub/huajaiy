<template>
  <admin-layout>
    <PageBreadcrumb page-title="ประวัติหัวใจชมพู" />

    <div class="space-y-6">
      <div v-if="authLoading" class="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด…</div>
      <div
        v-else-if="!user"
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
      >
        กรุณาเข้าสู่ระบบเพื่อดูประวัติ
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
          ระบบยังไม่เชื่อมฐานข้อมูล — ไม่มีประวัติหัวใจชมพูให้แสดง
        </div>

        <div
          v-else
          class="overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-b from-white to-pink-50/40 shadow-sm dark:border-pink-900/30 dark:from-gray-900 dark:to-gray-900/80"
        >
          <div class="border-b border-pink-100/80 bg-pink-50/60 px-4 py-3 dark:border-pink-900/20 dark:bg-pink-950/20">
            <p class="text-sm text-slate-600 dark:text-gray-400">
              แสดงเฉพาะรายการที่<strong class="text-pink-700 dark:text-pink-300">หัวใจชมพู</strong>มีการเพิ่มหรือหัก
              (เช่น ได้จากสั่งซื้อ / หักเล่นเกม)
            </p>
          </div>
          <div v-if="pinkRows.length === 0" class="px-4 py-10 text-center text-sm text-slate-500 dark:text-gray-400">
            ยังไม่มีประวัติชมพูในช่วงที่โหลด
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr
                  class="border-b border-slate-200 bg-white text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                >
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                    วันที่
                  </th>
                  <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wide">รายการ</th>
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                    จำนวน (ชมพู)
                  </th>
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
                    คงเหลือ (ชมพู)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in pinkRows"
                  :key="row.key"
                  :class="i % 2 === 1 ? 'bg-slate-50/60 dark:bg-gray-800/40' : ''"
                  class="border-b border-slate-100 dark:border-gray-800"
                >
                  <td
                    class="whitespace-nowrap px-4 py-2.5 align-top tabular-nums text-slate-600 dark:text-gray-300"
                  >
                    {{ row.when }}
                  </td>
                  <td class="max-w-lg px-4 py-2.5 align-top text-slate-800 dark:text-gray-100">
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
                        row.pinkDelta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.pinkDelta < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500'
                      "
                      >{{ row.pinkDelta > 0 ? '+' : '' }}{{ fmt(Math.abs(row.pinkDelta)) }}</span
                    >
                  </td>
                  <td
                    class="whitespace-nowrap px-4 py-2.5 align-top font-semibold tabular-nums text-pink-700 dark:text-pink-300"
                  >
                    {{ fmt(row.pinkAfter) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  apiGetMyHeartLedger,
  huajaiyMemberToken,
  type HeartLedgerEntry,
} from '@/utils/memberSectionApi'
import { useHuajaiyMemberProfile } from '@/composables/useHuajaiyMemberProfile'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const { user, loading: authLoading, load: loadProfile } = useHuajaiyMemberProfile()

const loadErr = ref('')
const dbRequired = ref(false)
const ledger = ref<HeartLedgerEntry[]>([])

function fmt(n: number) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('th-TH')
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

function gameHref(id: string) {
  return `/game/${encodeURIComponent(String(id).trim())}`
}

function metaAsRecord(e: HeartLedgerEntry): Record<string, unknown> | null {
  const m = e.meta
  if (m == null) return null
  if (typeof m === 'string') {
    try {
      const o = JSON.parse(m) as unknown
      return o && typeof o === 'object' && !Array.isArray(o)
        ? (o as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof m === 'object' && !Array.isArray(m)) return m as Record<string, unknown>
  return null
}

function gameDisplayNameFromEntry(e: HeartLedgerEntry, m: Record<string, unknown> | null): string {
  const fromMeta = m?.gameTitle != null ? String(m.gameTitle).trim() : ''
  if (fromMeta) return fromMeta
  const lab = e.label != null ? String(e.label).trim() : ''
  const br = lab.match(/เริ่มเล่นเกม「\s*(.+?)\s*」/)
  if (br) return br[1].trim()
  if (lab) return lab
  return '—'
}

function gameCodeFromMeta(m: Record<string, unknown> | null): string {
  if (!m) return '—'
  const a = m.gameCode != null ? String(m.gameCode).trim() : ''
  if (a) return a
  const b = m.game_code != null ? String(m.game_code).trim() : ''
  if (b) return b
  return '—'
}

function prizeStatusSuffixFromMeta(m: Record<string, unknown> | null): string {
  if (!m) return ''
  const oRaw =
    m.roundOutcome != null
      ? String(m.roundOutcome).trim().toLowerCase()
      : m.round_outcome != null
        ? String(m.round_outcome).trim().toLowerCase()
        : ''
  const sum =
    m.roundPrizeSummary != null
      ? String(m.roundPrizeSummary).trim()
      : m.round_prize_summary != null
        ? String(m.round_prize_summary).trim()
        : ''
  if (oRaw === 'won') {
    if (sum) return ` (ได้รับรางวัล — ${sum})`
    return ' (ได้รับรางวัล)'
  }
  if (oRaw === 'lost') {
    if (sum && sum !== 'ไม่ได้รับรางวัล') {
      return ` (ไม่ได้รับรางวัล · ${sum})`
    }
    return ' (ไม่ได้รับรางวัล)'
  }
  return ''
}

function joinMetaList(v: unknown): string {
  if (!Array.isArray(v)) return ''
  return v
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean)
    .join(', ')
}

function buildPinkItemLine(e: HeartLedgerEntry, m: Record<string, unknown> | null): string {
  const kind = e.kind != null ? String(e.kind) : ''

  if (kind === 'game_start' && m) {
    const mode = m.gameMode != null ? String(m.gameMode).trim() : ''
    if (mode === 'central') {
      const gName = gameDisplayNameFromEntry(e, m)
      const gCode = gameCodeFromMeta(m)
      const pinkC = Math.max(0, Math.floor(Number(m.pinkCharged) || 0))
      const base = `เล่นเกมส่วนกลาง · ชื่อเกม ${gName} · รหัสเกม ${gCode}${prizeStatusSuffixFromMeta(m)}`
      if (pinkC > 0) {
        return `${base} · หักชมพู ${fmt(pinkC)}`
      }
      return base
    }
    return String(e.label || '').trim() || 'เริ่มเล่นเกม'
  }

  if (kind === 'marketplace_order' && m) {
    const base = String(e.label || '').trim() || 'ได้รับหัวใจชมพูจากสั่งซื้อ'
    const shops = joinMetaList(m.shopNames)
    const titles = joinMetaList(m.productTitles)
    const parts = [shops && `ร้าน: ${shops}`, titles && `สินค้า: ${titles}`].filter(Boolean)
    return parts.length ? `${base} · ${parts.join(' · ')}` : base
  }

  if (kind === 'heart_purchase_approved' && m) {
    const pkg = m.packageTitle != null ? String(m.packageTitle).trim() : ''
    const base = String(e.label || '').trim() || 'อนุมัติซื้อแพ็กหัวใจ'
    if (pkg) return `${base} · แพ็ก ${pkg}`
    return base
  }

  return String(e.label || '').trim() || kind || 'รายการ'
}

function gameIdForRow(m: Record<string, unknown> | null, kind: string): string | null {
  if (kind !== 'game_start' || !m) return null
  const mode = m.gameMode != null ? String(m.gameMode).trim() : ''
  if (mode !== 'central') return null
  const gid = m.gameId != null ? String(m.gameId).trim() : ''
  return UUID_RE.test(gid) ? gid : null
}

interface PinkRow {
  key: string
  when: string
  itemLine: string
  pinkDelta: number
  pinkAfter: number
  gameId: string | null
}

const pinkRows = computed((): PinkRow[] => {
  const out: PinkRow[] = []
  for (const e of ledger.value) {
    const pd = Math.floor(Number(e.pinkDelta) || 0)
    if (pd === 0) continue
    const m = metaAsRecord(e)
    const kind = e.kind != null ? String(e.kind) : ''
    out.push({
      key: e.id,
      when: formatWhen(e.createdAt),
      itemLine: buildPinkItemLine(e, m),
      pinkDelta: pd,
      pinkAfter: Math.max(0, Math.floor(Number(e.pinkBalanceAfter) || 0)),
      gameId: gameIdForRow(m, kind),
    })
  }
  return out
})

async function loadLedger() {
  loadErr.value = ''
  dbRequired.value = false
  const token = huajaiyMemberToken()
  if (!token) return
  try {
    const L = await apiGetMyHeartLedger(token, { limit: 400, offset: 0 })
    ledger.value = L.entries
    dbRequired.value = Boolean(L.dbRequired)
  } catch (e) {
    loadErr.value = e instanceof Error ? e.message : String(e)
    ledger.value = []
  }
}

onMounted(() => {
  void loadProfile()
})

watch(
  () => user.value?.id,
  (id) => {
    if (id) void loadLedger()
  },
  { immediate: true },
)
</script>
