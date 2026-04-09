<template>
  <div
    class="grid w-full grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40 sm:gap-2"
    :class="
      showSetPicker
        ? 'sm:grid-cols-[repeat(13,minmax(0,1fr))]'
        : 'sm:grid-cols-12'
    "
  >
    <div v-if="showSetPicker" class="sm:col-span-1">
      <label class="text-base text-gray-600 dark:text-gray-400">ชุด (0=ชุด1)</label>
      <input
        type="number"
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base text-gray-800 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-800/80"
        :min="0"
        :max="Math.max(0, setCount - 1)"
        :value="r.setIndex"
        :disabled="structureLocked"
        @input="emitPatch('setIndex', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="sm:col-span-1">
      <label class="text-base text-gray-600 dark:text-gray-400">ลำดับตรวจ</label>
      <input
        type="number"
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        min="0"
        :value="r.sortOrder"
        :disabled="structureLocked"
        title="เลขน้อยตรวจก่อน — ค่าเริ่มต้นตามเลขชุด ปรับได้เมื่อต้องการสลับลำดับระหว่างชุด"
        @input="emitPatch('sortOrder', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="sm:col-span-1">
      <label class="text-base text-gray-600 dark:text-gray-400">เปิดครบ (สูงสุด {{ cap }})</label>
      <input
        type="number"
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :min="1"
        :max="cap"
        :value="r.needCount"
        :disabled="structureLocked"
        @input="emitPatch('needCount', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="sm:col-span-1">
      <label class="text-base text-gray-600 dark:text-gray-400">จำนวนรางวัล</label>
      <div
        v-if="r.prizeCategory === 'none'"
        class="mt-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-2 text-center text-base text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
        title="หมวดไม่มีรางวัล"
      >
        ไม่จำกัด
      </div>
      <template v-else>
        <input
          type="number"
          class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          :min="prizeQtyMin"
          max="999999"
          :value="r.prizeTotalQty ?? 1"
          :title="
            gamePrizeQtyLocked && prizeQtyMin > 1
              ? `หลังเผยแพร่แล้วตั้งขั้นต่ำ ${prizeQtyMin} — เพิ่มได้อย่างเดียว`
              : gamePrizeQtyLocked
                ? 'หลังเผยแพร่แล้วเพิ่มจำนวนได้อย่างเดียว ลดไม่ได้'
                : undefined
          "
          @input="onQtyInput($event)"
        />
        <p v-if="gamePrizeQtyLocked" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          หลังเผยแพร่: เพิ่มได้เท่านั้น (ขั้นต่ำ {{ prizeQtyMin }})
        </p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          รับรางวัลแล้ว {{ awardedCount }} · เหลือ {{ remainingQty }} จากทั้งหมด {{ totalQty }}
        </p>
      </template>
    </div>
    <div class="sm:col-span-2">
      <label class="text-base text-gray-600 dark:text-gray-400">หมวดรางวัล</label>
      <select
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :value="r.prizeCategory"
        :disabled="structureLocked"
        @change="emit('changeCategory', idx, ($event.target as HTMLSelectElement).value)"
      >
        <option value="cash">เงินสด</option>
        <option value="item">สิ่งของ</option>
        <option value="none">ไม่มีรางวัล</option>
      </select>
    </div>
    <div class="sm:col-span-2">
      <label class="text-base text-gray-600 dark:text-gray-400">หัวข้อรางวัล</label>
      <input
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :value="r.prizeTitle"
        :disabled="isNone || structureLocked"
        placeholder="เช่น รางวัลที่ 1"
        @input="emitPatch('prizeTitle', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="sm:col-span-2">
      <label class="text-base text-gray-600 dark:text-gray-400">รายละเอียด</label>
      <input
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :value="r.prizeValueText"
        :disabled="isNone || structureLocked"
        placeholder="เช่น 1000"
        @input="emitPatch('prizeValueText', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="sm:col-span-1">
      <label class="text-base text-gray-600 dark:text-gray-400">หน่วย</label>
      <select
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :value="units.includes(r.prizeUnit) ? r.prizeUnit : units[0]"
        :disabled="isNone || structureLocked"
        @change="emitPatch('prizeUnit', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="u in units" :key="u" :value="u">{{ u }} หน่วย</option>
      </select>
    </div>
    <div class="sm:col-span-2">
      <label class="text-base text-gray-600 dark:text-gray-400">การจ่ายรางวัล</label>
      <select
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-2 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :value="fulfillGrid"
        :disabled="isNone || structureLocked"
        @change="emitPatch('prizeFulfillmentMode', ($event.target as HTMLSelectElement).value)"
      >
        <template v-if="r.prizeCategory === 'cash'">
          <option value="pickup">มารับเอง</option>
          <option value="transfer">โอนรางวัลให้</option>
        </template>
        <template v-else-if="r.prizeCategory === 'item'">
          <option value="pickup">มารับเอง</option>
          <option value="ship">จัดส่งตามที่อยู่</option>
        </template>
        <option v-else value="">—</option>
      </select>
    </div>
    <div :class="showSetPicker ? 'sm:col-span-full' : 'sm:col-span-12'">
      <label class="text-base text-gray-600 dark:text-gray-400">หมายเหตุ</label>
      <input
        class="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-base disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        :value="r.description"
        :disabled="structureLocked"
        @input="emitPatch('description', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CENTRAL_GAME_UNITS } from '@/lib/huajaiyCentralGameDefaults'

