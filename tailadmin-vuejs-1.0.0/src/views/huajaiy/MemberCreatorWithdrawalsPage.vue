<template>
  <admin-layout>
    <PageBreadcrumb page-title="คำขอรับรางวัล" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
    >
      <div v-if="!token" class="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="font-medium text-amber-950 dark:text-amber-100">ต้องเข้าสู่ระบบ</p>
        <a href="/login" target="_parent" rel="noopener noreferrer" class="mt-2 inline-block font-semibold text-rose-600 dark:text-rose-400">เข้าสู่ระบบ</a>
      </div>

      <template v-else>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">คำขอถอนรางวัลถึงฉัน</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              โอนเงินแล้วกดอนุมัติ — ระบุ<strong>วันที่โอน</strong>หรือ<strong>แนบสลิป</strong> (หรือทั้งคู่) เพื่อให้ผู้ขอถอนเห็นในรายละเอียด
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            :disabled="loading"
            @click="load"
          >
            {{ loading ? 'กำลังโหลด…' : 'รีเฟรช' }}
          </button>
        </div>

        <p v-if="err" class="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">{{ err }}</p>

        <details class="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <summary class="cursor-pointer list-none px-3 py-2 marker:hidden [&::-webkit-details-marker]:hidden">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-white/90">ประวัติผู้เล่นที่ได้รับรางวัลจากเกมของฉัน</h4>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">คลิกเพื่อขยายรายการว่าใครเล่นแล้วได้รับรางวัลอะไรในแต่ละเกม</p>
          </summary>
          <div class="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
            <p v-if="awardRows.length === 0" class="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีผู้ได้รับรางวัลจากเกมของคุณ
            </p>
            <table v-else class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th class="px-3 py-2.5">เมื่อ</th>
                  <th class="px-3 py-2.5">เกม</th>
                  <th class="px-3 py-2.5">ผู้เล่น</th>
                  <th class="px-3 py-2.5">รางวัล</th>
                  <th class="px-3 py-2.5">จัดส่งรางวัลสิ่งของ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="a in awardRows" :key="String(a.id)">
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-700 dark:text-gray-300">{{ formatDate(a.wonAt) }}</td>
                  <td class="px-3 py-2.5">
                    <div class="font-medium text-gray-800 dark:text-white">{{ a.gameTitle || 'เกม' }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      ชุดที่ {{ Math.max(0, Math.floor(Number(a.setIndex)) || 0) + 1 }}
                      {{ a.gameCode ? ` · ${a.gameCode}` : '' }}
                    </div>
                  </td>
                  <td class="px-3 py-2.5">
                    <div class="font-medium text-gray-800 dark:text-white">
                      @{{ String(a.winnerUsername || '').replace(/^@+/, '') }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ playerName(a) }}</div>
                  </td>
                  <td class="px-3 py-2.5 text-gray-700 dark:text-gray-300">{{ prizeBits(a) }}</td>
                  <td class="px-3 py-2.5">
                    <span v-if="String(a.prizeCategory) !== 'item'" class="text-sm text-gray-400">—</span>
                    <div v-else class="space-y-2">
                      <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ itemStatusLabelVue(a.itemFulfillmentStatus) }}</p>
                      <p
                        v-if="String(a.prizeFulfillmentMode) === 'pickup' && a.winnerPickupAckAt"
                        class="text-sm font-semibold text-emerald-800 dark:text-emerald-300"
                      >
                        ผู้เล่นกดรับรางวัล (มารับเอง): {{ formatDate(a.winnerPickupAckAt) }}
                      </p>
                      <div class="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          class="rounded border border-gray-200 px-2 py-1 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
                          :disabled="itemBusyId === String(a.id)"
                          @click="resolveItem(a, 'pickup', 'ready_pickup')"
                        >
                          นัดรับเอง
                        </button>
                        <button
                          type="button"
                          class="rounded border border-rose-300 px-2 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          :disabled="itemBusyId === String(a.id)"
                          @click="resolveItem(a, 'ship', 'shipped')"
                        >
                          ส่งตามที่อยู่
                        </button>
                        <button
                          type="button"
                          class="rounded border border-emerald-300 px-2 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          :disabled="itemBusyId === String(a.id)"
                          @click="
                            resolveItem(
                              a,
                              String(a.itemFulfillmentMode) === 'pickup' ? 'pickup' : 'ship',
                              'completed'
                            )
                          "
                        >
                          รับของแล้ว
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <p v-if="loading && rows.length === 0" class="text-sm text-gray-500 dark:text-gray-400">กำลังโหลดรายการ…</p>
        <p
          v-else-if="rows.length === 0"
          class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
        >
          ยังไม่มีคำขอถอนรางวัล
        </p>
        <div v-else class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th class="px-3 py-2.5">เมื่อ</th>
                <th class="px-3 py-2.5">สมาชิก</th>
                <th class="px-3 py-2.5 text-right">จำนวน</th>
                <th class="px-3 py-2.5">บัญชีรับเงิน</th>
                <th class="px-3 py-2.5">สถานะ</th>
                <th class="px-3 py-2.5">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <template v-for="r in rows" :key="String(r.id)">
                <tr class="align-top">
                  <td class="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">{{ formatDate(r.createdAt) }}</td>
                  <td class="px-3 py-3">
                    <span class="font-medium text-gray-800 dark:text-white">
                      @{{ String(r.requesterUsername || '').replace(/^@+/, '') }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-right font-mono tabular-nums font-semibold text-emerald-800 dark:text-emerald-400">
                    {{ formatBaht(r.amountThb) }} ฿
                  </td>
                  <td class="max-w-[220px] px-3 py-3 text-gray-700 dark:text-gray-300">
                    <div class="text-sm text-gray-500 dark:text-gray-400">ชื่อบัญชี</div>
                    <div class="font-medium">{{ r.accountHolderName || '—' }}</div>
                    <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">เลขบัญชี / ธนาคาร</div>
                    <div class="font-mono text-sm">{{ r.accountNumber || '—' }}</div>
                    <div>{{ r.bankName || '—' }}</div>
                    <div
                      v-if="r.requesterNote"
                      class="mt-2 rounded-lg border border-sky-100 bg-sky-50/80 px-2 py-1.5 text-xs leading-relaxed text-gray-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-gray-200"
                    >
                      <span class="font-semibold text-gray-500 dark:text-gray-400">หมายเหตุผู้ขอ:</span>
                      {{ r.requesterNote }}
                    </div>
                  </td>
                  <td class="px-3 py-3">
                    <span :class="wdStatusBadge(r.status)">{{ wdStatusText(r.status) }}</span>
                    <div v-if="r.resolvedAt" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(r.resolvedAt) }}
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-3 py-3 text-gray-600 dark:text-gray-400">
                    {{ r.status === 'pending' ? 'ดูด้านล่าง' : '—' }}
                  </td>
                </tr>
                <tr v-if="r.status === 'pending'" class="bg-gray-50/95 dark:bg-gray-800/50">
                  <td colspan="6" class="px-3 py-4">
                    <div class="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                      <p class="text-sm font-semibold text-gray-800 dark:text-white">ยืนยันการโอนให้สมาชิก (อย่างใดอย่างหนึ่งหรือทั้งคู่)</p>
                      <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        ระบุวันที่โอน หรืออัปโหลดสลิป — ผู้ขอถอนจะเห็นในหน้ารายละเอียด
                      </p>
                      <div class="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" :for="`wd-date-${r.id}`">วันที่โอนเงิน</label>
                          <input
                            :id="`wd-date-${r.id}`"
                            v-model="transferDateById[String(r.id)]"
                            type="date"
                            class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-600 dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" :for="`wd-slip-${r.id}`">แนบสลิปโอน</label>
                          <input
                            :id="`wd-slip-${r.id}`"
                            type="file"
                            accept="image/*"
                            class="mt-1 block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 dark:file:bg-gray-700"
                            @change="onSlipChange(String(r.id), $event)"
                          />
                        </div>
                      </div>
                      <div class="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                        <button
                          type="button"
                          class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                          :disabled="busyId === r.id"
                          @click="resolveApprove(String(r.id))"
                        >
                          {{ busyId === r.id ? 'กำลังบันทึก…' : 'อนุมัติ (จ่ายแล้ว)' }}
                        </button>
                        <button
                          type="button"
                          class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          :disabled="busyId === r.id"
                          @click="resolveReject(String(r.id))"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { uploadSlipImageFile } from '@/utils/memberSlipUpload'
