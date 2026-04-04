<template>
  <admin-layout>
    <PageBreadcrumb page-title="แจกหัวใจแดง" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 space-y-6"
    >
      <header>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">แจกหัวใจแดง</h3>
        <p class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <a
            href="/member/hearts-top-up"
            target="_parent"
            rel="noopener noreferrer"
            class="font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 hover:text-rose-700 dark:text-rose-400"
          >
            ซื้อหัวใจแดง
          </a>
          <a
            href="/account/heart-history/giveaway"
            target="_parent"
            rel="noopener noreferrer"
            class="font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 dark:text-rose-400"
          >
            ประวัติแดงสำหรับแจก
          </a>
          <a
            href="/member/hearts"
            target="_parent"
            rel="noopener noreferrer"
            class="font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 dark:text-rose-400"
          >
            หัวใจแดงห้องเกม (มุมมองผู้เล่น)
          </a>
        </p>
      </header>

      <div v-if="authLoading" class="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด…</div>
      <div
        v-else-if="!user"
        class="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
      >
        <p class="font-medium">ต้องเข้าสู่ระบบ</p>
        <a href="/login" target="_parent" rel="noopener noreferrer" class="mt-2 inline-block font-semibold text-rose-600">เข้าสู่ระบบ</a>
      </div>

      <section
        v-else
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
      >
        <div class="mt-1 rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2 text-sm text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
          <p class="font-semibold text-rose-900 dark:text-rose-200">หัวใจแดงทั้งหมด (สำหรับแจกเล่นเกม)</p>
          <p class="mt-1 text-lg font-bold tabular-nums text-red-800 dark:text-red-400">
            {{ giveawayBal.toLocaleString('th-TH') }} ดวง
          </p>
        </div>

        <form class="mt-4 flex flex-col gap-4 border-t border-gray-200 pt-4 dark:border-gray-700" @submit.prevent="onCreate">
          <div class="flex flex-wrap items-end gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">หัวใจแดง ที่จะแจกต่อรหัส</label>
              <input
                v-model.number="redAmount"
                type="number"
                min="1"
                class="mt-1 w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">จำนวนรหัสที่ต้องการสร้าง (รหัสใช้ได้ครั้งเดียว)</label>
              <input
                v-model.number="codeCount"
                type="number"
                min="1"
                max="100"
                class="mt-1 w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <button
              type="submit"
              class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              :disabled="createBusy"
            >
              {{ createBusy ? 'กำลังสร้าง…' : 'สร้างรหัส' }}
            </button>
          </div>
          <p class="text-sm text-amber-900/90 dark:text-amber-200/90">
            คาดว่าจะหักหัวใจแดงรวม
            <strong>{{ estimatedRedDeduction.toLocaleString('th-TH') }} ดวง</strong>
          </p>
        </form>
        <p v-if="createMsg" class="mt-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">{{ createMsg }}</p>

        <div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-white">
              รหัสที่คุณสร้าง
              <span class="mt-0.5 block text-sm font-normal text-gray-500 dark:text-gray-400">
                รหัสที่ยังไม่ถูกใช้งานสามารถกดยกเลิกได้
              </span>
            </h4>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                @click="exportCsv"
              >
                ดาวน์โหลดไฟล์ Excel
              </button>
              <button
                type="button"
                class="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                @click="printCodes"
              >
                พิมพ์รายการรหัส
              </button>
              <button
                v-if="codes.length > 1"
                type="button"
                class="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                :disabled="deleteAllBusy || listLoading"
                @click="onDeleteAllCodes"
              >
                {{ deleteAllBusy ? 'กำลังยกเลิกทั้งหมด…' : 'ยกเลิกทั้งหมด' }}
              </button>
              <button
                type="button"
                class="text-sm font-semibold text-rose-600 underline dark:text-rose-400"
                @click="loadCodes"
              >
                รีเฟรช
              </button>
            </div>
          </div>
          <p v-if="deleteErr" class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ deleteErr }}</p>
          <p v-if="listErr" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ listErr }}</p>
          <p v-if="listLoading" class="mt-2 text-sm text-gray-500 dark:text-gray-400">กำลังโหลด…</p>
          <p v-else-if="codes.length === 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">ยังไม่มีรหัส</p>
          <ul v-else class="mt-2 space-y-2 text-sm">
            <li
              v-for="c in codes"
              :key="String(c.id)"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200/70 bg-gray-50/90 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <code class="font-mono font-semibold text-gray-800 dark:text-white">{{ c.code }}</code>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  แดง {{ c.redAmount }} ·
                  {{
                    Number(c.maxUses) <= 1
                      ? `ใช้แล้ว ${c.usesCount}/1 (ครั้งเดียวต่อรหัส)`
                      : `ใช้แล้ว ${c.usesCount}/${c.maxUses}`
                  }}
                  {{ c.cancelled ? ' · ยกเลิกแล้ว' : '' }}
                  {{ c.expired ? ' · หมดอายุ' : '' }}
                  {{ c.exhausted ? ' · เต็ม' : '' }}
                  {{
                    Array.isArray(c.redeemedByUsernames) && c.redeemedByUsernames.length > 0
                      ? ` · ผู้ใช้: ${c.redeemedByUsernames.map((u) => `@${u}`).join(', ')}`
                      : ''
                  }}
                </span>
                <button
                  type="button"
                  class="rounded border border-red-200 bg-white px-2 py-0.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-300"
                  :disabled="Boolean(deleteBusyId) || deleteAllBusy || c.cancelled || c.exhausted"
                  @click="onDeleteCode(c)"
                >
                  {{ deleteBusyId === String(c.id) ? 'กำลังยกเลิก…' : 'ยกเลิก' }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useHuajaiyMemberProfile } from '@/composables/useHuajaiyMemberProfile'
