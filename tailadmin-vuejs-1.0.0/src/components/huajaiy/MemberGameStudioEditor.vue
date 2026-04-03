<template>
  <section class="space-y-6 text-base">
    <p v-if="err" class="text-lg text-red-600 dark:text-red-400" role="alert">{{ err }}</p>
    <p
      v-if="msg"
      class="text-lg"
      :class="msg.includes('แล้ว') ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-200'"
    >
      {{ msg }}
    </p>

    <p v-if="loading" class="text-lg text-gray-500 dark:text-gray-400" aria-live="polite">กำลังโหลด…</p>

    <div v-else class="space-y-6">
      <div
        v-if="awardEditLocked"
        class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base leading-relaxed text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <strong>มีผู้ได้รับรางวัลจากเกมนี้แล้ว ({{ prizeAwardCount }} รายการ)</strong>
        — แก้ได้เฉพาะเพิ่มจำนวนรางวัลเท่านั้น
      </div>

      <form class="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/30 lg:p-6" @submit.prevent>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">โครงชุดและรูปภาพ</h3>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="text-base font-medium text-gray-800 dark:text-gray-200">
              ชื่อเกม {{ creatorLimitedMode ? '(แก้ไขไม่ได้)' : '' }}
            </label>
            <input
              v-model="title"
              class="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              :class="creatorLimitedMode ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800/80' : ''"
              :readonly="creatorLimitedMode"
              :placeholder="creatorLimitedMode ? 'ชื่อเกม (ล็อก)' : 'ชื่อเกม'"
            />
          </div>
          <div>
            <label class="text-base font-medium text-gray-700 dark:text-gray-300">รหัสเกม (คงเดิม)</label>
            <input
              readonly
              :value="gameCode"
              placeholder="หลังเผยแพร่จะมีรหัสเกม"
              class="mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 font-mono text-base text-gray-800 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="text-base font-medium text-gray-800 dark:text-gray-200">รายละเอียด</label>
            <textarea
              v-model="gameDescription"
              rows="5"
              class="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-lg leading-relaxed text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="อธิบายเกมให้ผู้เล่นเห็น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
            />
          </div>
          <div class="sm:col-span-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
            <input
              id="allow-gift-red"
              v-model="allowGiftRedPlay"
              type="checkbox"
              class="mt-1 h-5 w-5 rounded border-gray-300"
            />
            <label for="allow-gift-red" class="text-base leading-relaxed text-amber-950 dark:text-amber-100">
              <span class="font-semibold">รับหัวใจแดงจากรหัสห้อง (ทุกเจ้าของห้อง)</span>
            </label>
          </div>
          <div>
            <label class="text-base font-medium text-gray-800 dark:text-gray-200">จำนวนชุด</label>
            <input
              type="number"
              min="1"
              class="mt-2 w-full max-w-xs rounded-xl border border-gray-300 px-4 py-3 text-lg disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/80"
              :disabled="awardEditLocked"
              :value="setCount"
              @input="onSetCountInput"
            />
          </div>
          <div>
            <label class="text-base font-medium text-gray-800 dark:text-gray-200">ป้ายรวม (คำนวณอัตโนมัติ)</label>
            <p class="mt-3 font-mono text-xl text-gray-900 dark:text-white">{{ tileCount }}</p>
          </div>

          <div class="sm:col-span-2 rounded-xl border border-rose-100 bg-rose-50/50 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
            <p class="text-lg font-semibold text-gray-900 dark:text-white">การหักหัวใจต่อรอบ</p>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="text-base text-gray-700 dark:text-gray-300">โหมดชำระหัวใจ</label>
                <select
                  v-model="heartCurrencyMode"
                  class="mt-2 w-full max-w-lg rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  :disabled="awardEditLocked"
                >
                  <option value="both">หักทั้งชมพูและแดง (ตามจำนวนที่ใส่)</option>
                  <option value="pink_only">รับเฉพาะหัวใจชมพู</option>
                  <option value="red_only">รับเฉพาะหัวใจแดง</option>
                  <option value="either">รับชมพูหรือแดงอย่างใดอย่างหนึ่ง (ผู้เล่นเลือกตอนเริ่ม)</option>
                </select>
              </div>
              <div class="sm:col-span-2 flex gap-3 rounded-xl border border-gray-200 bg-white/90 px-4 py-3 dark:border-gray-600 dark:bg-gray-800/80">
                <input
                  id="accepts-pink"
                  v-model="acceptsPinkHearts"
                  type="checkbox"
                  class="mt-1 h-5 w-5"
                  :disabled="awardEditLocked"
                />
                <label for="accepts-pink" class="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                  ห้องนี้รับหัวใจชมพู (ปิดถ้าต้องการให้เล่นด้วยแดงเท่านั้น)
                </label>
              </div>
              <div>
                <label class="text-base text-gray-700 dark:text-gray-300">หักหัวใจชมพูต่อรอบ</label>
                <input
                  v-model.number="pinkHeartCost"
                  type="number"
                  min="0"
                  class="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  :disabled="awardEditLocked"
                />
              </div>
              <div>
                <label class="text-base text-gray-700 dark:text-gray-300">หักหัวใจแดงต่อรอบ</label>
                <input
                  v-model.number="redHeartCost"
                  type="number"
                  min="0"
                  class="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  :disabled="awardEditLocked"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            แต่ละชุด — ซ้าย: ป้ายและรูป · ขวา: กติกาและรางวัล
          </p>

          <div
            v-for="s in setCount"
            :key="s - 1"
            class="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-800/40 xl:flex-row xl:items-stretch"
          >
            <div
              class="flex flex-shrink-0 flex-wrap items-end gap-4 border-b border-gray-200 pb-5 xl:w-[min(100%,260px)] xl:border-b-0 xl:border-r xl:border-gray-200 xl:pb-0 xl:pr-5 dark:border-gray-600"
            >
              <div class="flex flex-col">
                <span class="text-lg font-semibold text-gray-900 dark:text-white">ชุดที่ {{ s }}</span>
                <label class="mt-2 text-base text-gray-600 dark:text-gray-400">จำนวนป้ายในชุดนี้</label>
                <input
                  type="number"
                  min="1"
                  class="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-2 text-lg disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  :value="setSizeAt(s - 1)"
                  :disabled="awardEditLocked"
                  @input="setSetSize(s - 1, ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="w-32 shrink-0 sm:w-36">
                <p class="mb-2 text-base text-gray-500 dark:text-gray-400">ตัวอย่าง</p>
                <div class="aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
                  <img
                    v-if="imageMap[`${s - 1}-0`]"
                    :key="imageMap[`${s - 1}-0`]"
                    :src="imageMap[`${s - 1}-0`]"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full items-center justify-center p-2 text-center text-base text-gray-400 dark:text-gray-500"
                  >
                    เลือกรูป
                  </div>
                </div>
              </div>
              <div class="min-w-[200px] flex-1">
                <label class="text-base font-medium text-gray-800 dark:text-gray-200">อัปโหลดรูปชุดนี้ (1 ไฟล์)</label>
                <input
                  type="file"
                  accept="image/*"
                  class="mt-2 block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:font-medium file:text-rose-800 disabled:opacity-50 dark:file:bg-rose-950/50 dark:file:text-rose-200"
                  :disabled="awardEditLocked"
                  @change="onSetImageFile(s - 1, $event)"
                />
              </div>
            </div>

            <div class="min-w-0 flex-1 space-y-3 xl:pl-2">
              <div>
                <span class="text-lg font-semibold text-gray-900 dark:text-white">กติกาและรางวัล — ชุดที่ {{ s }}</span>
                <p class="mt-1 text-base text-gray-600 dark:text-gray-400">
                  ลำดับตรวจเริ่มที่เลขชุด ({{ s }}) — ปรับได้ถ้าต้องการให้ชุดอื่นตรวจก่อน/หลัง
                </p>
              </div>
              <div class="space-y-4">
                <MemberCentralGameRuleRow
                  v-for="{ r, idx } in rulesForSet(s - 1)"
                  :key="r.id || `rule-${idx}`"
                  :r="r"
                  :idx="idx"
                  :need-cap="setSizeAt(s - 1)"
                  :show-set-picker="false"
                  :set-count="setCount"
                  :set-sizes="setSizes"
                  :game-prize-qty-locked="gamePrizeQtyLocked || awardEditLocked"
                  :structure-locked="awardEditLocked"
                  @patch="onRulePatch"
                  @change-category="onRuleChangeCategory"
                />
              </div>
            </div>
          </div>

          <div
            v-if="orphanRules.length"
            class="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 dark:border-amber-700 dark:bg-amber-950/35"
          >
            <p class="text-lg font-semibold text-amber-950 dark:text-amber-100">กติกาที่อ้างอิงชุดไม่ถูกต้อง</p>
            <p class="mt-2 text-base text-amber-900 dark:text-amber-200">มักเกิดหลังลดจำนวนชุด — แก้เลขชุดหรือลบแถว</p>
            <div class="mt-4 space-y-4">
              <MemberCentralGameRuleRow
                v-for="{ r, idx } in orphanRules"
                :key="r.id || `orphan-${idx}`"
                :r="r"
                :idx="idx"
                :need-cap="capForOrphan(r)"
                :show-set-picker="true"
                :set-count="setCount"
                :set-sizes="setSizes"
                :game-prize-qty-locked="gamePrizeQtyLocked || awardEditLocked"
                :structure-locked="awardEditLocked"
                @patch="onRulePatch"
                @change-category="onRuleChangeCategory"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/40">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">รูปหน้าปกเกม</h3>
            <p class="mt-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
              แสดงบนหน้าแรกและหน้าเล่นเกม — ถ้าไม่อัปโหลดหรือกดคืนค่า จะใช้รูปหัวใจสีชมพูเป็นค่าเริ่มต้น
            </p>
            <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
              <div class="w-32 shrink-0 sm:w-36">
                <p class="mb-2 text-base text-gray-500">ตัวอย่าง</p>
                <div class="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                  <img
                    :key="gameCoverUrl.trim() || 'def'"
                    :src="gameCoverUrl.trim() || DEFAULT_CENTRAL_GAME_COVER_PATH"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div class="min-w-0 flex-1 space-y-3">
                <label class="text-base font-medium text-gray-800 dark:text-gray-200">อัปโหลดรูปหน้าปก (1 ไฟล์)</label>
                <input
                  type="file"
                  accept="image/*"
                  class="block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 dark:file:bg-gray-700 dark:file:text-gray-200"
                  @change="onCoverFile($event)"
                />
                <button
                  type="button"
                  class="text-base font-medium text-rose-600 underline hover:text-rose-700 dark:text-rose-400"
                  @click="gameCoverUrl = ''"
                >
                  ใช้รูปหัวใจชมพูเริ่มต้น
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/40">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">รูปหน้าปิดป้าย</h3>
            <p class="mt-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
              แสดงบนกระดานก่อนผู้เล่นเปิดป้าย — ถ้าไม่อัปโหลดหรือกดคืนค่า ระบบใช้รูปเริ่มต้นของเว็บ
            </p>
            <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
              <div class="w-32 shrink-0 sm:w-36">
                <p class="mb-2 text-base text-gray-500">ตัวอย่าง</p>
                <div class="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                  <img
                    :key="tileBackCoverUrl.trim() || 'def2'"
                    :src="tileBackCoverUrl.trim() || DEFAULT_TILE_BACK_COVER_PATH"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div class="min-w-0 flex-1 space-y-3">
                <label class="text-base font-medium text-gray-800 dark:text-gray-200">อัปโหลดรูปหน้าปิดป้าย (1 ไฟล์)</label>
                <input
                  type="file"
                  accept="image/*"
                  class="block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 dark:file:bg-gray-700 dark:file:text-gray-200"
                  @change="onTileBackFile($event)"
                />
                <button
                  type="button"
                  class="text-base font-medium text-rose-600 underline hover:text-rose-700 dark:text-rose-400"
                  @click="tileBackCoverUrl = ''"
                >
                  ใช้รูปเริ่มต้นของเว็บ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/40" role="region" aria-label="บันทึกและเผยแพร่เกม">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <button
              type="button"
              class="shrink-0 rounded-xl bg-rose-600 px-8 py-3.5 text-lg font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600"
              :disabled="savingAll || loading || gameActionBusy"
              @click="saveAllGameData"
            >
              {{ savingAll ? 'กำลังบันทึก…' : 'บันทึกข้อมูล' }}
            </button>
            <div class="min-w-0 flex-1">
              <p class="text-lg font-semibold text-gray-900 dark:text-white">บันทึกข้อมูล</p>
              <p class="mt-1 text-base text-gray-600 dark:text-gray-400">
                โปรดตรวจสอบรูปแบบเกม รางวัล ให้ถูกต้อง · หากกดเผยแพร่แล้วจะไม่สามารถแก้ไขโครงได้
              </p>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-3 border-t border-gray-200 pt-4 dark:border-gray-600">
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="gameActionBusy || savingAll"
              @click="activate"
            >
              เผยแพร่บนเว็บ
            </button>
            <button
              type="button"
              class="rounded-xl border border-gray-300 bg-white px-5 py-3 text-base font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              :disabled="gameActionBusy || savingAll"
              @click="deactivate"
            >
              หยุดการเผยแพร่
            </button>
            <button
              type="button"
              class="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-base font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
              :disabled="gameActionBusy || savingAll || prizeAwardCount > 0 || playCount > 0"
              :title="
                prizeAwardCount > 0 || playCount > 0
                  ? 'มีประวัติการเล่นหรือรับรางวัลแล้ว — ติดต่อผู้ดูแลระบบเพื่อลบ'
                  : undefined
              "
              @click="removeGame"
            >
              ลบเกม
            </button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MemberCentralGameRuleRow, { type StudioRuleRow } from './MemberCentralGameRuleRow.vue'
