<template>
  <li
    class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
  >
    <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table class="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              รางวัลสิ่งของจาก
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              รางวัลที่ได้
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              ชนะกี่ครั้ง
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">
              รวมรางวัลที่ได้
            </th>
            <th class="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
              รายละเอียด
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-white dark:bg-gray-900/20">
            <td class="px-3 py-3 font-medium text-rose-600 dark:text-rose-400">{{ creatorDisplay }}</td>
            <td class="max-w-[220px] px-3 py-3 text-gray-800 dark:text-gray-200">{{ prizeName }}</td>
            <td class="whitespace-nowrap px-3 py-3 tabular-nums text-gray-600 dark:text-gray-400">
              {{ winCount }} ครั้ง
            </td>
            <td class="px-3 py-3 text-center align-middle">
              <span class="inline-block font-semibold tabular-nums text-gray-800 dark:text-white">
                {{ unitsLabel }} หน่วย
              </span>
              <span class="mt-0.5 block text-sm font-normal text-gray-500 dark:text-gray-400">
                (ผลรวมจากทุกครั้งที่ชนะในกลุ่มนี้)
              </span>
            </td>
            <td class="px-3 py-3 align-middle">
              <button
                type="button"
                class="text-sm font-semibold text-rose-600 underline decoration-gray-300 underline-offset-2 dark:text-rose-400"
                @click="open = !open"
              >
                {{ open ? 'ซ่อนรายละเอียด' : 'ดูรายการที่ได้' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="open" class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
      <div
        class="mb-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/90 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-gray-700 dark:text-gray-300">
          {{
            allPickup
              ? 'ผู้สร้างตั้งค่าให้มารับเอง — กด「แจ้งผู้สร้างว่าจะมารับ」ในแต่ละแถวเพื่อแจ้งผู้สร้างว่าคุณรับทราบและจะมารับตามที่นัดหมาย'
              : allShip
                ? 'จัดส่งตามที่อยู่ที่บันทึกในโปรไฟล์ — ใช้ได้ทั้งรายการเดียวหรือหลายรายการในกลุ่มนี้เมื่อผู้สร้างเลือกส่งของ'
                : 'ในกลุ่มนี้อาจมีทั้งแบบมารับเองและจัดส่ง — ดูคอลัมน์「วิธีรับรางวัล」ของแต่ละแถว'
          }}
        </p>
        <div v-if="!allPickup" class="flex flex-wrap gap-2">
          <a
            href="/member/profile"
            target="_parent"
            rel="noopener noreferrer"
            class="inline-flex rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            ตั้งค่าที่อยู่จัดส่ง (ทั้งหมดในกลุ่ม)
          </a>
        </div>
      </div>

      <p v-if="pickupAckErr" class="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">
        {{ pickupAckErr }}
      </p>

      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table class="min-w-[880px] w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <th class="whitespace-nowrap px-3 py-2.5">วันเวลาที่ชนะ</th>
              <th class="min-w-[120px] px-3 py-2.5">รางวัล</th>
              <th class="whitespace-nowrap px-3 py-2.5">รหัสเกม</th>
              <th class="whitespace-nowrap px-3 py-2.5">หน่วย/ครั้ง</th>
              <th class="min-w-[140px] px-3 py-2.5">สถานะการส่งมอบ</th>
              <th class="min-w-[140px] px-3 py-2.5">วิธีรับรางวัล</th>
              <th class="min-w-[200px] px-3 py-2.5">ติดต่อรับรางวัล</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="a in safeItems" :key="rowKey(a)" class="bg-white dark:bg-gray-900/10">
              <td class="whitespace-nowrap px-3 py-2.5 tabular-nums text-gray-600 dark:text-gray-400">
                {{ formatWonAt(a.wonAt) }}
              </td>
              <td class="max-w-[220px] px-3 py-2.5 text-gray-700 dark:text-gray-300">{{ prizeLine(a) }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 font-mono text-sm text-gray-600 dark:text-gray-400">
                {{ displayGameCode(a) }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 tabular-nums text-sm">
                {{ itemUnitsPerWin(a).toLocaleString('th-TH') }}
              </td>
              <td class="px-3 py-2.5 text-sm">
                <span
                  class="inline-block rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
                >
                  {{ itemStatusLabel(a.itemFulfillmentStatus) }}
                </span>
                <span v-if="effMode(a) === 'pickup'" class="mt-1 block text-gray-700 dark:text-gray-300">
                  มารับเอง (นัดรับกับผู้สร้าง)
                </span>
                <span v-else-if="effMode(a) === 'ship'" class="mt-1 block text-gray-700 dark:text-gray-300">
                  จัดส่งตามที่อยู่
                  {{ shippingAddr(a) ? ` · ${shippingAddr(a)}` : '' }}
                  {{ a.itemTrackingCode ? ` · พัสดุ ${a.itemTrackingCode}` : '' }}
                </span>
                <span v-else class="mt-1 block text-gray-500 dark:text-gray-400">รอผู้สร้างกำหนดวิธีรับ</span>
              </td>
              <td class="px-3 py-2.5 align-top text-sm text-gray-700 dark:text-gray-300">
                {{ itemReceiptMethodLabelThai(a) }}
              </td>
              <td class="px-3 py-2.5 align-top">
                <div class="space-y-2">
                  <a
                    v-if="lineHref(a)"
                    :href="lineHref(a)!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex rounded-lg bg-[#06C755] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95"
                  >
                    เปิดแชท LINE ผู้สร้าง
                  </a>
                  <p v-else class="text-sm text-gray-700 dark:text-gray-300">
                    ผู้สร้างยังไม่ได้ใส่ LINE ในโปรไฟล์
                    <template v-if="creatorUsername"> (@{{ String(creatorUsername).replace(/^@+/, '') }})</template>
                  </p>
                  <p
                    v-if="lineRaw(a) && !/^https?:\/\//i.test(lineRaw(a))"
                    class="font-mono text-sm text-gray-500 dark:text-gray-400"
                  >
                    {{ lineRaw(a) }}
                  </p>
                  <div v-if="effMode(a) === 'pickup'" class="border-t border-gray-200 pt-2 dark:border-gray-700">
                    <p v-if="a.winnerPickupAckAt" class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      แจ้งรับทราบแล้ว · {{ formatWonAt(a.winnerPickupAckAt) }}
                    </p>
                    <button
                      v-else
                      type="button"
                      :disabled="pickupBusyId === String(a.id)"
                      class="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-sm font-semibold text-rose-800 hover:bg-gray-50 disabled:opacity-50 dark:border-rose-700 dark:bg-gray-900 dark:text-rose-200"
                      @click="handleWinnerPickupAck(String(a.id))"
                    >
                      {{
                        pickupBusyId === String(a.id) ? 'กำลังบันทึก…' : 'แจ้งผู้สร้างว่าจะมารับ'
                      }}
                    </button>
                  </div>
                  <div v-else-if="effMode(a) === 'ship'" class="border-t border-gray-200 pt-2 dark:border-gray-700">
                    <a
                      href="/member/profile"
                      target="_parent"
                      rel="noopener noreferrer"
                      class="text-left text-sm font-semibold text-rose-600 underline dark:text-rose-400"
                    >
                      ตั้งค่าที่อยู่จัดส่งในโปรไฟล์
                    </a>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        การอัปเดตสถานะจัดส่งเป็นหน้าที่ผู้สร้างเกม — ฝั่งคุณสามารถตรวจสอบที่อยู่ในโปรไฟล์ให้ถูกต้องก่อนผู้สร้างจัดส่ง
        <template v-if="allPickup || receiptModes.some((m) => m === 'pickup')">
          · มารับเอง: กด「แจ้งผู้สร้างว่าจะมารับ」เพื่อบันทึกเวลาให้ผู้สร้างเห็น — ติดต่อนัดรับผ่าน LINE ด้านขวา
        </template>
      </p>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ItemPrizeGroup, PrizeAward } from '@/utils/memberPrizeUtils'
import {
  displayGameCode,
  formatWonAt,
  itemEffectiveFulfillmentMode,
  itemReceiptMethodLabelThai,
  itemStatusLabel,
  itemUnitsPerWin,
  lineContactHref,
  prizeLine
} from '@/utils/memberPrizeUtils'
import { apiPostWinnerPickupAck, huajaiyMemberToken } from '@/utils/memberSectionApi'

const props = defineProps<{
  group: ItemPrizeGroup
}>()

const emit = defineEmits<{
  'refresh-awards': []
}>()

const open = ref(false)
const pickupBusyId = ref<string | null>(null)
const pickupAckErr = ref('')

const creatorUsername = computed(() => props.group.creatorUsername)
const safeItems = computed(() => (Array.isArray(props.group.items) ? props.group.items : []))
const creatorDisplay = computed(() =>
  creatorUsername.value && creatorUsername.value.length > 0
    ? `@${creatorUsername.value}`
    : 'ไม่ระบุผู้สร้างเกม'
)
const sample = computed(() => safeItems.value[0])
const prizeName = computed(() => prizeLine(sample.value || {}))
const winCount = computed(() => safeItems.value.length)
const totalUnits = computed(() => safeItems.value.reduce((s, a) => s + itemUnitsPerWin(a), 0))
const unitsLabel = computed(() => {
  const u = totalUnits.value
  return Number.isInteger(u) ? u.toLocaleString('th-TH') : u.toLocaleString('th-TH', { maximumFractionDigits: 2 })
})

const receiptModes = computed(() => safeItems.value.map((a) => itemEffectiveFulfillmentMode(a)))
const allPickup = computed(
  () => receiptModes.value.length > 0 && receiptModes.value.every((m) => m === 'pickup')
)
const allShip = computed(
  () => receiptModes.value.length > 0 && receiptModes.value.every((m) => m === 'ship')
)

function effMode(a: PrizeAward) {
  return itemEffectiveFulfillmentMode(a)
}

function shippingAddr(a: PrizeAward): string {
  const snap = a.itemShippingAddressSnapshot
  if (snap && typeof snap === 'object') return String(snap.address || '').trim()
  return ''
}

function lineRaw(a: PrizeAward): string {
  return a.creatorPrizeContactLine != null ? String(a.creatorPrizeContactLine).trim() : ''
}

function lineHref(a: PrizeAward): string | null {
  return lineContactHref(lineRaw(a))
}

function rowKey(a: PrizeAward): string {
  return a.id != null ? String(a.id) : `row-${a.wonAt}-${prizeLine(a)}`
}

async function handleWinnerPickupAck(awardId: string) {
  const token = huajaiyMemberToken()
  if (!token) return
  pickupBusyId.value = awardId
  pickupAckErr.value = ''
  try {
    await apiPostWinnerPickupAck(token, awardId)
    emit('refresh-awards')
  } catch (e) {
    pickupAckErr.value = e instanceof Error ? e.message : String(e)
  } finally {
    pickupBusyId.value = null
  }
}
</script>
