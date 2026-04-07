<template>
  <div
    class="huajaiy-tailadmin-breadcrumb flex flex-wrap items-center justify-between gap-3 mb-6"
  >
    <h2
      class="font-semibold text-gray-800 dark:text-white/90"
      :class="prominent ? 'text-2xl md:text-3xl' : 'text-xl'"
      x-text="pageTitle"
    >
      {{ pageTitle }}
    </h2>
    <nav>
      <ol class="flex items-center gap-1.5">
        <li>
          <router-link
            class="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400"
            :class="prominent ? 'text-base' : 'text-sm'"
            to="/"
          >
            Home
            <svg
              class="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
        </li>
        <li
          class="text-gray-800 dark:text-white/90"
          :class="prominent ? 'text-base font-medium' : 'text-sm'"
        >
          {{ pageTitle }}
        </li>
      </ol>
    </nav>
  </div>
</template>

<script setup lang="ts">
interface BreadcrumbProps {
  pageTitle: string
  /** หัวข้อใหญ่ขึ้น — ใช้หน้าที่ต้องการอ่านง่าย (เช่น สร้างเกม) */
  prominent?: boolean
}

withDefaults(defineProps<BreadcrumbProps>(), {
  prominent: false
})
</script>
