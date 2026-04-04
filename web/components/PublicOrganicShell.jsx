"use client";

import HomeStylePublicHeader from "./HomeStylePublicHeader";
import OrganicPublicFooter from "./OrganicPublicFooter";
import { useMemberAuth } from "./MemberAuthProvider";
import { gameLobbyShellCssVars } from "../lib/gameLobbyThemeDefaults";

/**
 * เชลล์สาธารณะ — หัวแบบหน้าแรก/สมาชิก + พื้นหลัง slate + ฟุตเตอร์เบา
 * (แฮมเบอร์เกอร์ไม่มี iframe ที่รับ message — ใช้ noop)
 *
 * @param {object} [gameLobbyTheme] — ธีมหน้า /game (ผสานค่าเริ่มต้นแล้ว)
 * @param {React.CSSProperties} [gameLobbyMainStyle] — พื้นหลังเนื้อหา (จาก buildSiteRootBackgroundStyle)
 */
export default function PublicOrganicShell({
  children,
  gameLobbyTheme,
  gameLobbyMainStyle
}) {
  const { user } = useMemberAuth();
  const lobbyVars = gameLobbyTheme ? gameLobbyShellCssVars(gameLobbyTheme) : undefined;

  return (
    <div
      className="flex min-h-dvh flex-col bg-white"
      style={lobbyVars}
    >
      <HomeStylePublicHeader
        onHamburgerClick={() => {}}
        lineProfileImageUrl={user?.linePictureUrl || undefined}
        profileDisplayName={
          user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "สมาชิก"
            : undefined
        }
        gameLobbyThemed={Boolean(gameLobbyTheme)}
      />
      <div
        className={
          gameLobbyMainStyle
            ? "flex min-h-0 flex-1 flex-col"
            : "flex min-h-0 flex-1 flex-col bg-slate-100"
        }
        style={gameLobbyMainStyle || undefined}
      >
        {children}
      </div>
      <OrganicPublicFooter />
    </div>
  );
}