import {
  CENTRAL_GAME_UNITS,
  DEFAULT_CENTRAL_GAME_COVER_PATH,
  DEFAULT_TILE_BACK_COVER_PATH,
  DELETE_BLOCKED_HINT,
  PUBLISH_CONFIRM_MESSAGE
} from '@/lib/huajaiyCentralGameDefaults'
import { uploadGameImageFile } from '@/utils/centralGameImageUpload'

const props = defineProps<{ gameId: string }>()

const UNITS = [...CENTRAL_GAME_UNITS]

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

function assignParent(url: string) {
  try {
    if (window.top && window.top !== window) window.top.location.assign(url)
    else if (window.parent && window.parent !== window) window.parent.location.assign(url)
    else window.location.assign(url)
  } catch {
    window.location.assign(url)
  }
}

function resizeSetSizes(prev: number[], n: number, fill: number): number[] {
  const out = prev.slice(0, n).map((x) => Math.max(1, parseInt(String(x), 10) || 1))
  const f = Math.max(1, parseInt(String(fill), 10) || 1)
  while (out.length < n) out.push(out[out.length - 1] ?? f)
  return out
}

function emptyRuleForSet(setIdx: number): StudioRuleRow {
  const s = Math.max(0, Math.floor(Number(setIdx)) || 0)
  return {
    setIndex: s,
    needCount: 1,
    prizeCategory: 'cash',
    prizeFulfillmentMode: 'transfer',
    prizeTitle: '',
    prizeValueText: '',
    prizeUnit: UNITS[0],
    sortOrder: s + 1,
    description: '',
    prizeTotalQty: 1,
    minPrizeTotalQty: 1,
    prizeAwardedCount: 0,
    prizeRemainingQty: 1
  }
}

