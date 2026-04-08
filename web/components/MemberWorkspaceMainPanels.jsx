"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AccountGiveHeartsSection from "./AccountGiveHeartsSection";
import AccountHeartHistorySection from "./AccountHeartHistorySection";
import AccountMyGamesList from "./AccountMyGamesList";
import AccountMyHeartsSection from "./AccountMyHeartsSection";
import AccountMyPrizesSection from "./AccountMyPrizesSection";
import AdminCentralGamePanel from "./AdminCentralGamePanel";
import CreateGameRoomForm from "./CreateGameRoomForm";
import HeartShopClient from "./HeartShopClient";
import PrizeWithdrawForm from "./PrizeWithdrawForm";

function GameStudioMemberBody() {
  const searchParams = useSearchParams();
  const id = searchParams.get("game");
  const trimmed = id != null ? String(id).trim() : "";
  const studioEditFull = searchParams.get("edit") === "full";

  if (!trimmed) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400" role="status">
        ไม่พบรหัสเกม — เปิดจากลิงก์จัดการเกมเท่านั้น
      </p>
    );
  }

  return (
    <AdminCentralGamePanel
      embedded
      memberShellEmbed
      memberBasicInfoOnly={!studioEditFull}
      focusGameId={trimmed}
    />
  );
}

/**
 * เนื้อหาสมาชิกแบบ React ใต้ HuajaiyCentralTemplate (ไม่ผ่าน iframe)
 * แมปกับ slug หลัง /member/{slug}
 */
export default function MemberWorkspaceMainPanels({ slug }) {
  const s = String(slug || "")
    .trim()
    .toLowerCase();

  const suspenseFallback = (
    <p className="text-sm text-gray-500" aria-live="polite">
      กำลังโหลด…
    </p>
  );

  switch (s) {
    case "prizes":
      return <AccountMyPrizesSection />;
    case "hearts":
      return <AccountMyHeartsSection hideShellPageTitle />;
    case "pink-history":
      return <AccountHeartHistorySection variant="play" hideShellPageTitle />;
    case "game":
      return (
        <Suspense fallback={suspenseFallback}>
          <AccountMyGamesList hideShellPageTitle />
        </Suspense>
      );
    case "prize-withdraw":
      return (
        <Suspense fallback={suspenseFallback}>
          <PrizeWithdrawForm hideShellPageTitle />
        </Suspense>
      );
    case "hearts-top-up":
      return <HeartShopClient />;
    case "give-hearts":
      return <AccountGiveHeartsSection hideShellPageTitle />;
    case "create-game":
      return (
        <Suspense fallback={suspenseFallback}>
          <CreateGameRoomForm hideShellPageTitle memberShellEmbed />
        </Suspense>
      );
    case "game-studio":
      return (
        <Suspense fallback={suspenseFallback}>
          <div className="min-w-0 px-1 py-2 sm:px-2 sm:py-3">
            <GameStudioMemberBody />
          </div>
        </Suspense>
      );
    default:
      return (
        <p className="text-sm text-gray-600" role="status">
          ไม่พบหน้านี้ในระบบสมาชิก
        </p>
      );
  }
}
