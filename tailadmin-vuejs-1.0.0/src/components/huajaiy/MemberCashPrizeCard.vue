<template>
  <li
    class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
  >
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table class="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              รางวัลเงินสดจาก
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              เงินรางวัลที่ได้
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              ชนะกี่ครั้ง
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">
              ยอดคงเหลือ
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              รายละเอียด
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-white dark:bg-gray-900/20">
            <td class="px-3 py-3 font-medium text-rose-600 dark:text-rose-400">{{ creatorDisplay }}</td>
            <td class="px-3 py-3 align-middle">
              <span v-if="cashItems.length > 0" class="font-bold tabular-nums text-gray-800 dark:text-white"
                >{{ formatBaht(cashTotal) }} บาท</span
              >
              <span v-else class="text-gray-500 dark:text-gray-400">0 บาท</span>
            </td>
            <td class="px-3 py-3 align-middle tabular-nums text-gray-700 dark:text-gray-300">
              {{ winCount }} ครั้ง
              <span v-if="approvedWithdrawCount > 0" class="mt-0.5 block text-sm font-normal">
                ถอน {{ approvedWithdrawCount }} ครั้ง
              </span>
            </td>
            <td class="px-3 py-3 text-center align-middle">
              <span class="inline-block font-bold tabular-nums text-emerald-800 dark:text-emerald-400">
                {{ formatBaht(finalCashBalance) }} บาท
              </span>
            </td>
            <td class="px-3 py-3 align-middle">
              <button
                type="button"
                class="text-sm font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 hover:text-rose-700 dark:text-rose-400"
                @click="open = !open"
              >
                {{ open ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="cashItems.length === 0 && winCount > 0" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
      ยังไม่มีรางวัลเงินสดจากผู้สร้างรายนี้ (มีเฉพาะรางวัลประเภทอื่น)
    </p>
    <p v-if="nonCashSummary" class="mt-2 text-sm text-gray-700 dark:text-gray-300">{{ nonCashSummary }}</p>

    <div v-if="open" class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table class="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <th class="whitespace-nowrap px-3 py-2.5">ชื่อผู้สร้างเกม</th>
              <th class="whitespace-nowrap px-3 py-2.5">วันเวลา</th>
              <th class="whitespace-nowrap px-3 py-2.5">รหัสเกม</th>
              <th class="min-w-[140px] px-3 py-2.5">ชื่อเกม</th>
              <th class="whitespace-nowrap px-3 py-2.5">การจ่ายรางวัล</th>
              <th class="whitespace-nowrap px-3 py-2.5">เงินรางวัลที่ได้</th>
              <th class="whitespace-nowrap px-3 py-2.5">ยอดคงเหลือ (รวมเงินสด)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <template v-for="row in detailRows" :key="row.key">
              <tr v-if="row.kind === 'win'" class="bg-white dark:bg-gray-900/10">
                <td class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                  {{ creatorDisplay }}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-600 dark:text-gray-400">
                  {{ formatWonAt(row.award.wonAt) }}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 font-mono text-sm text-gray-600 dark:text-gray-400">
                  {{ displayGameCode(row.award) }}
                </td>
                <td class="px-3 py-2.5 text-gray-700 dark:text-gray-300">{{ row.award.gameTitle }}</td>
                <td class="whitespace-nowrap px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                  {{ cashDeliveryLabelThai(row.award) }}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 tabular-nums">
                  <span v-if="row.cashAmt != null">{{ formatBaht(row.cashAmt) }} บาท</span>
                  <span v-else class="text-gray-600 dark:text-gray-400">{{ prizeLine(row.award) }}</span>
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-gray-800 dark:text-white">
                  {{ formatBaht(row.runningCash) }} บาท
                </td>
              </tr>
              <tr v-else class="bg-rose-50/50 dark:bg-rose-950/20">
                <td class="whitespace-nowrap px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                  {{ creatorDisplay }}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-600 dark:text-gray-400">
                  {{ formatWonAt(row.atLabel) }}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 font-mono text-sm text-gray-400">—</td>
                <td class="px-3 py-2.5 font-medium text-rose-900 dark:text-rose-300">ถอนเงิน</td>
                <td class="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">โอนรางวัลให้</td>
                <td class="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums text-rose-800 dark:text-rose-400">
                  −{{ formatBaht(Math.abs(row.cashAmt)) }} บาท
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums text-gray-800 dark:text-white">
                  {{ formatBaht(row.runningCash) }} บาท
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div
        class="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-gray-700 dark:text-gray-300">
          <span class="font-medium">ยอดเงินสดคงเหลือปัจจุบัน (รวมจากผู้สร้างรายนี้): </span>
          <span class="text-lg font-bold tabular-nums text-emerald-900 dark:text-emerald-300">
            {{ formatBaht(finalCashBalance) }} บาท
          </span>
        </p>
        <a
          v-if="cashAllowsTransfer && finalCashBalance >= MIN_WITHDRAW_BAHT"
          :href="prizeWithdrawHref"
          target="_parent"
          rel="noopener noreferrer"
          class="inline-flex shrink-0 items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          ถอนเงินรางวัล
        </a>
        <p
          v-else-if="cashItems.length > 0 && !cashAllowsTransfer && finalCashBalance > 0"
          class="max-w-md text-sm leading-relaxed text-gray-700 dark:text-gray-300"
        >
          รางวัลเงินสดจากผู้สร้างรายนี้ตั้งเป็น
          <span class="font-semibold">มารับเอง</span> — ติดต่อผู้สร้างเมื่อพร้อมรับเงิน
        </p>
      </div>
      <p v-if="pendingHoldBaht > 0" class="mt-2 text-sm text-amber-800 dark:text-amber-200">
        มีคำขอถอนรอดำเนินการรวม
        <span class="font-semibold tabular-nums">{{ formatBaht(pendingHoldBaht) }} บาท</span>
        (หักจากยอดคงเหลือปัจจุบันด้านบน — ดูรายการและยกเลิกได้ในตารางด้านล่าง)
      </p>
      <p v-if="cashItems.length > 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{
          cashAllowsTransfer
            ? 'ส่งคำขอถอนไปยังผู้สร้างเกม — กรอกจำนวนเงินและบัญชีรับเงิน ระบบจะหักจากยอดถอนได้คงเหลือ (เฉพาะรางวัลที่กติกากำหนดเป็นโอนรางวัลให้)'
            : 'รางวัลเงินสดที่กำหนดมารับเองไม่ใช้ระบบถอนผ่านบัญชี — ติดต่อผู้สร้างโดยตรง'
        }}
      </p>

      <MemberPrizeWithdrawalHistoryTable
        class="!mt-4"
        :withdrawals="withdrawalsForCreator"
        :loading="wdRefreshing"
        :creator-ref-label="String(creatorUsername || '').replace(/^@+/, '')"
        :canceling-id="cancelingId"
        empty-message="ยังไม่มีประวัติการขอถอนกับผู้สร้างท่านนี้"
        @refresh="emit('refresh-withdrawals')"
        @cancel="handleCancelWithdrawal"
      />
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CreatorAwardGroup, PrizeWithdrawalRow } from '@/utils/memberPrizeUtils'
import {
  MIN_WITHDRAW_BAHT,
  CAT_LABEL,
  buildMergedLedgerRows,
  sumPendingWithdrawalsBaht,
  cashDeliveryLabelThai,
  creatorCashAllPickup,
  displayGameCode,
  formatBaht,
  formatWonAt,
  parseCashBaht,
  prizeLine
} from '@/utils/memberPrizeUtils'
import MemberPrizeWithdrawalHistoryTable from './MemberPrizeWithdrawalHistoryTable.vue'
import { apiCancelPrizeWithdrawalRequest, huajaiyMemberToken } from '@/utils/memberSectionApi'