const loading = ref(true)
const err = ref('')
const msg = ref('')
const title = ref('')
const gameDescription = ref('')
const setCount = ref(1)
const setSizes = ref<number[]>([4])
const pinkHeartCost = ref(0)
const redHeartCost = ref(0)
const heartCurrencyMode = ref<'both' | 'pink_only' | 'red_only' | 'either'>('both')
const acceptsPinkHearts = ref(true)
const imageMap = ref<Record<string, string>>({})
const gameCoverUrl = ref('')
const tileBackCoverUrl = ref('')
const lobbyVisible = ref(false)
const allowGiftRedPlay = ref(false)
const rules = ref<StudioRuleRow[]>([])
const prizeAwardCount = ref(0)
const playCount = ref(0)
const gameCode = ref('')
const savingAll = ref(false)
const gameActionBusy = ref(false)

/** ตรงกับ React — flag นี้ไม่ถูกตั้งในโค้ดเดิม แต่คงไว้เพื่อความเข้ากัน */
const gamePrizeQtyLocked = false

const creatorLimitedMode = computed(() => lobbyVisible.value)
const awardEditLocked = computed(() => creatorLimitedMode.value && prizeAwardCount.value > 0)

const tileCount = computed(() =>
  setSizes.value.slice(0, setCount.value).reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0)
)