import type { RoomRedGiftCode } from '@/utils/memberSectionApi'
import {
  apiCreateRoomRedGiftCode,
  apiDeleteRoomRedGiftCode,
  apiListRoomRedGiftCodes,
  huajaiyMemberToken
} from '@/utils/memberSectionApi'

const { user, loading: authLoading, load: loadProfile } = useHuajaiyMemberProfile()

const codes = ref<RoomRedGiftCode[]>([])
const listErr = ref('')
const listLoading = ref(true)
const redAmount = ref(50)
const codeCount = ref(3)
const createBusy = ref(false)
const createMsg = ref('')
const deleteBusyId = ref('')
const deleteAllBusy = ref(false)
const deleteErr = ref('')

const giveawayBal = computed(() =>
  Math.max(0, Math.floor(Number(user.value?.redGiveawayBalance) || 0))
)

const estimatedRedDeduction = computed(() => {
  const ra = Math.max(1, Math.floor(Number(redAmount.value) || 1))
  const n = Math.min(100, Math.max(1, Math.floor(Number(codeCount.value) || 1)))
  return ra * n
})

async function loadCodes() {
  const t = huajaiyMemberToken()
  if (!t) return
  listErr.value = ''
  listLoading.value = true
  try {
    codes.value = await apiListRoomRedGiftCodes(t)
  } catch (e) {
    listErr.value = e instanceof Error ? e.message : 'โหลดรายการรหัสไม่สำเร็จ'
    codes.value = []
  } finally {
    listLoading.value = false
  }
}

async function onCreate() {
  const t = huajaiyMemberToken()
  if (!t) return
  createBusy.value = true
  createMsg.value = ''
  try {
    const ra = Math.max(1, Math.floor(Number(redAmount.value) || 1))
    const n = Math.min(100, Math.max(1, Math.floor(Number(codeCount.value) || 1)))
    const data = await apiCreateRoomRedGiftCode(t, { redAmount: ra, codeCount: n, maxUses: 1 })
    const list = data.codes || (data.code ? [data.code] : [])
    const preview = list
      .slice(0, 5)
      .map((c) => c.code)
      .join(', ')
    const more = list.length > 5 ? ` … อีก ${list.length - 5} รหัส` : ''
    const ded = Math.max(0, Math.floor(Number(data.redDeducted) || 0))
    createMsg.value = `สร้าง ${list.length} รหัสแล้ว (แต่ละรหัส ${ra} แดง · คนละครั้ง) — ${preview}${more} · หักแดงจากคุณ ${ded.toLocaleString('th-TH')} ดวง`
    await loadProfile()
    await loadCodes()
  } catch (ex) {
    createMsg.value = ex instanceof Error ? ex.message : 'สร้างไม่สำเร็จ'
  } finally {
    createBusy.value = false
  }
}

