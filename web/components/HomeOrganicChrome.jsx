"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import HomeLandingFigmaShell from "./HomeLandingFigmaShell";
import { useMemberAuth } from "./MemberAuthProvider";
import { gameLobbyShellCssVars, mergeGameLobbyFromApi } from "../lib/gameLobbyThemeDefaults";

/**
 * หน้าแรก — เกม / โพสต์ชุมชน / สินค้า จาก API (พื้นหลังเดียวกับเทมเพลตกลาง)
 */
export default function HomeOrganicChrome({
  recommendedGames = [],
  communityPosts = [],
  featuredProducts = [],
  featuredHeading = null,
  gameLobbyTheme = null
}) {
  const router = useRouter();
  const { user } = useMemberAuth();
  const onHamburgerClick = useCallback(() => {
    router.push("/member");
  }, [router]);

  const communityLobbyStyle = useMemo(
    () => gameLobbyShellCssVars(mergeGameLobbyFromApi(gameLobbyTheme)),
    [gameLobbyTheme]
  );

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-white">
      <HomeLandingFigmaShell
        onHamburgerClick={onHamburgerClick}
        recommendedGames={recommendedGames}
        communityPosts={communityPosts}
        featuredProducts={featuredProducts}
        featuredHeading={featuredHeading}
        communityLobbyStyle={communityLobbyStyle}
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
