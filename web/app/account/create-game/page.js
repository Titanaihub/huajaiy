"use client";

import { Suspense } from "react";
import CreateGameRoomForm from "../../../components/CreateGameRoomForm";

export default function CreateGamePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-600" aria-live="polite">
          กำลังโหลด…
        </p>
      }
    >
      <CreateGameRoomForm />
    </Suspense>
  );
}
