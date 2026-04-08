"use client";

import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";

/** โซนเนื้อหาเดียวกับ `/central-template` */
const PUBLIC_MEMBER_MAIN_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45";

/**
 * เพจสาธารณะ @username — หัวใจ + แถบชมพู + ฟุตเตอร์แบบกลาง (ไม่ใช้ MemberStylePageShell)
 */
export default function PublicMemberCentralShell({ children }) {
  const router = useRouter();
  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      pinkBarMenuLabel="เพจสมาชิก"
      mainClassName={PUBLIC_MEMBER_MAIN_CLASS}
    >
      {children}
    </HuajaiyCentralTemplate>
  );
}
