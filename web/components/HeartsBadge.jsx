"use client";

import Link from "next/link";
import { useHearts } from "./HeartsProvider";

export default function HeartsBadge() {
  const { hearts, ready } = useHearts();

  return (
    <Link
      href="/shop"
      className="inline-flex items-center gap-1 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-900 shadow-sm transition hover:bg-rose-100"
      title="หัวใจใช้เล่นเกม — แต้มจากร้านค้า (สาธิต)"
    >
      <span aria-hidden>♥</span>
      <span>{ready ? hearts.toLocaleString("th-TH") : "—"}</span>
    </Link>
  );
}