function setSizeAt(s: number): number {
  return Math.max(1, parseInt(String(setSizes.value[s] ?? setSizes.value[0]), 10) || 1)
}

function onSetCountInput(e: Event) {
  const n = Math.max(1, parseInt((e.target as HTMLInputElement).value, 10) || 1)
  setCount.value = n
  const last = setSizes.value[setSizes.value.length - 1] || 4
  setSizes.value = resizeSetSizes(setSizes.value, n, last)
}

function setSetSize(s: number, raw: string) {
  const v = Math.max(1, parseInt(raw, 10) || 1)
  const next = [...setSizes.value]
  next[s] = v
  setSizes.value = next
}

function rulesForSet(s: number) {
  return rules.value
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => (Math.max(0, Math.floor(Number(r.setIndex)) || 0)) === s)
    .sort((a, b) => (Number(a.r.sortOrder) || 0) - (Number(b.r.sortOrder) || 0))
}

const orphanRules = computed(() =>
  rules.value
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => {
      const si = Math.floor(Number(r.setIndex))
      if (Number.isNaN(si)) return true
      return si < 0 || si >= setCount.value
    })
)

function capForOrphan(r: StudioRuleRow) {
  const siClamp = Math.min(setCount.value - 1, Math.max(0, Math.floor(Number(r.setIndex)) || 0))
  return Math.max(1, parseInt(String(setSizes.value[siClamp] ?? setSizes.value[0]), 10) || 1)
}

