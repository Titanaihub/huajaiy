<template>
  <div
    class="mt-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 sm:p-4"
  >
    <div class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
      <div>
        <h3 class="text-sm font-semibold text-gray-800 dark:text-white/90">ประวัติการขอถอน</h3>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          ถอนจาก
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >@{{ String(creatorRefLabel || '').replace(/^@+/, '') }}</span
          >
          (ผู้โอนเงินให้คุณ)
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        :disabled="loading"
        @click="emit('refresh')"
      >
        {{ loading ? 'กำลังโหลด…' : 'รีเฟรชรายการ' }}
      </button>
    </div>
    <p
      v-if="loading && withdrawals.length === 0"
      class="mt-4 text-sm text-gray-500 dark:text-gray-400"
    >
      กำลังโหลดประวัติ…
    </p>
    <p
      v-else-if="withdrawals.length === 0"
      class="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400"
    >
      {{ emptyMessage }}
    </p>
    <div v-else class="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table class="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">
            <th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              วันที่สั่งถอน
            </th>
            <th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              ถอนจาก
            </th>
            <th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              จำนวน
            </th>
            <th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              สถานะ
            </th>
            <th class="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              รายละเอียด
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="w in withdrawals" :key="String(w.id)">
            <tr
              class="border-b border-gray-100 transition hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
            >
              <td class="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">
                {{ formatRowDate(w.createdAt) }}
              </td>
              <td class="px-3 py-3">
                <span class="font-medium text-rose-700 dark:text-rose-400"
                  >@{{ String(w.creatorUsername || '').replace(/^@+/, '') }}</span
                >
              </td>
              <td class="whitespace-nowrap px-3 py-3 font-mono tabular-nums font-semibold text-emerald-800 dark:text-emerald-400">
                ฿{{ formatBahtInt(w.amountThb) }}
              </td>
              <td class="px-3 py-3">
                <span :class="statusBadgeClass(w.status)">{{ withdrawalStatusThai(w.status) }}</span>
              </td>
              <td class="px-3 py-3">
                <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                  <button
                    type="button"
                    class="w-fit text-sm font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 hover:text-rose-700 dark:text-rose-400"
                    @click="toggleDetail(String(w.id))"
                  >
                    {{ detailOpenId === String(w.id) ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}
                  </button>
                  <button
                    v-if="allowCancel && w.status === 'pending'"
                    type="button"
                    class="w-fit text-sm font-semibold text-red-600 underline decoration-red-300 underline-offset-2 disabled:opacity-50 dark:text-red-400"
                    :disabled="cancelingId === String(w.id)"
                    @click="onCancelClick(String(w.id))"
                  >
                    {{ cancelingId === String(w.id) ? 'กำลังยกเลิก…' : 'ยกเลิกการถอน' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr
              v-if="detailOpenId === String(w.id)"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td colspan="5" class="bg-gradient-to-b from-gray-50 to-white px-3 py-4 dark:from-gray-900/50 dark:to-gray-900/20 sm:px-4">
                <div
                  class="mx-auto max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      บัญชีรับเงิน (ตอนส่งคำขอ)
                    </p>
                    <ul class="mt-2 space-y-1">
                      <li>
                        <span class="text-gray-500 dark:text-gray-400">ชื่อบัญชี</span>
                        <span class="font-medium">{{ w.accountHolderName || '—' }}</span>
                      </li>
                      <li>
                        <span class="text-gray-500 dark:text-gray-400">เลขบัญชี</span>
                        <span class="font-mono tabular-nums">{{ w.accountNumber || '—' }}</span>
                      </li>
                      <li>
                        <span class="text-gray-500 dark:text-gray-400">ธนาคาร</span>
                        {{ w.bankName || '—' }}
                      </li>
                    </ul>
                  </div>
                  <p
                    v-if="w.creatorNote && w.status !== 'rejected' && w.status !== 'cancelled'"
                    class="rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                  >
                    <span class="font-medium">หมายเหตุผู้สร้าง:</span> {{ w.creatorNote }}
                  </p>
                  <template v-if="w.status === 'approved'">
                    <div class="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <p class="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                        ยืนยันจากผู้สร้าง
                      </p>
                      <p v-if="w.transferDate" class="text-gray-700 dark:text-gray-300">
                        <span class="text-gray-500 dark:text-gray-400">วันที่โอนเงิน</span>
                        {{ formatTransferDate(w.transferDate) }}
                      </p>
                      <p v-else class="text-sm text-gray-500 dark:text-gray-400">ไม่ได้ระบุวันที่โอนในฟอร์ม</p>
                      <a
                        v-if="w.transferSlipUrl"
                        :href="w.transferSlipUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex font-semibold text-rose-600 underline dark:text-rose-400"
                        >เปิดดูสลิปโอนเงิน</a
                      >
                      <p v-else class="text-sm text-gray-500 dark:text-gray-400">ไม่มีสลิปแนบ</p>
                    </div>
                  </template>
                  <p
                    v-else-if="w.status === 'pending'"
                    class="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                  >
                    รอผู้สร้างโอนและกดอนุมัติ — เมื่ออนุมัติแล้ว วันที่โอนและสลิป (ถ้ามี) จะแสดงที่นี่
                  </p>
                  <p
                    v-else-if="w.status === 'cancelled'"
                    class="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-sm text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100"
                  >
                    คุณยกเลิกคำขอถอนนี้แล้ว — ยอดถอนได้จะไม่ถูกหักจากคำขอนี้อีก
                  </p>
                  <div
                    v-else
                    class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <p class="font-medium">คำขอถูกปฏิเสธ</p>
                    <p v-if="w.creatorNote" class="mt-1">{{ w.creatorNote }}</p>
                    <p v-else class="mt-1 text-gray-500 dark:text-gray-400">ไม่มีหมายเหตุเพิ่มเติม</p>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PrizeWithdrawalRow } from '@/utils/memberPrizeUtils'
import { withdrawalStatusThai } from '@/utils/memberPrizeUtils'

const props = withDefaults(
  defineProps<{
    withdrawals: PrizeWithdrawalRow[]
    loading: boolean
    creatorRefLabel: string
    allowCancel?: boolean
    cancelingId?: string | null
    emptyMessage?: string
  }>(),
  {
    allowCancel: true,
    cancelingId: null,
    emptyMessage: 'ยังไม่มีรายการ'
  }
)

const emit = defineEmits<{
  refresh: []
  cancel: [id: string]
}>()

const detailOpenId = ref<string | null>(null)

function toggleDetail(id: string) {
  detailOpenId.value = detailOpenId.value === id ? null : id
}

function formatBahtInt(n: number | string | undefined): string {
  const x = Math.floor(Number(n) || 0)
  return x.toLocaleString('th-TH')
}

function formatRowDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

function formatTransferDate(d: string): string {
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return d
  }
}

function statusBadgeClass(status: string | undefined): string {
  const base =
    'inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1'
  if (status === 'pending')
    return `${base} bg-amber-100 text-amber-950 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800`
  if (status === 'approved')
    return `${base} bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800`
  if (status === 'rejected')
    return `${base} bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600`
  if (status === 'cancelled')
    return `${base} bg-violet-100 text-violet-950 ring-violet-200/80 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-800`
  return `${base} bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-300`
}

function onCancelClick(id: string) {
  if (
    !confirm(
      'ยกเลิกคำขอถอนนี้? ยอดถอนได้จะกลับมาตามยอดรางวัล (ไม่หักคำขอนี้อีก)'
    )
  ) {
    return
  }
  emit('cancel', id)
}
</script>
