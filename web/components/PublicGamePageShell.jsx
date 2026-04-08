"use client";

import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";

/**
 * เชลล์หน้า /game — ใช้ HuajaiyCentralTemplate เดียวกับ /central-template
 */
export default function PublicGamePageShell({ children }) {
  const router = useRouter();
  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      pinkBarMenuLabel="เกมทั้งหมด"
      activeNavKey="game"
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      {children}
    </HuajaiyCentralTemplate>
  );
}
