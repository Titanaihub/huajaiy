"use client";

import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";

/** โซนเนื้อหาเดียวกับ /central-template — พื้นชมพูอ่อน + หัว/ท้ายเทมเพลตกลาง */
const MAIN_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45";

export default function CentralAuthPageShell({ children }) {
  const router = useRouter();
  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      mainClassName={MAIN_CLASS}
    >
      {children}
    </HuajaiyCentralTemplate>
  );
}
