"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminCentralGamePanel from "../../../components/AdminCentralGamePanel";

function GameStudioBody() {
  const searchParams = useSearchParams();
  const id = searchParams.get("game");
  const isMemberEmbed = searchParams.get("member_embed") === "1";
  const trimmed = id != null ? String(id).trim() : "";

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
      memberShellEmbed={isMemberEmbed}
      focusGameId={trimmed}
    />
  );
}

/** ฝังในเชลล์สมาชิก TailAdmin — เฉพาะแผงตั้งค่าเกม (ไม่มีฟอร์มเปิดห้อง) */
export default function AccountGameStudioEmbedPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-gray-500" aria-live="polite">
          กำลังโหลดสตูดิโอ…
        </p>
      }
    >
      <div className="min-w-0 px-1 py-2 sm:px-2 sm:py-3">
        <GameStudioBody />
      </div>
    </Suspense>
  );
}
