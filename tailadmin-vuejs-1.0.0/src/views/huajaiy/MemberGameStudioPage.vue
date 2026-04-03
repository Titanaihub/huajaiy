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

    <div
      v-else-if="!gameId"
      class="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 p-6 text-base text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100"
      role="status"
    >
      <p class="font-semibold">ไม่พบรหัสเกมในลิงก์</p>
      <p class="mt-2">
        <a
          href="/member/create-game"
          target="_parent"
          rel="noopener noreferrer"
          class="font-semibold text-rose-600 underline dark:text-rose-400"
        >
          ไปสร้างเกมใหม่
        </a>
        หรือ
        <a
          href="/member/game"
          target="_parent"
          rel="noopener noreferrer"
          class="font-semibold text-rose-600 underline dark:text-rose-400"
        >
          เกมของฉัน
        </a>
      </p>
    </div>

    <MemberGameStudioEditor v-else :game-id="gameId" />
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MemberGameStudioEditor from '@/components/huajaiy/MemberGameStudioEditor.vue'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const pageTitle = 'ตั้งค่าห้องเกม'
const route = useRoute()
const gameId = ref<string | null>(null)
const authLoading = ref(true)
const hasToken = ref(false)

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
    const g = q.get('game') || q.get('member_game')
    if (g && UUID_RE.test(String(g).trim())) {
      gameId.value = String(g).trim()
    } else {
      gameId.value = null
    }
  } catch {
    gameId.value = null
  }
}

function refreshAuthState() {
  const t = memberToken()
  hasToken.value = Boolean(t)
  authLoading.value = false
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