function revokeBlobUrls(map: Record<string, string>) {
  for (const v of Object.values(map)) {
    if (v && String(v).startsWith('blob:')) URL.revokeObjectURL(v)
  }
}

async function fetchDetail(id: string) {
  const token = memberToken()
  if (!token) throw new Error('หมดเซสชัน — ล็อกอินใหม่')
  const r = await fetch(`${apiBase()}/api/admin/central-games/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) throw new Error(String(data.error || 'โหลดเกมไม่สำเร็จ'))
  return data
}

async function loadDetail() {
  const id = props.gameId
  if (!id) return
  loading.value = true
  err.value = ''
  msg.value = ''
  prizeAwardCount.value = 0
  playCount.value = 0
  try {
    const data = await fetchDetail(id)
    prizeAwardCount.value = Math.max(0, Math.floor(Number(data.prizeAwardCount)) || 0)
    playCount.value = Math.max(0, Math.floor(Number(data.playCount)) || 0)
    const g = data.game as Record<string, unknown> | undefined
    if (!g) {
      err.value = 'ไม่ได้รับข้อมูลเกมจากเซิร์ฟเวอร์'
      return
    }
    title.value = String(g.title || '')
    gameDescription.value = typeof g.description === 'string' ? g.description : ''
    gameCoverUrl.value =
      g.gameCoverUrl && String(g.gameCoverUrl).trim() ? String(g.gameCoverUrl).trim() : ''
    tileBackCoverUrl.value =
      g.tileBackCoverUrl && String(g.tileBackCoverUrl).trim()
        ? String(g.tileBackCoverUrl).trim()
        : ''
    const sc = Math.max(1, Math.floor(Number(g.setCount)) || 1)
    setCount.value = sc
    const fromApi = Array.isArray(g.setImageCounts) ? (g.setImageCounts as unknown[]) : null
    if (fromApi && fromApi.length) {
      setSizes.value = resizeSetSizes(
        fromApi.map((x) => Math.max(1, parseInt(String(x), 10) || 1)),
        sc,
        Math.max(1, Math.floor(Number(g.imagesPerSet)) || 4)
      )
    } else {
      setSizes.value = Array(sc).fill(Math.max(1, Math.floor(Number(g.imagesPerSet)) || 4))
    }
    pinkHeartCost.value =
      typeof g.pinkHeartCost === 'number' ? (g.pinkHeartCost as number) : Math.floor(Number(g.heartCost)) || 0
    redHeartCost.value = typeof g.redHeartCost === 'number' ? (g.redHeartCost as number) : 0
    lobbyVisible.value = Boolean(g.isPublished || g.isActive)
    allowGiftRedPlay.value = Boolean(g.allowGiftRedPlay)
    const hcm = String(g.heartCurrencyMode || '')
    heartCurrencyMode.value = ['both', 'pink_only', 'red_only', 'either'].includes(hcm)
      ? (hcm as 'both' | 'pink_only' | 'red_only' | 'either')
      : 'both'
    acceptsPinkHearts.value = g.acceptsPinkHearts !== false
    gameCode.value = g.gameCode && String(g.gameCode).trim() ? String(g.gameCode).trim() : ''

    const map: Record<string, string> = {}
    const images = (data.images as { setIndex?: number; imageUrl?: string }[]) || []
    for (const im of images) {
      const k0 = `${im.setIndex}-0`
      if (map[k0] === undefined && im.imageUrl) map[k0] = String(im.imageUrl)
    }
    revokeBlobUrls(imageMap.value)
    imageMap.value = map

    const apiRules = (data.rules as Record<string, unknown>[]) || []
    if (apiRules.length) {
      rules.value = apiRules.map((r) => {
        const si = Math.max(0, Math.floor(Number(r.setIndex)) || 0)
        const so = Math.floor(Number(r.sortOrder))
        const sortOrder = Number.isFinite(so) && so > 0 ? so : si + 1
        const q =
          r.prizeCategory === 'none'
            ? null
            : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1))
        const pfm = String(r.prizeFulfillmentMode || '').toLowerCase()
        const normalizedFulfill =
          r.prizeCategory === 'cash'
            ? pfm === 'pickup'
              ? 'pickup'
              : 'transfer'
            : r.prizeCategory === 'item'
              ? pfm === 'pickup'
                ? 'pickup'
                : 'ship'
              : ''
        return {
          id: r.id != null ? String(r.id) : undefined,
          setIndex: Number(r.setIndex),
          needCount: Number(r.needCount),
          prizeCategory: String(r.prizeCategory || 'cash'),
          prizeFulfillmentMode: normalizedFulfill,
          prizeTitle: String(r.prizeTitle || ''),
          prizeValueText: String(r.prizeValueText || ''),
          prizeUnit: UNITS.includes(String(r.prizeUnit)) ? String(r.prizeUnit) : UNITS[0],
          sortOrder,
          description: String(r.description || ''),
          prizeTotalQty: q,
          minPrizeTotalQty: r.prizeCategory === 'none' ? null : q,
          prizeAwardedCount:
            r.prizeCategory === 'none' ? 0 : Math.max(0, Math.floor(Number(r.prizeAwardedCount) || 0)),
          prizeRemainingQty:
            r.prizeCategory === 'none'
              ? null
              : Math.max(0, (q ?? 0) - Math.max(0, Math.floor(Number(r.prizeAwardedCount) || 0)))
        } as StudioRuleRow
      })
    } else {
      rules.value = Array.from({ length: sc }, (_, s) => emptyRuleForSet(s))
    }
  } catch (e: unknown) {
    prizeAwardCount.value = 0
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function ensureRulesPerSet() {
  if (loading.value || !props.gameId) return
  const covered = new Set<number>()
  for (const row of rules.value) {
    const si = Math.max(0, Math.floor(Number(row.setIndex)) || 0)
    if (si >= 0 && si < setCount.value) covered.add(si)
  }
  const toAdd: StudioRuleRow[] = []
  for (let s = 0; s < setCount.value; s += 1) {
    if (!covered.has(s)) toAdd.push(emptyRuleForSet(s))
  }
  if (toAdd.length) rules.value = [...rules.value, ...toAdd]
}

watch(
  () => [props.gameId, loading.value, setCount.value] as const,
  () => ensureRulesPerSet()
)

watch(
  () => props.gameId,
  (id) => {
    if (id) void loadDetail()
  },
  { immediate: true }
)

function updateRule(i: number, field: string, value: unknown) {
  rules.value = rules.value.map((r, j) => (j === i ? { ...r, [field]: value } : r))
}

function onRulePatch(idx: number, field: string, value: unknown) {
  if (field === 'setIndex') {
    const n = Math.max(0, Math.floor(Number(value) || 0))
    updateRule(idx, field, Math.min(setCount.value - 1, n))
    return
  }
  if (field === 'needCount' || field === 'sortOrder') {
    updateRule(idx, field, Math.floor(Number(value) || 0))
    return
  }
  updateRule(idx, field, value)
}

function onRuleChangeCategory(idx: number, value: string) {
  rules.value = rules.value.map((row, j) => {
    if (j !== idx) return row
    const v = value
    return {
      ...row,
      prizeCategory: v,
      prizeFulfillmentMode: v === 'none' ? '' : v === 'cash' ? 'transfer' : 'ship',
      prizeTotalQty: v === 'none' ? null : (row.prizeTotalQty ?? 1),
      minPrizeTotalQty: v === 'none' ? null : (row.minPrizeTotalQty ?? row.prizeTotalQty ?? 1)
    }
  })
}

function rulesPayload() {
  return rules.value.map((r, idx) => {
    const rawQty =
      r.prizeCategory === 'none' ? null : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1))
    const prizeTotalQty =
      r.prizeCategory === 'none'
        ? null
        : gamePrizeQtyLocked && r.minPrizeTotalQty != null
          ? Math.max(r.minPrizeTotalQty, rawQty!)
          : rawQty
    const pfmRaw = String(r.prizeFulfillmentMode || '').toLowerCase()
    const prizeFulfillmentMode =
      r.prizeCategory === 'none'
        ? null
        : r.prizeCategory === 'cash'
          ? pfmRaw === 'pickup'
            ? 'pickup'
            : 'transfer'
          : pfmRaw === 'pickup'
            ? 'pickup'
            : 'ship'
    const row: Record<string, unknown> = {
      setIndex: Math.floor(Number(r.setIndex)),
      needCount: Math.floor(Number(r.needCount)),
      prizeCategory: r.prizeCategory,
      prizeFulfillmentMode,
      prizeTitle: r.prizeTitle,
      prizeValueText: r.prizeValueText,
      prizeUnit: r.prizeUnit,
      sortOrder: r.sortOrder != null ? Number(r.sortOrder) : idx,
      description: r.description,
      prizeTotalQty
    }
    if (r.id) row.id = r.id
    return row
  })
}

function imagesReadyForSave(): boolean {
  for (let s = 0; s < setCount.value; s += 1) {
    const url = imageMap.value[`${s}-0`]
    if (!url || String(url).startsWith('blob:')) return false
  }
  return true
}

async function persistMeta() {
  const gid = props.gameId
  const token = memberToken()
  if (!token) throw new Error('หมดเซสชัน — ล็อกอินใหม่')
  const t = String(title.value || '').trim()
  if (!t) throw new Error('กรุณากรอกชื่อเกม')
  const counts = setSizes.value.slice(0, setCount.value).map((x) => Math.max(1, parseInt(String(x), 10) || 1))
  const r = await fetch(`${apiBase()}/api/admin/central-games/${encodeURIComponent(gid)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: t,
      description: gameDescription.value,
      gameCoverUrl: gameCoverUrl.value.trim() ? gameCoverUrl.value.trim() : null,
      tileBackCoverUrl: tileBackCoverUrl.value.trim() ? tileBackCoverUrl.value.trim() : null,
      setCount: setCount.value,
      setImageCounts: counts,
      tileCount: counts.reduce((a, b) => a + b, 0),
      pinkHeartCost: pinkHeartCost.value,
      redHeartCost: redHeartCost.value,
      heartCurrencyMode: heartCurrencyMode.value,
      acceptsPinkHearts: acceptsPinkHearts.value,
      allowGiftRedPlay: allowGiftRedPlay.value
    })
  })
  const data = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ')
}

