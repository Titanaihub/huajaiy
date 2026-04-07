<template>
  <admin-layout>
    <!-- ไม่ใช้ PageBreadcrumb — หัวข้ออยู่ที่ HuajaiyCentralTemplate นอก iframe -->
    <div class="mx-auto max-w-xl rounded-2xl border border-pink-100 bg-white p-8 text-center shadow-sm">
      <p class="text-sm leading-relaxed text-gray-700">
        จัดการรูปโปรไฟล์ ชื่อ และข้อมูลบัญชีได้ที่หน้า「ภาพรวมบัญชี」บนเชลล์หลัก — สอดคล้องกับเทมเพลตกลาง
      </p>
      <a
        class="mt-5 inline-flex rounded-full bg-[#FF2E8C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
        href="/member"
        target="_parent"
        rel="noopener noreferrer"
      >
        ไปภาพรวมบัญชี
      </a>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
</script>