async function onDeleteCode(c: RoomRedGiftCode) {
  const t = huajaiyMemberToken()
  if (!t || !c?.id) return
  deleteErr.value = ''
  deleteBusyId.value = String(c.id)
  try {
    await apiDeleteRoomRedGiftCode(t, String(c.id))
    await loadProfile()
    await loadCodes()
  } catch (ex) {
    deleteErr.value = ex instanceof Error ? ex.message : 'ลบรหัสไม่สำเร็จ'
  } finally {
    deleteBusyId.value = ''
  }
}

async function onDeleteAllCodes() {
  const t = huajaiyMemberToken()
  if (!t || codes.value.length === 0) return
  if (
    !confirm(
      `ลบรหัสทั้ง ${codes.value.length} รายการ? ระบบจะคืนหัวใจแดงเฉพาะส่วนที่ยังไม่ถูกแลก (ตามจำนวนครั้งที่เหลือ)`
    )
  ) {
    return
  }
  deleteErr.value = ''
  deleteAllBusy.value = true
  try {
    for (const c of codes.value) {
      await apiDeleteRoomRedGiftCode(t, String(c.id))
    }
    await loadProfile()
    await loadCodes()
  } catch {
    deleteErr.value = 'ลบรหัสบางรายการไม่สำเร็จ — ลองรีเฟรชแล้วลบที่เหลือ'
    await loadCodes()
    await loadProfile()
  } finally {
    deleteAllBusy.value = false
  }
}

function exportCsv() {
  const rows = [
    ['code', 'redAmount', 'maxUses', 'usesCount', 'status', 'redeemedBy'],
    ...codes.value.map((c) => [
      c.code || '',
      String(c.redAmount ?? ''),
      String(c.maxUses ?? ''),
      String(c.usesCount ?? ''),
      c.cancelled ? 'cancelled' : c.exhausted ? 'used-up' : c.expired ? 'expired' : 'active',
      Array.isArray(c.redeemedByUsernames) ? c.redeemedByUsernames.join(';') : ''
    ])
  ]
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).split('"').join('""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `room-red-codes-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function printCodes() {
  const stamp = new Date().toLocaleString('th-TH')
  const bodyRows = codes.value
    .map((c) => {
      const status = c.cancelled
        ? 'ยกเลิกแล้ว'
        : c.exhausted
          ? 'ใช้ครบแล้ว'
          : c.expired
            ? 'หมดอายุ'
            : 'พร้อมใช้'
      return `<tr><td>${c.code || ''}</td><td>${c.redAmount || 0}</td><td>${c.maxUses || 1}</td><td>${c.usesCount || 0}</td><td>${status}</td></tr>`
    })
    .join('')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"/><title>พิมพ์รหัสหัวใจแดง</title><link href="https://fonts.googleapis.com/css2?family=Niramit:wght@400;600;700&display=swap" rel="stylesheet"/><style>body{font-family:Niramit,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}h1{font-size:20px} .muted{color:#666;font-size:12px}</style></head><body><h1>รายการรหัสหัวใจแดงสำหรับแจก</h1><p class="muted">พิมพ์เมื่อ ${stamp}</p><table><thead><tr><th>รหัส</th><th>แดง/ครั้ง</th><th>สิทธิ์ใช้</th><th>ใช้แล้ว</th><th>สถานะ</th></tr></thead><tbody>${bodyRows || "<tr><td colspan='5'>ยังไม่มีรหัส</td></tr>"}</tbody></table></body></html>`
  )
  w.document.close()
  w.focus()
  w.print()
}

onMounted(async () => {
  await loadProfile()
  await loadCodes()
})
</script>
