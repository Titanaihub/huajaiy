"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";
import { useMemberAuth } from "./MemberAuthProvider";

function pinkBarLabelForPath(pathname) {
  const p = String(pathname || "");
  if (p.includes("/play")) return "ประวัติหัวใจชมพู";
  if (p.includes("/purchases")) return "ประวัติหัวใจแดง (กระเป๋าและห้อง)";
  if (p.includes("/giveaway")) return "ประวัติหัวใจแดงสำหรับแจก";
  return "ประวัติหัวใจ";
}

/**
 * เชลล์หน้าประวัติหัวใจ — ใช้เทมเพลตกลางเดียวกับ /theme-lab/central
 */
export default function AccountHeartHistoryPageShell({ children }) {
  const { user } = useMemberAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const pinkBarMenuLabel = useMemo(() => pinkBarLabelForPath(pathname), [pathname]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "สมาชิก";

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      lineProfileImageUrl={user?.linePictureUrl || undefined}
      profileDisplayName={displayName}
      pinkBarMenuLabel={pinkBarMenuLabel}
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-5 sm:py-8">
        <p className="mb-6">
          <Link
            href="/member"
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200/90 bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#FF2E8C] shadow-sm transition hover:border-pink-300 hover:bg-pink-50"
          >
            ← กลับหน้าสมาชิก
          </Link>
        </p>
        {children}
      </div>
    </HuajaiyCentralTemplate>
  );
}
