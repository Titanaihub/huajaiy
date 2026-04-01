"use client";

import { Suspense } from "react";
import AccountMyGamesList from "../../../components/AccountMyGamesList";

export default function MyGamesPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-hui-body" aria-live="polite">
          กำลังโหลด…
        </p>
      }
    >
      <AccountMyGamesList />
    </Suspense>
  );
}
