"use client";

import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "../../../components/HuajaiyCentralTemplate";

/**
 * โครงเดียวกับ /central-template — หัวใจ + แถบนำทาง + พื้นชมพูอ่อน + ฟุตเตอร์
 */
export default function PrizeWithdrawCentralLayout({ children }) {
  const router = useRouter();
  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      pinkBarMenuLabel="ถอนเงินรางวัล"
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-3 py-8 sm:px-5 sm:py-12">
        {children}
      </div>
    </HuajaiyCentralTemplate>
  );
}
