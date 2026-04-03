<template>
  <admin-layout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
    >
      <div class="mb-6 min-w-0">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
          {{ pageTitle }}
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          เลือกร้านแล้วกด <strong class="font-semibold text-gray-700 dark:text-gray-300">จัดการสินค้า</strong>
          เพื่อลงสินค้าและสต็อก (หน้าจัดการเต็มรูปแบบบนเว็บหลัก) · ดูหน้าร้านในมาร์เก็ตได้จากปุ่ม
          <strong class="font-semibold text-gray-700 dark:text-gray-300">ดูในมาร์เก็ต</strong>
        </p>
      </div>

      <p v-if="listErr" class="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
        {{ listErr }}
      </p>

      <p
        v-if="listLoading || authLoading"
        class="text-sm text-gray-500 dark:text-gray-400"
        aria-live="polite"
      >
        กำลังโหลดรายการร้าน…
      </p>

      <div
        v-else-if="!tokenPresent"
        class="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100"
      >
        ยังไม่พบการเข้าสู่ระบบในเทมเพลต — โหลดหน้าสมาชิกใหม่หรือล็อกอินอีกครั้ง
      </div>

      <div
        v-else-if="shops.length === 0"
        class="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-5 py-8 dark:border-gray-700 dark:bg-white/[0.02]"
      >
        <p class="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          ยังไม่มีร้านที่ผูกกับบัญชีนี้
        </p>
        <p class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          ระบบขายทำงานเมื่อแอดมินสร้างร้านและผูกบัญชีคุณแล้ว
        </p>
        <ul
          v-if="canOwnerPanel"
          class="mx-auto mt-5 max-w-md list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>
            <a
              href="/owner"
              target="_parent"
              rel="noopener noreferrer"
              class="font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              หน้าขายสินค้า (เจ้าของร้าน)
            </a>
            — สรุปขั้นตอน
          </li>
          <li v-if="isAdmin">
            <a
              href="/admin?tab=shops"
              target="_parent"
              rel="noopener noreferrer"
              class="font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              แอดมิน — ร้านทั้งหมด
            </a>
          </li>
        </ul>
        <p v-else class="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
          ติดต่อแอดมินให้สร้างร้านและตั้งบทบาท
          <span class="font-mono text-xs">owner</span>
          หากคุณเป็นผู้ขาย
        </p>
      </div>

      <ul v-else class="flex flex-col gap-4">
        <li
          v-for="s in shops"
          :key="s.id"
          class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 sm:p-5"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-lg font-semibold text-gray-800 dark:text-white/90">
                {{ s.name || 'ไม่มีชื่อร้าน' }}
              </p>
              <p class="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
                {{ s.slug || '—' }}
              </p>
              <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
                สร้าง {{ fmtDate(s.createdAt) }}
              </p>
            </div>
            <div class="flex flex-shrink-0 flex-wrap gap-2">
              <a
                :href="productsManageHref(s.id)"
                target="_parent"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                จัดการสินค้า
              </a>
              <a
                :href="marketplaceHref(s.id)"
                target="_parent"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                ดูในมาร์เก็ต
              </a>
              <a
                v-if="canOwnerPanel"
                href="/owner"
                target="_parent"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                แผงเจ้าของ
              </a>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useHuajaiyMemberProfile } from '@/composables/useHuajaiyMemberProfile'
import {
  apiGetMyShops,
  huajaiyMemberToken,
  type MyShopRow
} from '@/utils/memberSectionApi'

const pageTitle = 'ร้านค้าของฉัน'

const { user, loading: authLoading, load: loadProfile } = useHuajaiyMemberProfile()

const shops = ref<MyShopRow[]>([])
const listErr = ref('')
const listLoading = ref(true)
const tokenPresent = ref(true)

const canOwnerPanel = computed(() => {
  const r = user.value?.role
  return r === 'owner' || r === 'admin'
})

const isAdmin = computed(() => user.value?.role === 'admin')

function fmtDate(iso?: string) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

/** ใช้ path ใต้ /member เพื่อให้ middleware ส่งต่อไปหน้าจัดการ React ได้ */
function productsManageHref(shopId: string) {
  return `/member/shops/${encodeURIComponent(shopId)}/products`
}

function marketplaceHref(shopId: string) {
  return `/shop?shopId=${encodeURIComponent(shopId)}`
}

onMounted(async () => {
  await loadProfile()
  const token = huajaiyMemberToken()
  tokenPresent.value = Boolean(token)
  if (!token) {
    listLoading.value = false
    return
  }
  listLoading.value = true
  listErr.value = ''
  try {
    shops.value = await apiGetMyShops(token)
  } catch (e) {
    listErr.value = e instanceof Error ? e.message : String(e)
    shops.value = []
  } finally {
    listLoading.value = false
  }
})
</script>
