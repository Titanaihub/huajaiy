<template>
  <admin-layout>
    <PageBreadcrumb page-title="เติมหัวใจแดง" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 space-y-8"
    >
      <p class="text-sm text-gray-600 dark:text-gray-400">
        เมื่อระบบอนุมัติการซื้อ จำนวนหัวใจแดงจะเข้าไปในเมนู
        <strong class="text-gray-800 dark:text-white">แจกหัวใจแดง</strong>
        (เมนูผู้สร้าง → แจกหัวใจแดง)
      </p>

      <div v-if="!token" class="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
        <p class="font-medium text-amber-950 dark:text-amber-100">กำลังโหลดหรือต้องเข้าสู่ระบบ</p>
        <a href="/login" target="_parent" rel="noopener noreferrer" class="mt-2 inline-block font-semibold text-rose-600">เข้าสู่ระบบ</a>
      </div>

      <template v-else>
        <p v-if="loadErr" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {{ loadErr }}
        </p>

        <section>
          <h3 class="text-base font-semibold text-gray-800 dark:text-white/90">แพ็กเกจ</h3>
          <ul class="mt-3 grid gap-4 sm:grid-cols-2">
            <li v-if="packages.length === 0 && !loadErr" class="text-sm text-gray-500 dark:text-gray-400">ยังไม่มีแพ็กเปิดขาย</li>
            <li
              v-for="p in packages"
              :key="p.id"
              class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
            >
              <p class="text-base font-semibold text-gray-800 dark:text-white">{{ p.title }}</p>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ (p.description || '').trim() || 'หัวใจแดงสำหรับเอาไว้แจกเล่นเกม' }}
              </p>
              <p class="mt-1 flex flex-wrap items-baseline gap-x-1 text-base text-gray-700 dark:text-gray-300">
                <span>หัวใจแดง</span>
                <span class="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400 sm:text-3xl">
                  {{ p.redQty?.toLocaleString('th-TH') }}
                </span>
                <span>ดวง</span>
              </p>
              <p class="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
                ฿{{ p.priceThb?.toLocaleString('th-TH') }}
              </p>
              <button
                type="button"
                class="mt-3 rounded-xl bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                :disabled="creatingId === p.id"
                @click="onSelectPackage(p.id)"
              >
                {{ creatingId === p.id ? 'กำลังสร้างรายการ…' : 'เลือกแพ็กนี้' }}
              </button>
            </li>
          </ul>
        </section>

        <section>
          <h3 class="text-base font-semibold text-gray-800 dark:text-white/90">รายการสั่งซื้อ</h3>
          <p
            v-if="msg"
            class="mt-2 text-sm"
            :class="msgPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ msg }}
          </p>
          <p v-if="purchases.length === 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            ยังไม่มีรายการ — เลือกแพ็กด้านบนเพื่อสั่งซื้อ
          </p>
          <div v-else class="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
            <table class="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/80">
                  <th class="px-3 py-2.5 font-semibold text-gray-800 dark:text-white">วันที่</th>
                  <th class="px-3 py-2.5 font-semibold text-gray-800 dark:text-white">รายการสั่งซื้อ</th>
                  <th class="px-3 py-2.5 font-semibold text-gray-800 dark:text-white">สถานะ</th>
                  <th class="px-3 py-2.5 font-semibold text-gray-800 dark:text-white">ดูรายละเอียดการชำระ</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in purchases" :key="row.id">
                  <tr class="border-b border-gray-100 dark:border-gray-800">
                    <td class="whitespace-nowrap px-3 py-2.5 text-gray-700 dark:text-gray-300">{{ formatPurchaseDate(row.createdAt) }}</td>
                    <td class="px-3 py-2.5 font-medium text-gray-800 dark:text-white">{{ row.packageTitle || '—' }}</td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-gray-700 dark:text-gray-300">{{ purchaseStatusLabel(row) }}</td>
                    <td class="px-3 py-2.5">
                      <button
                        type="button"
                        class="text-sm font-semibold text-rose-600 underline dark:text-rose-400"
                        @click="expandedId = expandedId === row.id ? null : row.id"
                      >
                        {{ expandedId === row.id ? 'ซ่อน' : 'ดูรายละเอียดการชำระ' }}
                      </button>
                    </td>
                  </tr>
                  <tr v-if="expandedId === row.id" class="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/30">
                    <td colspan="4" class="px-3 py-4">
                      <div class="max-w-lg rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        <p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">โอนเงินมาที่</p>
                        <ul class="mt-2 space-y-1">
                          <li><span class="font-medium text-gray-500">ชื่อบัญชี:</span> {{ row.paymentAccountName || '—' }}</li>
                          <li><span class="font-medium text-gray-500">เลขบัญชี:</span> {{ row.paymentAccountNumber || '—' }}</li>
                          <li><span class="font-medium text-gray-500">ธนาคาร:</span> {{ row.paymentBankName || '—' }}</li>
                        </ul>
                        <div v-if="row.paymentQrUrl" class="mt-3">
                          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">สแกน QR จ่าย</p>
                          <img
                            :src="row.paymentQrUrl"
                            alt="QR ชำระเงิน"
                            class="mt-2 max-h-48 w-auto max-w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                          />
                        </div>
                      </div>
                      <form
                        v-if="row.status === 'pending' && !row.slipUrl"
                        class="mt-4 max-w-lg space-y-3"
                        @submit.prevent="submitSlipForPurchase(row.id)"
                      >
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">รูปสลิปโอนเงิน</label>
                          <input
                            type="file"
                            accept="image/*"
                            class="mt-1 block w-full text-sm"
                            @change="slipFileByPurchase[row.id] = ($event.target as HTMLInputElement).files?.[0] || null"
                          />
                        </div>
                        <button
                          type="submit"
                          class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          :disabled="submittingSlipId === row.id"
                        >
                          {{ submittingSlipId === row.id ? 'กำลังส่ง…' : 'ส่งคำขออนุมัติ' }}
                        </button>
                      </form>
                      <p v-if="row.slipUrl" class="mt-3 text-sm">
                        <a
                          :href="row.slipUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="font-medium text-rose-600 underline dark:text-rose-400"
                          >เปิดดูสลิปที่ส่งแล้ว</a
                        >
                      </p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useHuajaiyMemberProfile } from '@/composables/useHuajaiyMemberProfile'
