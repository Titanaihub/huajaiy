"use client";

import { usePathname } from "next/navigation";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountBackOfficeShell({ children }) {
  useMemberAuth();
  const pathname = usePathname();
  const wideProfile = pathname?.startsWith("/account/profile");

  return (
    <main
      className={
        wideProfile
          ? "mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-4 sm:py-8"
          : "mx-auto max-w-5xl px-4 py-8"
      }
    >
      <div className="min-w-0">{children}</div>
    </main>
  );
}
