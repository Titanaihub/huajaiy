"use client";

import { Suspense } from "react";
import AccountMyGamesList from "../../../components/AccountMyGamesList";

export default function MyGamesPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-600" aria-live="polite">
          กำลังโหลด…
        </p>
      }
    >
      <AccountMyGamesList />
    </Suspense>
  );
}