import { uploadSlipImageFile } from '@/utils/memberSlipUpload'
import type { HeartPackage, HeartPurchaseRow } from '@/utils/memberSectionApi'
import {
  apiAttachHeartPurchaseSlip,
  apiCreateHeartPurchase,
  apiHeartPackages,
  apiMyHeartPurchases,
  huajaiyMemberToken
} from '@/utils/memberSectionApi'

const { load: loadProfile } = useHuajaiyMemberProfile()

const token = ref<string | null>(null)
const packages = ref<HeartPackage[]>([])
const purchases = ref<HeartPurchaseRow[]>([])
const loadErr = ref('')
const creatingId = ref<string | null>(null)
const expandedId = ref<string | null>(null)
const slipFileByPurchase = reactive<Record<string, File | null | undefined>>({})
const submittingSlipId = ref<string | null>(null)
const msg = ref('')

const msgPositive = computed(() => msg.value.includes('แล้ว') || msg.value.includes('สร้าง'))

function purchaseStatusLabel(p: HeartPurchaseRow): string {
  if (p.status === 'approved') return 'อนุมัติแล้ว'
  if (p.status === 'rejected') return 'ปฏิเสธ'
  if (p.status === 'pending') {
    if (!p.slipUrl) return 'รอแนบสลิป'
    return 'รอการอนุมัติ'
  }
  return String(p.status || '')
}

function formatPurchaseDate(iso: string | undefined): string {
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

async function loadPackages() {
  loadErr.value = ''
  try {
    packages.value = await apiHeartPackages()
  } catch (e) {
    loadErr.value = e instanceof Error ? e.message : String(e)
    packages.value = []
  }
}

async function loadPurchases() {
  const t = huajaiyMemberToken()
  token.value = t
  if (!t) {
    purchases.value = []
    return
  }
  try {
    purchases.value = await apiMyHeartPurchases(t)
  } catch {
    purchases.value = []
  }
}

async function loadAll() {
  await loadPackages()
  await loadPurchases()
}

async function onSelectPackage(packageId: string) {
  const t = huajaiyMemberToken()
  if (!t) return
  msg.value = ''
  creatingId.value = packageId
  try {
    await apiCreateHeartPurchase(t, packageId)
    msg.value = 'สร้างรายการสั่งซื้อแล้ว — เปิด「ดูรายละเอียดการชำระ」เพื่อโอนและแนบสลิป'
    await loadPurchases()
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e)
  } finally {
    creatingId.value = null
  }
}

async function submitSlipForPurchase(purchaseId: string) {
  const slipFile = slipFileByPurchase[purchaseId]
  if (!slipFile) {
    msg.value = 'เลือกรูปสลิปก่อน'
    return
  }
  const t = huajaiyMemberToken()
  if (!t) return
  submittingSlipId.value = purchaseId
  msg.value = ''
  try {
    const url = await uploadSlipImageFile(slipFile)
    await apiAttachHeartPurchaseSlip(t, purchaseId, url)
    slipFileByPurchase[purchaseId] = null
    msg.value = 'ส่งสลิปแล้ว — รอแอดมินอนุมัติ'
    await loadPurchases()
    await loadProfile()
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e)
  } finally {
    submittingSlipId.value = null
  }
}

onMounted(() => {
  void loadAll()
})
</script>
