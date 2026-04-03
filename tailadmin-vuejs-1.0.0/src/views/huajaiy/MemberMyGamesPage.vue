<template>
  <admin-layout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
    >
      <div
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
      >
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ pageTitle }}
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            เกมที่สร้างจากบัญชีนี้ — จัดการเผยแพร่และแก้ไขได้จากที่นี่
          </p>
        </div>
        <a
          href="/member/create-game"
          target="_parent"
          rel="noopener noreferrer"
          class="inline-flex shrink-0 items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          สร้างเกมใหม่
        </a>
      </div>

      <p v-if="listErr" class="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
        {{ listErr }}
      </p>

      <p
        v-if="listLoading"
        class="text-sm text-gray-500 dark:text-gray-400"
        aria-live="polite"
      >
        กำลังโหลดรายการเกม…
      </p>

      <div
        v-else-if="games.length === 0"
        class="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-5 py-8 text-center dark:border-gray-700 dark:bg-white/[0.02]"
      >
        <p class="text-sm text-gray-600 dark:text-gray-400">ยังไม่มีเกมที่สร้างจากบัญชีนี้</p>
        <p class="mt-3">
          <a
            href="/member/create-game"
            target="_parent"
            rel="noopener noreferrer"
            class="text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            ไปหน้าสร้างเกม
          </a>
        </p>
      </div>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="g in games"
          :key="g.id"
          class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="font-semibold text-gray-800 dark:text-white/90">
              {{ g.title || 'ไม่มีชื่อ' }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span :class="statusBadgeClass(g)">{{ statusLabel(g) }}</span>
              <span
                v-if="g.gameCode"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                รหัส {{ g.gameCode }}
              </span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              v-if="canPreview(g)"
              :href="playHref(g.id)"
              target="_parent"
              rel="noopener noreferrer"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              ดูหน้าเล่น
            </a>
            <button
              type="button"
              :disabled="busyId === g.id || !canToggle(g)"
              class="rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
              :class="
                g.isPublished || g.isActive
                  ? 'border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
              "
              @click="togglePublish(g)"
            >
              {{
                busyId === g.id
                  ? 'กำลังบันทึก…'
                  : g.isPublished || g.isActive
                    ? 'หยุดเผยแพร่'
                    : 'เผยแพร่'
              }}
            </button>
            <a
              :href="addPrizeHref(g.id)"
              target="_parent"
              rel="noopener noreferrer"
              class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
              title="เพิ่มรางวัลใหม่ได้ แต่ไม่ควรแก้ไขรางวัลเดิม"
            >
              เพิ่มรางวัล
            </a>
            <a
              :href="manageHref(g.id)"
              target="_parent"
              rel="noopener noreferrer"
              class="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              จัดการเกม
            </a>
          </div>
        </li>
      </ul>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface CentralGameRow {
  id: string
  title?: string
  gameCode?: string
  isPublished?: boolean
  isActive?: boolean
}

const pageTitle = 'เกมของฉัน'

const games = ref<CentralGameRow[]>([])
const listErr = ref('')
const listLoading = ref(true)
const busyId = ref('')

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

async function fetchGames(opts?: { silent?: boolean }) {
  const silent = Boolean(opts?.silent)
  if (!silent) {
    listLoading.value = true
    listErr.value = ''
  }
  const token = memberToken()
  if (!token) {
    if (!silent) listLoading.value = false
    games.value = []
    return
  }
  try {
    const r = await fetch(`${apiBase()}/api/admin/central-games`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = (await r.json().catch(() => ({}))) as { games?: CentralGameRow[]; error?: string }
    if (!r.ok) throw new Error(data.error || 'โหลดรายการเกมไม่สำเร็จ')
    games.value = Array.isArray(data.games) ? data.games : []
    if (silent) listErr.value = ''
  } catch (e: unknown) {
    listErr.value = e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ'
    games.value = []
  } finally {
    if (!silent) listLoading.value = false
  }
}

function canPreview(g: CentralGameRow): boolean {
  const id = g.id
  return Boolean(g.isPublished || g.isActive) && Boolean(id && UUID_RE.test(String(id)))
}

function canToggle(g: CentralGameRow): boolean {
  const id = g.id
  return Boolean(id && UUID_RE.test(String(id)))
}

function playHref(id: string) {
  return `/game/${encodeURIComponent(id)}`
}

function manageHref(id: string) {
  return `/member/game-studio?game=${encodeURIComponent(id)}`
}

function addPrizeHref(id: string) {
  return `/member/game-studio?game=${encodeURIComponent(id)}`
}

function statusLabel(g: CentralGameRow): string {
  if (g.isPublished) return 'เผยแพร่แล้ว'
  if (g.isActive) return 'กำลังเปิดใช้'
  return 'ร่าง'
}

function statusBadgeClass(g: CentralGameRow): string {
  if (g.isPublished) {
    return 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800'
  }
  if (g.isActive) {
    return 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600'
  }
  return 'inline-flex rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800/80 dark:text-gray-400'
}

async function togglePublish(g: CentralGameRow) {
  const id = String(g.id || '')
  if (!id || !UUID_RE.test(id)) return
  const token = memberToken()
  if (!token) {
    listErr.value = 'หมดเซสชัน — กรุณาเข้าสู่ระบบใหม่'
    return
  }
  const nextPublish = !Boolean(g.isPublished || g.isActive)
  busyId.value = id
  listErr.value = ''
  try {
    const path = nextPublish ? 'activate' : 'deactivate'
    const r = await fetch(
      `${apiBase()}/api/admin/central-games/${encodeURIComponent(id)}/${path}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    )
    const data = (await r.json().catch(() => ({}))) as { error?: string }
    if (!r.ok) throw new Error(data.error || 'อัปเดตสถานะเกมไม่สำเร็จ')
    await fetchGames({ silent: true })
  } catch (e: unknown) {
    listErr.value = e instanceof Error ? e.message : 'อัปเดตสถานะเกมไม่สำเร็จ'
  } finally {
    busyId.value = ''
  }
}

function onMemberUser() {
  /* bridge ยิง event บ่อยจาก MutationObserver — อย่า set listLoading จะได้ไม่กระพริบ */
  fetchGames({ silent: true })
}

onMounted(() => {
  fetchGames()
  window.addEventListener('huajaiy-member-user', onMemberUser)
})

onUnmounted(() => {
  window.removeEventListener('huajaiy-member-user', onMemberUser)
})
</script>
