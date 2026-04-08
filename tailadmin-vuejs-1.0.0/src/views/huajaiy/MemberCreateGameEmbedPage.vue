<template>
  <admin-layout>
    <PageBreadcrumb :page-title="pageTitle" prominent />

    <div class="mb-8 flex flex-wrap items-center justify-end gap-3">
      <a
        href="/member/game"
        target="_parent"
        rel="noopener noreferrer"
        class="shrink-0 text-base font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
      >
        ← กลับเกมของฉัน
      </a>
    </div>

    <p
      v-if="authLoading"
      class="text-base text-gray-500 dark:text-gray-400"
      aria-live="polite"
    >
      กำลังโหลด…
    </p>

    <div
      v-else-if="!hasToken"
      class="rounded-2xl border border-gray-200 bg-white p-6 text-base text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300"
    >
      <p class="text-lg font-semibold text-gray-800 dark:text-white/90">ต้องเข้าสู่ระบบก่อน</p>
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
      <form class="space-y-8" @submit.prevent="onSubmit">
        <!-- การ์ด 1: ข้อห้ามใช้งาน -->
        <div
          class="rounded-2xl border-2 border-rose-200 bg-rose-50/95 p-6 shadow-sm md:p-8 dark:border-rose-800/55 dark:bg-rose-950/35"
          role="note"
        >
          <p class="text-xl font-bold text-rose-950 md:text-2xl dark:text-rose-50">
            ข้อห้ามใช้งาน
          </p>
          <ul
            class="mt-4 list-disc space-y-4 pl-6 text-base leading-relaxed text-rose-950 md:text-lg dark:text-rose-100/95"
          >
            <li>
              <strong>ห้าม</strong>ใช้เกมหรือห้องเกมเพื่อธุรกิจหรือกิจกรรมที่เป็น<strong>การพนัน</strong>
              หรือชักจูงให้เล่นพนัน
            </li>
            <li>
              <strong>ห้าม</strong>ใช้เนื้อหา<strong>สื่อลามก</strong> หรือเนื้อหาที่ผิดกฎหมายและศีลธรรมอันดี
            </li>
          </ul>
        </div>

        <!-- การ์ด 2: กฎระเบียบ -->
        <div
          class="rounded-2xl border-2 border-amber-200 bg-amber-50/95 p-6 shadow-sm md:p-8 dark:border-amber-800/45 dark:bg-amber-950/30"
        >
          <p class="text-xl font-bold text-amber-950 md:text-2xl dark:text-amber-50">
            กฎระเบียบสำหรับผู้สร้างเกม
          </p>
          <ul
            class="mt-4 list-disc space-y-4 pl-6 text-base leading-relaxed text-amber-950 md:text-lg dark:text-amber-100"
          >
            <li>
              ผู้สร้างเกมมีหน้าที่<strong>จ่ายรางวัล</strong>ตามที่กำหนดและประกาศไว้ต่อผู้เล่น
            </li>
            <li>
              ต้อง<strong>แจ้งเงื่อนไข</strong>การได้รับรางวัล วิธีรับ และระยะเวลาให้<strong>ชัดเจน</strong>
              เพื่อลดความขัดแย้ง
            </li>
          </ul>
        </div>

        <!-- ข้อกำหนดจำนวนเกม / ป้าย -->
        <div
          class="rounded-2xl border-2 border-sky-200 bg-sky-50/95 p-6 shadow-sm md:p-8 dark:border-sky-800/45 dark:bg-sky-950/25"
        >
          <p class="text-xl font-bold text-sky-950 md:text-2xl dark:text-sky-50">
            ข้อกำหนดจำนวนเกมและป้าย
          </p>
          <ul
            class="mt-4 list-disc space-y-4 pl-6 text-base leading-relaxed text-sky-950 md:text-lg dark:text-sky-100"
          >
            <li>
              1 เกมมีได้ไม่เกิน <strong>40</strong> ป้าย (นับรวมทุกชุด)
            </li>
            <li>
              บัญชีสมาชิกสร้างได้ไม่เกิน <strong>3</strong> เกม
            </li>
          </ul>
          <p class="mt-4 text-base leading-relaxed text-sky-950 dark:text-sky-100 md:text-lg">
            หากมีปัญหาหรือต้องการปรับเพิ่ม กรุณาติดต่อแอดมิน
            <a
              href="https://lin.ee/xaRqj0W"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-rose-600 underline hover:text-rose-700 dark:text-rose-400"
            >
              LINE Official
            </a>
          </p>
        </div>

        <!-- การ์ด 3: วัตถุประสงค์ + ฟอร์ม -->
        <div
          class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8 dark:border-gray-800 dark:bg-gray-900/40"
        >
          <div class="border-b border-gray-200 pb-5 dark:border-gray-700">
            <h3 class="text-xl font-bold text-gray-800 dark:text-white/90 md:text-2xl">
              วัตถุประสงค์ในการเปิดห้องเกม
            </h3>
            <p class="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-400 md:text-lg">
              เลือกข้อที่ตรงกับการใช้งานของคุณมากที่สุด
            </p>
          </div>

          <ul class="mt-6 w-full max-w-none space-y-4 md:space-y-5">
            <li v-for="p in PURPOSES" :key="p.id" class="w-full">
              <label
                class="flex w-full min-w-0 cursor-pointer items-start gap-4 text-base leading-snug text-gray-800 md:text-lg dark:text-gray-100"
              >
                <input
                  v-model="purpose"
                  type="radio"
                  name="purpose"
                  :value="p.id"
                  class="mt-1.5 h-5 w-5 shrink-0 accent-rose-600"
                />
                <span class="min-w-0 flex-1">{{ p.label }}</span>
              </label>
            </li>
          </ul>

          <div v-if="purpose === 'other'" class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <label
              for="otherReason"
              class="block text-base font-semibold text-gray-800 dark:text-white/90 md:text-lg"
            >
              เหตุผล (อื่นๆ) <span class="text-red-600">*</span>
            </label>
            <textarea
              id="otherReason"
              v-model="otherReason"
              rows="3"
              placeholder="อธิบายวัตถุประสงค์ให้ชัดเจน"
              class="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 md:text-lg"
            />
          </div>

          <div class="mt-8 border-t border-gray-200 pt-8 dark:border-gray-700">
            <label
              for="roomTitle"
              class="block text-base font-semibold text-gray-800 dark:text-white/90 md:text-lg"
            >
              ชื่อห้อง / ชื่อเกม (ไม่บังคับ)
            </label>
            <input
              id="roomTitle"
              v-model="roomTitle"
              type="text"
              maxlength="200"
              placeholder="เช่น ลดราคาเดือนมีนา — เกมพลิกการ์ด"
              class="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 md:text-lg"
            />
          </div>

          <div class="mt-8 border-t border-gray-200 pt-8 dark:border-gray-700">
            <label
              for="prizeConditions"
              class="block text-base font-semibold text-gray-800 dark:text-white/90 md:text-lg"
            >
              เงื่อนไขรางวัลและข้อความถึงผู้เล่น <span class="text-red-600">*</span>
            </label>
            <p class="mt-2 text-base leading-relaxed text-gray-600 dark:text-gray-400 md:text-lg">
              ระบุให้ชัด: รางวัลมีอะไรบ้าง จำนวน/มูลค่า วิธีรับ ระยะเวลา และข้อยกเว้น (ถ้ามี)
            </p>
            <textarea
              id="prizeConditions"
              v-model="prizeConditions"
              rows="6"
              required
              class="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 md:text-lg"
              placeholder="ตัวอย่าง: ผู้ที่ทายถูกครั้งแรก 3 คนแรก รับส่วนลด 100 บาท ติดต่อรับที่ LINE @xxx ภายใน 7 วัน..."
            />
          </div>

          <label
            class="mt-8 flex cursor-pointer items-start gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-5 text-base leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200 md:text-lg"
          >
            <input
              v-model="agreeRules"
              type="checkbox"
              class="mt-1 h-5 w-5 shrink-0 accent-rose-600"
            />
            <span>
              ข้าพเจ้า<strong>รับทราบและยินยอม</strong>ตามกฎระเบียบข้างต้น รวมถึงข้อห้ามเรื่องการพนันและสื่อลามก
              และรับทราบว่าข้าพเจ้ามีหน้าที่จ่ายรางวัลและชี้แจงเงื่อนไขให้ผู้เล่นตามที่กรอกไว้
            </span>
          </label>

          <p
            v-if="err"
            class="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
            role="alert"
          >
            {{ err }}
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              :disabled="busy"
              class="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-rose-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-gray-900 md:text-lg"
            >
              {{ busy ? 'กำลังสร้างห้อง…' : 'ถัดไป — ตั้งค่าเกม' }}
            </button>
            <a
              href="/member"
              target="_top"
              rel="noopener noreferrer"
              class="text-base font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400"
            >
              ← ภาพรวมสมาชิก
            </a>
            <a
              href="/member/game"
              target="_top"
              rel="noopener noreferrer"
              class="text-base font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400"
            >
              เกมของฉัน
            </a>
          </div>
        </div>
      </form>
    </template>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
