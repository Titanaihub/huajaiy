<template>
  <admin-layout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ managingLabel }}
        </h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{
            gameId
              ? 'ด้านล่างคือแผงตั้งค่าเกมของคุณ'
              : 'เลือกวัตถุประสงค์ อ่านข้อห้ามและกฎระเบียบ แล้วระบุเงื่อนไขรางวัลให้ชัดเจน'
          }}
        </p>
      </div>
      <router-link
        to="/my-games"
        class="shrink-0 text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
      >
        ← กลับเกมของฉัน
      </router-link>
    </div>

    <p
      v-if="authLoading"
      class="text-sm text-gray-500 dark:text-gray-400"
      aria-live="polite"
    >
      กำลังโหลด…
    </p>

    <div
      v-else-if="!hasToken"
      class="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300"
    >
      <p class="font-medium text-gray-800 dark:text-white/90">ต้องเข้าสู่ระบบก่อน</p>
      <p class="mt-2">
        <a
          href="/login"
          target="_top"
          rel="noopener noreferrer"
          class="font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 hover:text-rose-700 dark:text-rose-400"
        >
          เข้าสู่ระบบ
        </a>
      </p>
    </div>

    <template v-else>
      <form v-if="!gameId" class="space-y-6" @submit.prevent="onSubmit">
        <div
          class="rounded-2xl border border-gray-200 bg-white p-4 pt-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
        >
          <div class="-mx-1 border-b border-gray-200 pb-3 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              วัตถุประสงค์ในการเปิดห้องเกม
            </h3>
            <p class="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              เลือกข้อที่ตรงกับการใช้งานของคุณมากที่สุด
            </p>
          </div>
          <ul class="mt-4 w-full max-w-none space-y-3">
            <li v-for="p in PURPOSES" :key="p.id" class="w-full">
              <label
                class="flex w-full min-w-0 cursor-pointer items-start gap-3 text-sm leading-snug text-gray-700 dark:text-gray-200"
              >
                <input
                  v-model="purpose"
                  type="radio"
                  name="purpose"
                  :value="p.id"
                  class="mt-1 shrink-0"
                />
                <span class="min-w-0 flex-1">{{ p.label }}</span>
              </label>
            </li>
          </ul>
          <div v-if="purpose === 'other'" class="mt-4">
            <label
              for="otherReason"
              class="block text-sm font-medium text-gray-800 dark:text-white/90"
            >
              เหตุผล (อื่นๆ) <span class="text-red-600">*</span>
            </label>
            <textarea
              id="otherReason"
              v-model="otherReason"
              rows="3"
              placeholder="อธิบายวัตถุประสงค์ให้ชัดเจน"
              class="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div
          class="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100"
          role="note"
        >
          <p class="font-semibold text-rose-900 dark:text-rose-100">ข้อห้ามใช้งาน</p>
          <ul class="mt-2 list-inside list-disc space-y-1 text-rose-900/95 dark:text-rose-100/90">
            <li>
              <strong>ห้าม</strong>ใช้เกมหรือห้องเกมเพื่อธุรกิจหรือกิจกรรมที่เป็น<strong>การพนัน</strong>
              หรือชักจูงให้เล่นพนัน
            </li>
            <li>
              <strong>ห้าม</strong>ใช้เนื้อหา<strong>สื่อลามก</strong> หรือเนื้อหาที่ผิดกฎหมายและศีลธรรมอันดี
            </li>
          </ul>
        </div>

        <div
          class="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100"
        >
          <p class="font-semibold text-amber-900 dark:text-amber-100">กฎระเบียบสำหรับผู้สร้างเกม</p>
          <ul class="mt-2 list-inside list-disc space-y-1">
            <li>
              ผู้สร้างเกมมีหน้าที่<strong>จ่ายรางวัล</strong>ตามที่กำหนดและประกาศไว้ต่อผู้เล่น
            </li>
            <li>
              ต้อง<strong>แจ้งเงื่อนไข</strong>การได้รับรางวัล วิธีรับ และระยะเวลาให้<strong>ชัดเจน</strong>
              เพื่อลดความขัดแย้ง
            </li>
          </ul>
        </div>

        <div
          class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
        >
          <label for="roomTitle" class="block text-sm font-medium text-gray-800 dark:text-white/90">
            ชื่อห้อง / ชื่อเกม (ไม่บังคับ)
          </label>
          <input
            id="roomTitle"
            v-model="roomTitle"
            type="text"
            maxlength="200"
            placeholder="เช่น ลดราคาเดือนมีนา — เกมพลิกการ์ด"
            class="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div
          class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
        >
          <label
            for="prizeConditions"
            class="block text-sm font-medium text-gray-800 dark:text-white/90"
          >
            เงื่อนไขรางวัลและข้อความถึงผู้เล่น <span class="text-red-600">*</span>
          </label>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ระบุให้ชัด: รางวัลมีอะไรบ้าง จำนวน/มูลค่า วิธีรับ ระยะเวลา และข้อยกเว้น (ถ้ามี)
          </p>
          <textarea
            id="prizeConditions"
            v-model="prizeConditions"
            rows="6"
            required
            class="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="ตัวอย่าง: ผู้ที่ทายถูกครั้งแรก 3 คนแรก รับส่วนลด 100 บาท ติดต่อรับที่ LINE @xxx ภายใน 7 วัน..."
          />
        </div>

        <label
          class="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-200"
        >
          <input v-model="agreeRules" type="checkbox" class="mt-1" />
          <span>
            ข้าพเจ้า<strong>รับทราบและยินยอม</strong>ตามกฎระเบียบข้างต้น รวมถึงข้อห้ามเรื่องการพนันและสื่อลามก
            และรับทราบว่าข้าพเจ้ามีหน้าที่จ่ายรางวัลและชี้แจงเงื่อนไขให้ผู้เล่นตามที่กรอกไว้
          </span>
        </label>

        <p class="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          หลังเปิดห้อง ระบบจะสร้างเกมด้วยค่าเริ่มต้น
          <strong class="font-medium text-gray-800 dark:text-white/90">หักหัวใจแดง 1 ต่อรอบ</strong>
          <span class="text-gray-500 dark:text-gray-500">
            (ปรับโหมด/ยอดได้ทันทีในขั้นตอนตั้งค่าเกมด้านล่าง)
          </span>
        </p>

        <p
          v-if="err"
          class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          {{ err }}
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            :disabled="busy"
            class="inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-gray-900"
          >
            {{ busy ? 'กำลังเปิดห้อง…' : 'เปิดสร้างห้องเกม' }}
          </button>
          <a
            href="/member"
            target="_top"
            rel="noopener noreferrer"
            class="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400"
          >
            ← ภาพรวมสมาชิก
          </a>
          <a
            href="/member/game"
            target="_top"
            rel="noopener noreferrer"
            class="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400"
          >
            เกมของฉัน
          </a>
        </div>
      </form>

      <div
        v-if="gameId"
        id="game-studio"
        class="scroll-mt-8 border-t border-gray-200 pt-8 dark:border-gray-800"
      >
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">ตั้งค่าห้องเกม</h3>
        <div
          class="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/30"
        >
          <iframe
            :key="studioIframeSrc"
            :src="studioIframeSrc"
            title="ตั้งค่าห้องเกม"
            class="block min-h-[min(88vh,960px)] w-full border-0 bg-white"
            referrerpolicy="same-origin"
          />
        </div>
      </div>
    </template>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PURPOSES = [
  { id: 'shop_sales', label: 'ร้านค้า — ส่งเสริมการขาย' },
  { id: 'product_promo', label: 'โปรโมทสินค้า' },
  { id: 'giveaway', label: 'ใจป๋า — อยากแจกรางวัล' },
  { id: 'other', label: 'อื่นๆ (ต้องระบุเหตุผล)' }
] as const

