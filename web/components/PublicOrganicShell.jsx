"use client";

import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";
import { useMemberAuth } from "./MemberAuthProvider";
import { gameLobbyShellCssVars } from "../lib/gameLobbyThemeDefaults";

/**
 * เชลล์สาธารณะ — ใช้ HuajaiyCentralTemplate เดียวกับ /central-template
 *
 * @param {object} [gameLobbyTheme] — ธีมหน้า /game (ผสานค่าเริ่มต้นแล้ว)
 * @param {React.CSSProperties} [gameLobbyMainStyle] — พื้นหลังเนื้อหา (จาก buildSiteRootBackgroundStyle)
 * @param {string} [pinkBarMenuLabel] — ข้อความแถบชมพูใต้เฮดเดอร์
 * @param {'home'|'shop'|'game'|'posts'|'page'|null} [activeNavKey] — ไฮไลต์เมนูหลัก
 */
export default function PublicOrganicShell({
  children,
  gameLobbyTheme,
  gameLobbyMainStyle,
  pinkBarMenuLabel = "",
  activeNavKey = null
}) {
  const router = useRouter();
  const { user } = useMemberAuth();
  const lobbyVars = gameLobbyTheme ? gameLobbyShellCssVars(gameLobbyTheme) : undefined;

  const displayName =
    user && [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      : user
        ? "สมาชิก"
        : undefined;

  return (
    <div
      className="flex min-h-dvh min-w-0 flex-col bg-white"
      style={lobbyVars}
    >
      <HuajaiyCentralTemplate
        onHamburgerClick={() => router.push("/member")}
        lineProfileImageUrl={user?.linePictureUrl || undefined}
        profileDisplayName={displayName}
        pinkBarMenuLabel={pinkBarMenuLabel}
        activeNavKey={activeNavKey}
        mainClassName="flex min-h-0 min-w-0 flex-1 flex-col"
      >
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
      </HuajaiyCentralTemplate>
    </div>
  );
}
