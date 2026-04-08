"use client";

export default function AdminSiteThemePanel() {
  return (
    <section className="rounded-xl border border-hui-border bg-white p-5 text-sm text-hui-body shadow-sm">
      <h2 className="text-base font-semibold text-hui-section">ปิดหน้า Theme เดิมแล้ว</h2>
      <p className="mt-2">
        ลบฟอร์มตั้งค่าเก่าออกทั้งหมดตามที่ร้องขอ หน้านี้จึงไม่แสดงตัวเลือกเดิมอีกต่อไป
      </p>
    </section>
  );
}