import type { PrizeWithdrawalRow } from '@/utils/memberPrizeUtils'
import type { IncomingAward } from '@/utils/memberSectionApi'
import {
  apiGetIncomingPrizeAwards,
  apiGetIncomingPrizeWithdrawals,
  apiResolveIncomingItemAward,
  apiResolvePrizeWithdrawal,
  huajaiyMemberToken
} from '@/utils/memberSectionApi'

const token = ref<string | null>(null)
const rows = ref<PrizeWithdrawalRow[]>([])
const awardRows = ref<IncomingAward[]>([])
const loading = ref(false)
const err = ref('')
const busyId = ref<string | null>(null)
const itemBusyId = ref<string | null>(null)
const transferDateById = reactive<Record<string, string>>({})
const slipFileById = reactive<Record<string, File | undefined>>({})

function formatBaht(n: number | string | undefined): string {
  if (!Number.isFinite(Number(n))) return '0'
  return Math.floor(Number(n)).toLocaleString('th-TH')
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function itemStatusLabelVue(v: string | undefined): string {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'ready_pickup') return 'พร้อมให้รับเอง'
  if (s === 'shipped') return 'จัดส่งแล้ว'
  if (s === 'completed') return 'รับของเรียบร้อย'
  return 'รอผู้สร้างกำหนดวิธีรับ'
}

