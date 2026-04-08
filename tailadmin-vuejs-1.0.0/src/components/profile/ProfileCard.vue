<template>
  <div>
    <div class="p-5 mb-6 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div
            class="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 shrink-0"
            :class="{ 'bg-pink-50 dark:bg-pink-950/30': isDefaultHeartAvatar }"
          >
            <img :src="avatarUrl" alt="โปรไฟล์" class="h-full w-full object-cover" />
          </div>
          <div class="order-3 xl:order-2 min-w-0">
            <h4
              class="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left"
            >
              {{ displayName }}
            </h4>
            <div
              class="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ subtitle }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-center order-2 gap-2 grow xl:order-3 xl:justify-end sm:gap-2.5">
            <a
              v-if="lineHref"
              :href="lineHref"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-11 min-w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent p-0 shadow-md ring-1 ring-black/10 transition hover:opacity-90 dark:ring-white/15"
              title="LINE"
            >
              <img
                src="/social/line.png"
                alt=""
                width="120"
                height="40"
                class="h-10 w-auto max-w-[5.5rem] object-contain sm:h-11 sm:max-w-[5.75rem]"
                decoding="async"
              />
            </a>
            <a
              v-if="fbHref"
              :href="fbHref"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-md ring-1 ring-black/10 transition hover:bg-gray-50 dark:bg-gray-800 dark:ring-white/15 dark:hover:bg-gray-700"
              title="Facebook"
            >
              <img
                src="/social/facebook.png"
                alt=""
                width="40"
                height="40"
                class="h-full w-full object-contain"
                decoding="async"
              />
            </a>
            <a
              v-if="tiktokHref"
              :href="tiktokHref"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black p-1.5 shadow-md ring-1 ring-black/10 transition hover:bg-neutral-900"
              title="TikTok"
            >
              <img
                src="/social/tiktok.png"
                alt=""
                width="40"
                height="40"
                class="h-full w-full object-contain"
                decoding="async"
              />
            </a>
          </div>
        </div>
        <button type="button" @click="openModal" class="edit-button">
          <svg
            class="fill-current"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
              fill=""
            />
          </svg>
          แก้ไขโปรไฟล์
        </button>
      </div>
    </div>
    <Modal v-if="isProfileInfoModal" @close="isProfileInfoModal = false">
      <template #body>
        <div
          class="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11"
        >
          <button
            type="button"
            @click="isProfileInfoModal = false"
            class="transition-color absolute right-5 top-5 z-999 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-700 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-300"
          >
            <span class="sr-only">ปิด</span>
            <svg class="fill-current" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
              />
            </svg>
          </button>
          <div class="px-2 pr-14">
            <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              แก้ไขรูปโปรไฟล์และลิงก์โซเชียล
            </h4>
            <p class="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              อัปโหลดรูปจากเครื่องได้ — ระบบจะได้ลิงก์ https ให้อัตโนมัติ หรือวาง URL เองก็ได้ เว้นว่างเพื่อลบรูปที่ตั้งเอง
            </p>
          </div>
          <form class="flex flex-col" @submit.prevent="saveProfile">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              @change="onImageSelected"
            />
            <div class="custom-scrollbar max-h-[458px] overflow-y-auto p-2">
              <div class="grid grid-cols-1 gap-x-6 gap-y-5">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    URL รูปโปรไฟล์ (https)
                  </label>
                  <input
                    v-model="formProfilePic"
                    type="url"
                    autocomplete="off"
                    placeholder="https://..."
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                      :disabled="uploading"
                      @click="triggerFilePick"
                    >
                      {{ uploading ? 'กำลังอัปโหลด…' : 'เลือกรูปอัปโหลด' }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Facebook
                  </label>
                  <input
                    v-model="formFb"
                    type="url"
                    autocomplete="off"
                    placeholder="https://www.facebook.com/..."
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    LINE
                  </label>
                  <input
                    v-model="formLine"
                    type="url"
                    autocomplete="off"
                    placeholder="https://line.me/... หรือลิงก์เพิ่มเพื่อน"
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    TikTok
                  </label>
                  <input
                    v-model="formTiktok"
                    type="url"
                    autocomplete="off"
                    placeholder="https://www.tiktok.com/@..."
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>
              <p v-if="saveErr" class="mt-3 text-sm text-red-600">{{ saveErr }}</p>
            </div>
            <div class="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <button
                type="button"
                @click="isProfileInfoModal = false"
                class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:w-auto"
              >
                ปิด
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
              >
                {{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import Modal from './Modal.vue'
import type { HuajaiyProfileContext } from '@/composables/useHuajaiyMemberProfile'

const ctx = inject<HuajaiyProfileContext>('huajaiyProfile')
if (!ctx) {
  throw new Error('huajaiyProfile provider missing')
}

const saving = ctx.saving
const uploading = ctx.uploading
const fileInputRef = ref<HTMLInputElement | null>(null)

const isProfileInfoModal = ref(false)
const formProfilePic = ref('')
const formFb = ref('')
const formLine = ref('')
const formTiktok = ref('')
const saveErr = ref('')

const displayName = computed(() => ctx.displayName.value)
const avatarUrl = computed(() => ctx.avatarUrl.value)
const isDefaultHeartAvatar = computed(() =>
  Boolean(avatarUrl.value && avatarUrl.value.includes('default-member-avatar-heart.svg'))
)

const subtitle = computed(() => {
  const u = ctx.user.value
  if (!u) return ''
  const un = u.username ? `@${u.username}` : ''
  const role =
    u.role === 'admin' ? 'ผู้ดูแลระบบ' : u.role === 'owner' ? 'เจ้าของร้าน' : 'สมาชิก'
  return [un, role].filter(Boolean).join(' · ')
})

const fbHref = computed(() => (ctx.user.value?.socialFacebookUrl || '').trim() || '')
const lineHref = computed(() => (ctx.user.value?.socialLineUrl || '').trim() || '')
const tiktokHref = computed(() => (ctx.user.value?.socialTiktokUrl || '').trim() || '')

function syncFormFromUser() {
  const u = ctx.user.value
  formProfilePic.value = (u?.profilePictureUrl || '').trim()
  formFb.value = (u?.socialFacebookUrl || '').trim()
  formLine.value = (u?.socialLineUrl || '').trim()
  formTiktok.value = (u?.socialTiktokUrl || '').trim()
}

watch(
  () => ctx.user.value,
  () => syncFormFromUser(),
  { immediate: true }
)

function openModal() {
  saveErr.value = ''
  syncFormFromUser()
  isProfileInfoModal.value = true
}

function triggerFilePick() {
  saveErr.value = ''
  fileInputRef.value?.click()
}

async function onImageSelected(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    saveErr.value = 'กรุณาเลือกไฟล์รูปภาพ'
    return
  }
  try {
    const url = await ctx.uploadProfileImage(file)
    formProfilePic.value = url
  } catch (e) {
    saveErr.value = e instanceof Error ? e.message : String(e)
  }
}

async function saveProfile() {
  saveErr.value = ''
  try {
    await ctx.patch({
      profilePictureUrl: formProfilePic.value.trim(),
      socialFacebookUrl: formFb.value.trim(),
      socialLineUrl: formLine.value.trim(),
      socialTiktokUrl: formTiktok.value.trim()
    })
    isProfileInfoModal.value = false
  } catch (e) {
    saveErr.value = e instanceof Error ? e.message : String(e)
  }
}
</script>