const purpose = ref<PurposeId>('shop_sales')
const otherReason = ref('')
const prizeConditions = ref('')
const roomTitle = ref('')
const agreeRules = ref(false)
const busy = ref(false)
const err = ref('')
const authLoading = ref(true)
const hasToken = ref(false)

function buildDescription(): string {
  const lines = [
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

/** ลิงก์เก่า /member/create-game?game= ที่ยังโหลด iframe นี้ — ส่งไปหน้าตั้งค่า */
function redirectToGameStudioIfMemberGameInQuery() {
  try {
    const q = new URLSearchParams(window.location.search)
    const g = q.get('member_game')
    if (g && UUID_RE.test(String(g).trim())) {
      const u = `/member/game-studio?game=${encodeURIComponent(String(g).trim())}`
      try {
        if (window.top && window.top !== window) window.top.location.replace(u)
        else if (window.parent && window.parent !== window) window.parent.location.replace(u)
        else window.location.replace(u)
      } catch {
        window.location.replace(u)
      }
    }
  } catch {
    /* ignore */
  }
}

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
    const nextUrl = `/member/game-studio?game=${encodeURIComponent(gid)}`
    try {
      if (window.top && window.top !== window) {
        window.top.location.assign(nextUrl)
      } else if (window.parent && window.parent !== window) {
        window.parent.location.assign(nextUrl)
      } else {
        window.location.assign(nextUrl)
      }
    } catch {
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
  redirectToGameStudioIfMemberGameInQuery()
  refreshAuthState()
  window.addEventListener('huajaiy-member-user', onMemberUser)
})

onUnmounted(() => {
  window.removeEventListener('huajaiy-member-user', onMemberUser)
})
</script>