function playerName(a: IncomingAward): string {
  const player = [a.winnerFirstName, a.winnerLastName].filter(Boolean).join(' ').trim()
  return player || '—'
}

function prizeBits(a: IncomingAward): string {
  const bits = [a.prizeTitle, a.prizeValueText, a.prizeUnit].filter(Boolean)
  return bits.join(' ') || 'รางวัล'
}

function wdStatusText(status: string | undefined): string {
  if (status === 'pending') return 'รออนุมัติ'
  if (status === 'approved') return 'อนุมัติแล้ว'
  if (status === 'rejected') return 'ปฏิเสธ'
  if (status === 'cancelled') return 'ยกเลิกโดยผู้ขอ'
  return String(status || '—')
}

function wdStatusBadge(status: string | undefined): string {
  const base = 'rounded-full px-2 py-0.5 text-sm font-semibold ring-1'
  if (status === 'pending')
    return `${base} bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800`
  if (status === 'approved')
    return `${base} bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800`
  if (status === 'cancelled')
    return `${base} bg-violet-100 text-violet-950 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-800`
  return `${base} bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600`
}

function onSlipChange(id: string, e: Event) {
  const input = e.target as HTMLInputElement
  slipFileById[id] = input.files?.[0]
}

async function load() {
  const t = huajaiyMemberToken()
  token.value = t
  if (!t) {
    rows.value = []
    awardRows.value = []
    return
  }
  loading.value = true
  err.value = ''
  try {
    const [wdData, awardData] = await Promise.all([
      apiGetIncomingPrizeWithdrawals(t),
      apiGetIncomingPrizeAwards(t, 2000)
    ])
    rows.value = wdData
    awardRows.value = awardData
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
    rows.value = []
    awardRows.value = []
  } finally {
    loading.value = false
  }
}

async function resolveReject(id: string) {
  const t = huajaiyMemberToken()
  if (!t) return
  busyId.value = id
  err.value = ''
  try {
    await apiResolvePrizeWithdrawal(t, id, { action: 'reject' })
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busyId.value = null
  }
}

async function resolveApprove(id: string) {
  const t = huajaiyMemberToken()
  if (!t) return
  busyId.value = id
  err.value = ''
  try {
    let transferSlipUrl: string | undefined
    const file = slipFileById[id]
    if (file) {
      transferSlipUrl = await uploadSlipImageFile(file)
    }
    const td = transferDateById[id]
    const transferDate = td && String(td).trim() ? String(td).trim().slice(0, 10) : undefined
    await apiResolvePrizeWithdrawal(t, id, {
      action: 'approve',
      transferSlipUrl,
      transferDate
    })
    delete slipFileById[id]
    delete transferDateById[id]
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busyId.value = null
  }
}

async function resolveItem(award: IncomingAward, mode: string, status: string) {
  const t = huajaiyMemberToken()
  if (!t || !award?.id) return
  let trackingCode = ''
  if (mode === 'ship' && status === 'shipped') {
    trackingCode = window.prompt('กรอกเลขพัสดุ (ถ้ามี)', '') || ''
  }
  itemBusyId.value = String(award.id)
  err.value = ''
  try {
    await apiResolveIncomingItemAward(t, String(award.id), { mode, status, trackingCode })
    await load()
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    itemBusyId.value = null
  }
}

onMounted(() => {
  void load()
})
</script>