const props = defineProps<{
  group: CreatorAwardGroup
  withdrawalsForCreator: PrizeWithdrawalRow[]
  wdRefreshing: boolean
}>()

const emit = defineEmits<{
  'refresh-withdrawals': []
}>()

const open = ref(false)
const cancelingId = ref<string | null>(null)

const creatorUsername = computed(() => props.group.creatorUsername)
const creatorDisplay = computed(() =>
  creatorUsername.value && creatorUsername.value.length > 0
    ? `@${creatorUsername.value}`
    : 'ไม่ระบุผู้สร้างเกม'
)

const cashItems = computed(() => props.group.items.filter((a) => String(a.prizeCategory) === 'cash'))
const nonCashItems = computed(() => props.group.items.filter((a) => String(a.prizeCategory) !== 'cash'))
const winCount = computed(() => props.group.items.length)

const cashTotal = computed(() => cashItems.value.reduce((s, a) => s + parseCashBaht(a), 0))

const detailRows = computed(() => buildMergedLedgerRows(props.group.items, props.withdrawalsForCreator))
const pendingHoldBaht = computed(() => sumPendingWithdrawalsBaht(props.withdrawalsForCreator))
const ledgerEndCash = computed(() =>
  detailRows.value.length > 0 ? detailRows.value[detailRows.value.length - 1]!.runningCash : 0
)
const finalCashBalance = computed(() => Math.max(0, ledgerEndCash.value - pendingHoldBaht.value))
const cashAllowsTransfer = computed(() => !creatorCashAllPickup(cashItems.value))

const approvedWithdrawCount = computed(
  () => props.withdrawalsForCreator.filter((w) => String(w.status) === 'approved').length
)

const nonCashSummary = computed(() => {
  if (nonCashItems.value.length === 0) return ''
  const byCat = nonCashItems.value.reduce<Record<string, number>>((acc, a) => {
    const k = String(a.prizeCategory || 'other')
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  return Object.entries(byCat)
    .map(([cat, n]) => `${CAT_LABEL[cat] || 'รางวัล'} ${n} ครั้ง`)
    .join(' · ')
})

const prizeWithdrawHref = computed(() => {
  const ref = encodeURIComponent(creatorDisplay.value)
  const bal = encodeURIComponent(String(finalCashBalance.value))
  return `/account/prize-withdraw?ref=${ref}&balance=${bal}`
})

async function handleCancelWithdrawal(id: string) {
  const token = huajaiyMemberToken()
  if (!token) return
  cancelingId.value = id
  try {
    await apiCancelPrizeWithdrawalRequest(token, id)
    emit('refresh-withdrawals')
  } finally {
    cancelingId.value = null
  }
}
</script>
