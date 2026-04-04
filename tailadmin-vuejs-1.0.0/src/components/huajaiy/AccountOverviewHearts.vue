<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
    <!-- หัวใจชมพู -->
    <div
      class="flex min-h-[200px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="flex items-center gap-2">
        <svg
          class="h-5 w-5 shrink-0 text-pink-500"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17l-.022.012-.007.004-.003.001a.752.752 0 01-.484 0z"
          />
        </svg>
        <span class="text-sm font-semibold text-pink-600 dark:text-pink-400"
          >หัวใจชมพู</span
        >
      </div>
      <p
        class="my-4 flex-1 text-5xl font-semibold tabular-nums tracking-tight text-pink-600 dark:text-pink-400"
      >
        {{ fmt(pink) }}
      </p>
      <div class="mt-auto pt-2">
        <a
          class="text-sm font-medium text-pink-600 underline-offset-2 hover:underline dark:text-pink-400"
          href="/member/pink-history"
          target="_parent"
          rel="noopener noreferrer"
          >ประวัติ</a
        >
      </div>
    </div>

    <!-- หัวใจแดง -->
    <div
      class="flex min-h-[200px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="flex items-center gap-2">
        <svg
          class="h-5 w-5 shrink-0 text-red-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17l-.022.012-.007.004-.003.001a.752.752 0 01-.484 0z"
          />
        </svg>
        <span class="text-sm font-semibold text-red-600 dark:text-red-500"
          >หัวใจแดง</span
        >
      </div>
      <p
        class="my-4 flex-1 text-5xl font-semibold tabular-nums tracking-tight text-red-600 dark:text-red-500"
      >
        {{ fmt(red) }}
      </p>
      <div class="mt-auto pt-2">
        <a
          class="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
          href="/member/hearts"
          target="_parent"
          rel="noopener noreferrer"
          >ประวัติ</a
        >
      </div>
    </div>

    <!-- หัวใจแดงสำหรับแจก -->
    <div
      class="flex min-h-[200px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="flex items-center gap-2">
        <svg
          class="h-5 w-5 shrink-0 text-red-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17l-.022.012-.007.004-.003.001a.752.752 0 01-.484 0z"
          />
        </svg>
        <span class="text-sm font-semibold leading-snug text-red-600 dark:text-red-500"
          >หัวใจแดง สำหรับแจก</span
        >
      </div>
      <p
        class="my-4 flex-1 text-5xl font-semibold tabular-nums tracking-tight text-red-600 dark:text-red-500"
      >
        {{ fmt(giveaway) }}
      </p>
      <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        <a
          class="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
          href="/member/hearts-top-up"
          target="_parent"
          rel="noopener noreferrer"
          >เติมหัวใจ</a
        >
        <a
          class="text-sm font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
          href="/account/heart-history/giveaway"
          target="_parent"
          rel="noopener noreferrer"
          >ประวัติ</a
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const pink = ref(0)
const red = ref(0)
const giveaway = ref(0)

function fmt(n: number) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('th-TH')
}

/** แดงจากผู้เล่น = กระเป๋า + ยอดในห้อง (roomGiftRed) — ตรงกับหัวเว็บ Next */
function redFromUsersTotal(u: Record<string, unknown>): number {
  const wallet = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0))
  const rows = Array.isArray(u.roomGiftRed)
    ? (u.roomGiftRed as { balance?: unknown }[])
    : []
  const room = rows.reduce(
    (s, x) => s + Math.max(0, Math.floor(Number(x?.balance) || 0)),
    0,
  )
  return wallet + room
}

function applyFromUser(u: Record<string, unknown> | null | undefined) {
  if (!u || typeof u !== 'object') return
  pink.value = Math.max(0, Math.floor(Number(u.pinkHeartsBalance) || 0))
  red.value = redFromUsersTotal(u)
  giveaway.value = Math.max(0, Math.floor(Number(u.redGiveawayBalance) || 0))
}

function loadFromWindow() {
  const w = window as Window & {
    __HUAJAIY_USER__?: Record<string, unknown>
  }
  if (w.__HUAJAIY_USER__) applyFromUser(w.__HUAJAIY_USER__)
}

async function fetchMe() {
  const token = localStorage.getItem('huajaiy_member_token')
  const rawBase = (window as Window & { __HUAJAIY_API_BASE__?: string })
    .__HUAJAIY_API_BASE__
  const base = rawBase ? String(rawBase).replace(/\/$/, '') : ''
  if (!token || !base) return
  try {
    const r = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = (await r.json().catch(() => ({}))) as {
      ok?: boolean
      user?: Record<string, unknown>
    }
    if (r.ok && data.ok && data.user) applyFromUser(data.user)
  } catch {
    /* ignore */
  }
}

function onMemberUser(ev: Event) {
  const d = (ev as CustomEvent<Record<string, unknown>>).detail
  applyFromUser(d)
}

onMounted(() => {
  loadFromWindow()
  void fetchMe()
  window.addEventListener('huajaiy-member-user', onMemberUser as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('huajaiy-member-user', onMemberUser as EventListener)
})
</script>
