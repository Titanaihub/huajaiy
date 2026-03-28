"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";
import { useHearts } from "./HeartsProvider";

export default function HeartsBadge() {
  const { hearts, ready } = useHearts();

  return (
    <Link
      href="/shop"
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/95 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900 shadow-sm transition hover:border-brand-300 hover:bg-brand-100"
      title="หัวใจใช้เล่นเกม — แต้มจากร้านค้า (สาธิต)"
    >
      <HeartIcon className="h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden />
      <span className="tabular-nums text-brand-900">
        {ready ? hearts.toLocaleString("th-TH") : "—"}
      </span>
    </Link>
  );
}
