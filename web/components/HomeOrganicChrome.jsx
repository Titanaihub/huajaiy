"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import HomeLandingFigmaShell from "./HomeLandingFigmaShell";
import { useMemberAuth } from "./MemberAuthProvider";

/**
 * หน้าแรก production: เทมเพลต Next เต็มหน้า (เมนู + hero + เกม/สินค้า/โพสต์ + ฟุตเตอร์)
 * ไม่โหลด iframe organic — เนื้อหาเดิมใน organic-template ไม่แสดงบน /
 */
export default function HomeOrganicChrome() {
  const router = useRouter();
  const { user } = useMemberAuth();
  const onHamburgerClick = useCallback(() => {
    router.push("/member");
  }, [router]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <HomeLandingFigmaShell
        onHamburgerClick={onHamburgerClick}
        lineProfileImageUrl={user?.linePictureUrl || undefined}
        profileDisplayName={
          user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
              "สมาชิก"
            : undefined
        }
      />
    </div>
  );
}