type PurposeId = (typeof PURPOSES)[number]['id']

const DEFAULT_NEW_ROOM_HEART_PRESET = {
  heartCurrencyMode: 'red_only',
  pinkHeartCost: 0,
  redHeartCost: 1,
  acceptsPinkHearts: true
} as const

const pageTitle = 'สร้างเกมใหม่'
const route = useRoute()

const gameId = ref<string | null>(null)
const purpose = ref<PurposeId>('shop_sales')
const otherReason = ref('')
const prizeConditions = ref('')
const roomTitle = ref('')
const agreeRules = ref(false)
const busy = ref(false)
const err = ref('')
const authLoading = ref(true)
const hasToken = ref(false)

function purposeLabel(id: string): string {
  return PURPOSES.find((p) => p.id === id)?.label || id
}

function buildDescription(): string {
  const lines = [
    `วัตถุประสงค์เปิดห้องเกม: ${purposeLabel(purpose.value)}`,
    purpose.value === 'other' && otherReason.value.trim()
      ? `เหตุผล (อื่นๆ): ${otherReason.value.trim()}`
      : null,
    '',
    'เงื่อนไขรางวัล / ข้อความถึงผู้เล่น:',
    prizeConditions.value.trim(),
    '',
    'ผู้สร้างยืนยันรับทราบกฎระเบียบบนแพลตฟอร์ม (ห้ามเชื่อมโยงการพนัน และห้ามสื่อลามก) และรับผิดชอบจ่ายรางวัลตามที่ประกาศไว้'
  ]
  return lines.filter((x) => x != null).join('\n')
}

