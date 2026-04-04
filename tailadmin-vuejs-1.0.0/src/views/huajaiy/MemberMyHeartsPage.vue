<template>
  <admin-layout>
    <PageBreadcrumb page-title="หัวใจแดงห้องเกม" />

    <div class="space-y-6">
      <div v-if="authLoading" class="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด…</div>
      <div
        v-else-if="!user"
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
      >
        กรุณาเข้าสู่ระบบเพื่อดูหัวใจ
      </div>
      <template v-else>
        <div
          v-if="loadErr"
          class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {{ loadErr }}
        </div>

        <div
          v-if="dbRequired"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          ระบบยังไม่เชื่อมฐานข้อมูล — ไม่มีประวัติแดงห้องให้แสดง
        </div>

        <div
          v-if="timelineIncomplete"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          มีรายการในประวัติมากกว่าที่โหลดในครั้งเดียว — ตารางอาจไม่ครบทุกเหตุการณ์
          จึงยังยืนยันยอด «คงเหลือ» ทุกแถวเทียบยอดด้านบนไม่ได้ หากต้องการให้ครบ ติดต่อผู้ดูแลระบบ
        </div>

        <section
          v-for="block in roomBlocks"
          :key="block.creatorId"
          class="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-sm dark:border-gray-700 dark:from-gray-900 dark:to-gray-900/80"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80"
          >
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                ห้อง @{{ block.creatorUsername }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-gray-400">
                ยอดแดงห้องปัจจุบัน
                <span class="font-semibold tabular-nums text-red-600 dark:text-red-400">{{
                  fmt(block.currentBalance)
                }}</span>
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-rose-500/50 dark:hover:bg-gray-700 dark:hover:text-rose-200"
              @click="toggleRoomDetail(block.creatorId)"
            >
              {{ roomDetailOpen[block.creatorId] ? 'ซ่อนรายละเอียด' : 'รายละเอียด' }}
            </button>
          </div>

          <template v-if="roomDetailOpen[block.creatorId]">
            <div
              v-if="block.rows.length === 0"
              class="px-4 py-8 text-center text-sm text-slate-500"
            >
              ยังไม่มีประวัติในช่วงที่โหลด (หรือยังไม่เคยแลกรหัส/เล่นเกมของห้องนี้)
            </div>
            <div v-else class="overflow-x-auto">
            <p
              v-if="!block.reconciled && !timelineIncomplete"
              class="border-b border-red-100 bg-red-50/90 px-4 py-2 text-xs font-medium text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
              role="alert"
            >
              ยอดสะสมจากประวัติที่แสดงไม่ตรงกับยอดในระบบ — กรุณาแจ้งผู้ดูแล
            </p>
            <p
              class="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs leading-relaxed text-slate-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
            >
              คอลัมน์ «คงเหลือ» คำนวณตามเวลาจริงจากฐานข้อมูล (แลกรหัส + หักแดงห้องตอนเล่นเกม) ให้สอดคล้องกับยอดด้านบนเมื่อโหลดประวัติครบ
            </p>
            <table class="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr class="border-b border-slate-200 bg-white text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">วันที่</th>
                  <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wide">รายการ</th>
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">จำนวน</th>
                  <th class="whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-wide">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in block.rows"
                  :key="row.key"
                  :class="i % 2 === 1 ? 'bg-slate-50/60 dark:bg-gray-800/40' : ''"
                  class="border-b border-slate-100 dark:border-gray-800"
                >
                  <td class="whitespace-nowrap px-4 py-2.5 align-top tabular-nums text-slate-600 dark:text-gray-300">
                    {{ row.when }}
                  </td>
                  <td class="max-w-md px-4 py-2.5 align-top text-slate-800 dark:text-gray-100">
                    <span class="font-medium">{{ row.itemLine }}</span>
                    <a
                      v-if="row.gameId"
                      class="mt-1 block text-xs font-semibold text-rose-600 hover:text-rose-800 dark:text-rose-400"
                      :href="gameHref(row.gameId)"
                      target="_parent"
                      rel="noopener noreferrer"
                      >เปิดหน้าเกม</a
                    >
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 align-top">
                    <span
                      class="font-semibold tabular-nums"
                      :class="
                        row.delta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.delta < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-500'
                      "
                      >{{ row.delta > 0 ? '+' : '' }}{{ fmt(Math.abs(row.delta)) }}</span
                    >
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 align-top font-semibold tabular-nums text-slate-900 dark:text-white">
                    {{ fmt(row.balanceAfter) }}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </template>
        </section>

        <p
          v-if="roomBlocks.length === 0 && !loadErr && !dbRequired"
          class="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          ยังไม่มีห้องแดง — แลกรหัสจากเจ้าของห้องเพื่อรับแดงห้อง
        </p>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  apiGetMyRoomRedRoomTimeline,
  huajaiyMemberToken,
  type RoomRedTimelineBlock,
} from '@/utils/memberSectionApi'
import { useHuajaiyMemberProfile } from '@/composables/useHuajaiyMemberProfile'

const { user, loading: authLoading, load: loadProfile } = useHuajaiyMemberProfile()

const loadErr = ref('')
const dbRequired = ref(false)
const timelineIncomplete = ref(false)
const roomBlocks = ref<RoomRedTimelineBlock[]>([])
const roomDetailOpen = reactive<Record<string, boolean>>({})

function toggleRoomDetail(creatorId: string) {
  roomDetailOpen[creatorId] = !roomDetailOpen[creatorId]
}

function fmt(n: number) {
  return Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('th-TH')
}

function gameHref(id: string) {
  const g = encodeURIComponent(String(id).trim())
  return `/game/${g}`
}

async function loadHistory() {
  loadErr.value = ''
  dbRequired.value = false
  timelineIncomplete.value = false
  roomBlocks.value = []
  const token = huajaiyMemberToken()
  if (!token) return
  try {
    const data = await apiGetMyRoomRedRoomTimeline(token)
    roomBlocks.value = data.rooms
    timelineIncomplete.value = data.historyIncomplete
    dbRequired.value = Boolean(data.dbRequired)
  } catch (e) {
    loadErr.value = e instanceof Error ? e.message : String(e)
    roomBlocks.value = []
  }
}

onMounted(() => {
  void loadProfile()
})

watch(
  () => user.value?.id,
  (id) => {
    if (id) void loadHistory()
  },
  { immediate: true },
)
</script>
