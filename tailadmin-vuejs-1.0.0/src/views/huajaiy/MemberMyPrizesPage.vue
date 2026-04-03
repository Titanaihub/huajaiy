<template>
  <admin-layout>
    <PageBreadcrumb page-title="รางวัลของฉัน" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
    >
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">รางวัลของฉัน</h3>

      <div
        v-if="!token"
        class="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <p class="font-medium">ต้องเข้าสู่ระบบก่อน</p>
        <p class="mt-2 text-amber-900/90 dark:text-amber-200/90">
          รางวัลจากเกมส่วนกลางจะบันทึกกับบัญชีเมื่อคุณล็อกอินและชนะตามกติกา
        </p>
        <a
          href="/login"
          target="_parent"
          rel="noopener noreferrer"
          class="mt-3 inline-block font-semibold text-rose-600 underline dark:text-rose-400"
        >
          เข้าสู่ระบบ
        </a>
      </div>

      <template v-else>
        <p v-if="err" class="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">{{ err }}</p>
        <p v-if="loading" class="mt-6 text-sm text-gray-500 dark:text-gray-400">กำลังโหลดรายการ…</p>
        <div
          v-else-if="awards.length === 0"
          class="mt-6 rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-6 text-center text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
        >
          <p>ยังไม่มีรางวัลที่บันทึกในบัญชีนี้</p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            เล่นเกมจากเมนู「เกม」แล้วชนะตามกติกา — ต้องล็อกอินขณะเล่น
          </p>
          <a
            href="/game"
            target="_parent"
            rel="noopener noreferrer"
            class="mt-4 inline-block font-semibold text-rose-600 underline dark:text-rose-400"
          >
            ไปหน้ารายการเกม
          </a>
        </div>
        <div v-else class="mt-6 space-y-6">
          <div>
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">การ์ดรางวัลเงินสด</h4>
            <p v-if="cashGroups.length === 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีรางวัลเงินสด
            </p>
            <ul v-else class="mt-3 space-y-3">
              <MemberCashPrizeCard
                v-for="g in cashGroups"
                :key="g.creatorKey"
                :group="g"
                :withdrawals-for-creator="withdrawalsForCreator(g.creatorUsername)"
                :wd-refreshing="wdRefreshing"
                @refresh-withdrawals="refreshWithdrawals"
              />
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">การ์ดรางวัลสิ่งของ</h4>
            <p v-if="itemAwards.length === 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีรางวัลสิ่งของ
            </p>
            <ul v-else class="mt-3 space-y-3">
              <MemberItemPrizeGroupCard
                v-for="g in itemGroups"
                :key="g.groupKey"
                :group="g"
                @refresh-awards="refreshAwards"
              />
            </ul>
          </div>
        </div>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PrizeAward, PrizeWithdrawalRow } from '@/utils/memberPrizeUtils'
import { groupAwardsByCreator, groupItemAwardsByCreatorAndPrize } from '@/utils/memberPrizeUtils'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MemberCashPrizeCard from '@/components/huajaiy/MemberCashPrizeCard.vue'
import MemberItemPrizeGroupCard from '@/components/huajaiy/MemberItemPrizeGroupCard.vue'
import {
  apiGetMyCentralPrizeAwards,
  apiGetMyPrizeWithdrawals,
  huajaiyMemberToken
} from '@/utils/memberSectionApi'

const token = ref<string | null>(null)
const awards = ref<PrizeAward[]>([])
const withdrawals = ref<PrizeWithdrawalRow[]>([])
const loading = ref(true)
const wdRefreshing = ref(false)
const err = ref('')

const cashGroups = computed(() =>
  groupAwardsByCreator(awards.value.filter((a) => String(a.prizeCategory) === 'cash'))
)
const itemAwards = computed(() => awards.value.filter((a) => String(a.prizeCategory) === 'item'))
const itemGroups = computed(() => groupItemAwardsByCreatorAndPrize(itemAwards.value))

function withdrawalsForCreator(creatorUsername: string): PrizeWithdrawalRow[] {
  const cu = String(creatorUsername || '')
    .trim()
    .toLowerCase()
  return withdrawals.value.filter(
    (w) => String(w.creatorUsername || '').trim().toLowerCase() === cu
  )
}

async function refreshWithdrawals() {
  const t = huajaiyMemberToken()
  if (!t) return
  wdRefreshing.value = true
  try {
    withdrawals.value = await apiGetMyPrizeWithdrawals(t)
  } catch {
    withdrawals.value = []
  } finally {
    wdRefreshing.value = false
  }
}

async function refreshAwards() {
  const t = huajaiyMemberToken()
  if (!t) return
  try {
    awards.value = await apiGetMyCentralPrizeAwards(t)
    err.value = ''
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

async function loadAll() {
  const t = huajaiyMemberToken()
  token.value = t
  if (!t) {
    loading.value = false
    awards.value = []
    withdrawals.value = []
    return
  }
  loading.value = true
  err.value = ''
  try {
    const [a, w] = await Promise.all([
      apiGetMyCentralPrizeAwards(t),
      apiGetMyPrizeWithdrawals(t).catch(() => [] as PrizeWithdrawalRow[])
    ])
    awards.value = a
    withdrawals.value = w
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAll()
})
</script>