async function persistImages() {
  const gid = props.gameId
  const token = memberToken()
  if (!token) throw new Error('หมดเซสชัน — ล็อกอินใหม่')
  const images: { setIndex: number; imageUrl: string }[] = []
  for (let s = 0; s < setCount.value; s += 1) {
    const url = imageMap.value[`${s}-0`]
    if (!url || String(url).startsWith('blob:')) {
      throw new Error(
        `ชุด ${s + 1}: ยังไม่มีรูปหรือกำลังอัปโหลด — รอจนเห็นรูปจากระบบแล้วค่อยบันทึกรูป`
      )
    }
    images.push({ setIndex: s, imageUrl: url })
  }
  const r = await fetch(`${apiBase()}/api/admin/central-games/${encodeURIComponent(gid)}/images`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ images, oneImagePerSet: true })
  })
  const data = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new Error(data.error || 'บันทึกรูปไม่สำเร็จ')
}

async function persistRules() {
  const gid = props.gameId
  const token = memberToken()
  if (!token) throw new Error('หมดเซสชัน — ล็อกอินใหม่')
  const r = await fetch(`${apiBase()}/api/admin/central-games/${encodeURIComponent(gid)}/rules`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ rules: rulesPayload() })
  })
  const data = (await r.json().catch(() => ({}))) as { error?: string }
  if (!r.ok) throw new Error(data.error || 'บันทึกกติกาไม่สำเร็จ')
}