export interface StudioRuleRow {
  id?: string
  setIndex: number
  needCount: number
  prizeCategory: string
  prizeFulfillmentMode: string
  prizeTitle: string
  prizeValueText: string
  prizeUnit: string
  sortOrder: number
  description: string
  prizeTotalQty: number | null
  minPrizeTotalQty?: number | null
  prizeAwardedCount?: number
  prizeRemainingQty?: number | null
}

const props = defineProps<{
  r: StudioRuleRow
  idx: number
  needCap?: number
  showSetPicker?: boolean
  setCount: number
  setSizes: number[]
  gamePrizeQtyLocked: boolean
  structureLocked: boolean
}>()

const emit = defineEmits<{
  patch: [idx: number, field: keyof StudioRuleRow | string, value: unknown]
  changeCategory: [idx: number, value: string]
}>()

const units = [...CENTRAL_GAME_UNITS]

const si = computed(() =>
  Math.min(props.setCount - 1, Math.max(0, Math.floor(Number(props.r.setIndex)) || 0))
)

const cap = computed(
  () =>
    props.needCap ??
    Math.max(1, parseInt(String(props.setSizes[si.value] ?? props.setSizes[0]), 10) || 1)
)

const isNone = computed(() => props.r.prizeCategory === 'none')
const awardedCount = computed(() => Math.max(0, Math.floor(Number(props.r.prizeAwardedCount) || 0)))
const totalQty = computed(() =>
  isNone.value ? null : Math.max(1, Math.floor(Number(props.r.prizeTotalQty) || 1))
)
const remainingQty = computed(() =>
  totalQty.value == null ? null : Math.max(0, totalQty.value - awardedCount.value)
)

const prizeQtyMin = computed(() => {
  if (!props.gamePrizeQtyLocked || isNone.value) return 1
  return Math.max(
    1,
    Math.floor(Number(props.r.minPrizeTotalQty) || 1),
    Math.floor(Number(awardedCount.value) || 0)
  )
})

const fulfillGrid = computed(() => {
  const r = props.r
  if (r.prizeCategory === 'cash') {
    return r.prizeFulfillmentMode === 'pickup' ? 'pickup' : 'transfer'
  }
  if (r.prizeCategory === 'item') {
    return r.prizeFulfillmentMode === 'pickup' ? 'pickup' : 'ship'
  }
  return ''
})

function emitPatch(field: string, value: unknown) {
  emit('patch', props.idx, field, value)
}

function onQtyInput(e: Event) {
  const el = e.target as HTMLInputElement
  const raw = Math.max(prizeQtyMin.value, parseInt(el.value, 10) || prizeQtyMin.value)
  emitPatch('prizeTotalQty', raw)
}
</script>
