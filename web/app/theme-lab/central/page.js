"use client";

import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "../../../components/HuajaiyCentralTemplate";

export default function ThemeLabCentralPage() {
  const router = useRouter();
  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-3 py-12 sm:px-5 sm:py-16">
        <div className="rounded-2xl border border-dashed border-pink-200/90 bg-white/70 p-10 text-center shadow-inner shadow-pink-100/40">
          <p className="text-lg font-bold text-[#FF2E8C]">เทมเพลตกลาง HUAJAIY</p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            พื้นหลังชมพูอ่อน = โซนเนื้อหาหลัก · ด้านบนและล่างคือโครงเดียวกับหน้าแรก
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            เปิดจาก URL นี้เพื่อดูก่อน แล้วค่อยผูกหน้าจริงทีหลัง
          </p>
        </div>
      </div>
    </HuajaiyCentralTemplate>
  );
}
