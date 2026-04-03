<template>
  <admin-layout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        ฟอร์มเดิมกับหลังบ้าน — แสดงในเทมเพลตสมาชิก
      </p>
      <router-link
        to="/my-games"
        class="text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
      >
        ← กลับเกมของฉัน
      </router-link>
    </div>

    <div
      class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/30"
    >
      <iframe
        :key="iframeSrc"
        :src="iframeSrc"
        :title="pageTitle"
        class="block min-h-[min(88vh,960px)] w-full border-0 bg-white"
        referrerpolicy="same-origin"
      />
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const pageTitle = 'สร้างเกมใหม่'
const route = useRoute()
const iframeSrc = ref('/account/create-game?member_embed=1')

function buildStudioUrl() {
  let u = '/account/create-game?member_embed=1'
  try {
    const q = new URLSearchParams(window.location.search)
    const g = q.get('member_game')
    if (g && UUID_RE.test(String(g).trim())) {
      u += `&game=${encodeURIComponent(String(g).trim())}`
    }
  } catch {
    /* ignore */
  }
  return u
}

function syncIframeSrc() {
  iframeSrc.value = buildStudioUrl()
}

onMounted(() => {
  syncIframeSrc()
})

watch(
  () => route.fullPath,
  () => {
    syncIframeSrc()
  }
)
</script>
