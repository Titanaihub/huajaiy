"use client";

import HomeStylePublicHeader from "./HomeStylePublicHeader";
import OrganicPublicFooter from "./OrganicPublicFooter";
import { useMemberAuth } from "./MemberAuthProvider";

/**
 * เชลล์สาธารณะ — หัวแบบหน้าแรก/สมาชิก + พื้นหลัง slate + ฟุตเตอร์เบา
 * (แฮมเบอร์เกอร์ไม่มี iframe ที่รับ message — ใช้ noop)
 */
export default function PublicOrganicShell({ children }) {
  const { user } = useMemberAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <HomeStylePublicHeader
        onHamburgerClick={() => {}}
        lineProfileImageUrl={user?.linePictureUrl || undefined}
        profileDisplayName={
          user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "สมาชิก"
            : undefined
        }
      />
      <div className="flex min-h-0 flex-1 flex-col bg-slate-100">{children}</div>
      <OrganicPublicFooter />
    </div>
  );
}