async function persistAllForPublish() {
  await persistMeta()
  if (!imagesReadyForSave()) {
    throw new Error('เผยแพร่ไม่ได้: อัปโหลดรูปให้ครบทุกชุดก่อน (รอ URL จริงของระบบ ไม่ใช่ blob:)')
  }
  await persistImages()
  await persistRules()
}

async function saveAllGameData() {
  if (savingAll.value || !props.gameId) return
  savingAll.value = true
  err.value = ''
  msg.value = ''
  const parts: string[] = []
  try {
    await persistMeta()
    parts.push('โครง')
    if (imagesReadyForSave()) {
      await persistImages()
      parts.push('รูป')
    } else {
      parts.push('รูปยังไม่ครบ (ข้าม)')
    }
    await persistRules()
    parts.push('กติกา')
    await loadDetail()
    msg.value = `บันทึกข้อมูลแล้ว — ${parts.join(' · ')} · กรุณาตรวจสอบเกมให้ถูกต้อง ก่อนเผยแพร่`
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
    msg.value = ''
  } finally {
    savingAll.value = false
  }
}

async function activate() {
  if (!props.gameId) return
  if (!window.confirm(PUBLISH_CONFIRM_MESSAGE)) return
  const token = memberToken()
  if (!token) {
    err.value = 'หมดเซสชัน — ล็อกอินใหม่แล้วลองกดเผยแพร่อีกครั้ง'
    return
  }
  gameActionBusy.value = true
  err.value = ''
  msg.value = ''
  try {
    await persistAllForPublish()
    const r = await fetch(
      `${apiBase()}/api/admin/central-games/${encodeURIComponent(props.gameId)}/activate`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    )
    const data = (await r.json().catch(() => ({}))) as { error?: string }
    if (!r.ok) throw new Error(data.error || 'เปิดใช้เกมไม่สำเร็จ')
    lobbyVisible.value = true
    assignParent('/member/game?published=1')
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    gameActionBusy.value = false
  }
}

