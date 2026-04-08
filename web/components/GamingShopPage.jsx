"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";
import { useMemberAuth } from "./MemberAuthProvider";

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "accessory", label: "อุปกรณ์เสริม" },
  { id: "audio", label: "เสียง" },
  { id: "controller", label: "จอยเกม" },
  { id: "furniture", label: "เฟอร์นิเจอร์" },
  { id: "monitor", label: "จอมอนิเตอร์" }
];

const SHOP_PRODUCTS = [
  {
    id: "a",
    catLabel: "อุปกรณ์เสริม",
    catKey: "accessory",
    name: "เมาส์เกมมิ่ง Pro",
    price: "599",
    was: "799",
    discountPct: 25,
    stars: 5,
    icon: "🖱️"
  },
  {
    id: "b",
    catLabel: "จอยเกม",
    catKey: "controller",
    name: "คอนโทรลเลอร์ไร้สาย X",
    price: "1,890",
    was: "2,290",
    discountPct: 17,
    stars: 5,
    icon: "🎮"
  },
  {
    id: "c",
    catLabel: "เสียง",
    catKey: "audio",
    name: "หูฟังเกมมิ่ง 7.1",
    price: "2,490",
    was: "2,990",
    discountPct: 17,
    stars: 4,
    icon: "🎧"
  },
  {
    id: "d",
    catLabel: "อุปกรณ์เสริม",
    catKey: "accessory",
    name: "คีย์บอร์ดเมคานิคัล RGB",
    price: "3,290",
    was: "3,990",
    discountPct: 18,
    stars: 5,
    icon: "⌨️"
  },
  {
    id: "e",
    catLabel: "จอมอนิเตอร์",
    catKey: "monitor",
    name: "จอเกม 27\" 165Hz",
    price: "8,900",
    was: "10,500",
    discountPct: 15,
    stars: 5,
    icon: "🖥️"
  },
  {
    id: "f",
    catLabel: "เฟอร์นิเจอร์",
    catKey: "furniture",
    name: "เก้าอี้เกมมิ่ง Ergo",
    price: "4,590",
    was: "5,990",
    discountPct: 23,
    stars: 4,
    icon: "🪑"
  },
  {
    id: "g",
    catLabel: "จอยเกม",
    catKey: "controller",
    name: "จอย Arcade USB",
    price: "890",
    was: "1,190",
    discountPct: 25,
    stars: 4,
    icon: "🕹️"
  },
  {
    id: "h",
    catLabel: "เสียง",
    catKey: "audio",
    name: "ไมโครโฟนคอนเดนเซอร์",
    price: "1,290",
    was: "1,590",
    discountPct: 19,
    stars: 5,
    icon: "🎙️"
  }
];

function IconCart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301C4.378 9 6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154.901 1.153.472 2.87-.386 6.301-.546 2.183-.818 3.274-1.632 3.91-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635-.814-.636-1.087-1.727-1.632-3.91Z" />
      <path d="M19.5 9.5-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4" />
    </svg>
  );
}

function IconStar({ className, filled }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z" />
    </svg>
  );
}

function IconFunnel({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" strokeLinejoin="round" />
    </svg>
  );
}

function StarRow({ n }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`คะแนน ${n} จาก 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? "text-amber-400" : "text-neutral-300"}`}
          filled={i <= n}
        />
      ))}
    </span>
  );
}

/**
 * หน้าร้านค้าเกมมิ่งสาธารณะ — /shop (โครง HuajaiyCentralTemplate เดียวกับ /central-template)
 */
export default function GamingShopPage() {
  const router = useRouter();
  const { user: memberUser } = useMemberAuth();
  const [activeCat, setActiveCat] = useState("all");

  const filtered = useMemo(
    () =>
      activeCat === "all" ? SHOP_PRODUCTS : SHOP_PRODUCTS.filter((p) => p.catKey === activeCat),
    [activeCat]
  );

  const displayName =
    memberUser && [memberUser.firstName, memberUser.lastName].filter(Boolean).join(" ").trim()
      ? [memberUser.firstName, memberUser.lastName].filter(Boolean).join(" ").trim()
      : memberUser
        ? "สมาชิก"
        : undefined;

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      lineProfileImageUrl={memberUser?.linePictureUrl || undefined}
      profileDisplayName={displayName}
      pinkBarMenuLabel="ร้านค้าเกมมิ่ง"
      activeNavKey="shop"
      mainClassName="flex min-w-0 flex-1 flex-col bg-[#f4f4f6]"
    >
      <section
        className="relative overflow-hidden bg-gradient-to-r from-[#8B1453] via-[#c21b6d] to-[#F0DE7A]"
        aria-labelledby="shop-hero-title"
      >
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-6 px-3 py-[3.75rem] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-[5.25rem]">
          <div className="max-w-2xl text-center sm:text-left">
            <h1 id="shop-hero-title" className="text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
              ร้านค้าเกมมิ่ง
            </h1>
            <p className="mt-3 text-base text-white/95 sm:text-lg">ค้นพบดีลสุดคุ้มสำหรับอุปกรณ์เกมมิ่ง</p>
          </div>
          <Link
            href="/cart"
            className="mx-auto flex shrink-0 items-center gap-3 rounded-2xl border border-white/30 bg-white/15 px-5 py-4 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 sm:mx-0"
          >
            <IconCart className="h-8 w-8 shrink-0" />
            <div className="text-left text-sm leading-tight">
              <p className="font-bold">ตะกร้า</p>
              <p className="text-white/90">
                <span className="tabular-nums">0</span> ชิ้น · ฿0
              </p>
            </div>
          </Link>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-8 sm:px-5 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <IconFunnel className="h-5 w-5 text-[#FF2E8C]" aria-hidden />
            หมวดหมู่:
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={
                  activeCat === c.id
                    ? "rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-4 py-2 text-sm font-bold text-white shadow-md shadow-pink-400/25"
                    : "rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-pink-200 hover:text-[#FF2E8C]"
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="relative flex flex-col rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50 transition-transform transition-shadow duration-200 ease-out will-change-transform hover:scale-[1.04] hover:shadow-md"
            >
              <span className="absolute left-3 top-3 z-[1] rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {p.discountPct}% OFF
              </span>
              <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-100 to-pink-50/80 text-5xl">
                {p.icon}
              </div>
              <div className="flex flex-1 flex-col rounded-b-2xl p-4">
                <p className="text-xs font-semibold text-purple-700">{p.catLabel}</p>
                <h2 className="mt-1 text-base font-bold text-neutral-900">{p.name}</h2>
                <div className="mt-2">
                  <StarRow n={p.stars} />
                </div>
                <p className="mt-2 text-lg font-bold text-[#FF2E8C]">฿{p.price}</p>
                <p className="text-sm font-medium text-[#E60012] line-through decoration-neutral-700 decoration-2">฿{p.was}</p>
                <Link
                  href="/cart"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/20 transition hover:brightness-105"
                >
                  ซื้อเลย
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </HuajaiyCentralTemplate>
  );
}