function apiBase(): string {
  const w = window as unknown as { __HUAJAIY_API_BASE__?: string }
  const raw = String(w.__HUAJAIY_API_BASE__ || '').replace(/\/$/, '')
  return raw || 'https://huajaiy-api.onrender.com'
}

function memberToken(): string | null {
  try {
    return localStorage.getItem('huajaiy_member_token')
  } catch {
    return null
  }
}

function syncGameIdFromSearch() {
  try {
    const q = new URLSearchParams(window.location.search)
    const g = q.get('member_game')
    if (g && UUID_RE.test(String(g).trim())) {
      gameId.value = String(g).trim()
    } else {
      gameId.value = null
    }
  } catch {
    gameId.value = null
  }
}

const studioIframeSrc = computed(() => {
  const id = gameId.value
  if (!id) return ''
  return `/account/game-studio?member_embed=1&game=${encodeURIComponent(id)}`
})

const managingLabel = computed(() => (gameId.value ? 'จัดการห้องเกม' : 'เปิดห้องเกม'))

function refreshAuthState() {
  const t = memberToken()
  hasToken.value = Boolean(t)
  authLoading.value = false
}

async function onSubmit() {
  err.value = ''
  if (!agreeRules.value) {
    err.value = 'กรุณากดยืนยันว่ารับทราบกฎระเบียบและความรับผิดชอบ'
    return
  }
  if (purpose.value === 'other' && otherReason.value.trim().length < 8) {
    err.value = 'กรุณาระบุเหตุผล (อื่นๆ) อย่างน้อย 8 ตัวอักษร'
    return
  }
  if (prizeConditions.value.trim().length < 15) {
    err.value = 'กรุณาอธิบายเงื่อนไขรางวัลให้ชัดเจน (อย่างน้อย 15 ตัวอักษร)'
    return
  }
  const token = memberToken()
  if (!token) {
    err.value = 'ไม่ได้เข้าสู่ระบบ — กรุณาล็อกอินใหม่'
    return
  }

  const titleBase =
    roomTitle.value.trim() ||
    `ห้องเกม — ${new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`
  const title = titleBase.slice(0, 200)
  const description = buildDescription()

  busy.value = true
  try {
    const r = await fetch(`${apiBase()}/api/admin/central-games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        description,
        setCount: 1,
        imagesPerSet: 4,
        ...DEFAULT_NEW_ROOM_HEART_PRESET
      })
    })
    const data = (await r.json().catch(() => ({}))) as {
      game?: { id?: string }
      snapshot?: { game?: { id?: string } }
      error?: string
    }
    if (!r.ok) throw new Error(data.error || 'สร้างเกมไม่สำเร็จ')
    const gid = data.game?.id || data.snapshot?.game?.id || null
    if (!gid) {
      throw new Error('สร้างห้องแล้วแต่ไม่ได้รับรหัสเกม — ลองรีเฟรชหน้า')
    }
    const nextUrl = `/member/create-game?game=${encodeURIComponent(gid)}#game-studio`
    if (window.top) {
      window.top.location.assign(nextUrl)
    } else {
      window.location.assign(nextUrl)
    }
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : 'เปิดห้องเกมไม่สำเร็จ'
  } finally {
    busy.value = false
  }
}

function onMemberUser() {
  refreshAuthState()
}

onMounted(() => {
  syncGameIdFromSearch()
  refreshAuthState()
  window.addEventListener('huajaiy-member-user', onMemberUser)
})

onUnmounted(() => {
  window.removeEventListener('huajaiy-member-user', onMemberUser)
})

watch(
  () => route.fullPath,
  () => {
    syncGameIdFromSearch()
  }
)
</script>