async function deactivate() {
  if (!props.gameId) return
  const token = memberToken()
  if (!token) {
    err.value = 'หมดเซสชัน — ล็อกอินใหม่'
    return
  }
  gameActionBusy.value = true
  err.value = ''
  msg.value = ''
  try {
    const r = await fetch(
      `${apiBase()}/api/admin/central-games/${encodeURIComponent(props.gameId)}/deactivate`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    )
    const data = (await r.json().catch(() => ({}))) as { error?: string }
    if (!r.ok) throw new Error(data.error || 'ปิดใช้ไม่สำเร็จ')
    lobbyVisible.value = false
    assignParent('/member/game?published=0')
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    gameActionBusy.value = false
  }
}

async function removeGame() {
  if (!props.gameId) return
  if (prizeAwardCount.value > 0 || playCount.value > 0) {
    msg.value = DELETE_BLOCKED_HINT
    return
  }
  if (!window.confirm('ลบเกมนี้ถาวร?')) return
  const token = memberToken()
  if (!token) {
    msg.value = 'หมดเซสชัน — ล็อกอินใหม่'
    return
  }
  gameActionBusy.value = true
  msg.value = ''
  try {
    const r = await fetch(`${apiBase()}/api/admin/central-games/${encodeURIComponent(props.gameId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = (await r.json().catch(() => ({}))) as { error?: string }
    if (!r.ok) throw new Error(data.error || 'ลบเกมไม่สำเร็จ')
    assignParent('/member/game')
  } catch (e: unknown) {
    msg.value = e instanceof Error ? e.message : String(e)
  } finally {
    gameActionBusy.value = false
  }
}

async function onCoverFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  msg.value = 'กำลังอัปโหลดรูปหน้าปก…'
  try {
    gameCoverUrl.value = await uploadGameImageFile(apiBase(), file)
    msg.value = 'อัปโหลดรูปหน้าปกแล้ว — กดบันทึกข้อมูลเพื่อบันทึกลงเซิร์ฟเวอร์'
  } catch (err_: unknown) {
    msg.value = err_ instanceof Error ? err_.message : String(err_)
  }
}

async function onTileBackFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  msg.value = 'กำลังอัปโหลดรูปหน้าปิดป้าย…'
  try {
    tileBackCoverUrl.value = await uploadGameImageFile(apiBase(), file)
    msg.value = 'อัปโหลดรูปหน้าปิดป้ายแล้ว — กดบันทึกข้อมูลเพื่อบันทึกลงเซิร์ฟเวอร์'
  } catch (err_: unknown) {
    msg.value = err_ instanceof Error ? err_.message : String(err_)
  }
}

async function onSetImageFile(setIndex: number, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const slot = `${setIndex}-0`
  const prev = imageMap.value[slot]
  if (prev && String(prev).startsWith('blob:')) URL.revokeObjectURL(prev)
  imageMap.value = { ...imageMap.value, [slot]: URL.createObjectURL(file) }
  msg.value = 'กำลังอัปโหลด…'
  try {
    const url = await uploadGameImageFile(apiBase(), file)
    const cur = imageMap.value[slot]
    if (cur && String(cur).startsWith('blob:')) URL.revokeObjectURL(cur)
    imageMap.value = { ...imageMap.value, [slot]: url }
    msg.value = 'อัปโหลดรูปแล้ว — กดบันทึกรูปเมื่อครบทุกชุด'
  } catch (err_: unknown) {
    const cur = imageMap.value[slot]
    if (cur && String(cur).startsWith('blob:')) URL.revokeObjectURL(cur)
    const next = { ...imageMap.value }
    delete next[slot]
    imageMap.value = next
    msg.value = err_ instanceof Error ? err_.message : String(err_)
  }
}

function onMemberUser() {
  void loadDetail()
}

onMounted(() => {
  window.addEventListener('huajaiy-member-user', onMemberUser)
})

onBeforeUnmount(() => {
  revokeBlobUrls(imageMap.value)
  window.removeEventListener('huajaiy-member-user', onMemberUser)
})
</script>
