"use client";

import { useCallback, useMemo, useState } from "react";
import {
  isNewFormatMemberLoginCode,
  isValidMemberLoginCode
} from "../lib/memberLoginCode";
import { useMemberAuth } from "./MemberAuthProvider";

const TABS = [
  { id: "overview", label: "ภาพรวม" },
  { id: "promo", label: "โปรโมท & กิจกรรม" }
];

function looksLikeLineMember(username) {
  return isValidMemberLoginCode(String(username || ""));
}

function initials(firstName, lastName, username) {
  const a = String(firstName || "").trim().charAt(0);
  const b = String(lastName || "").trim().charAt(0);
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  const u = String(username || "").trim();
  return u.slice(0, 2).toUpperCase() || "?";
}

function formatShippingSummary(parts) {
  if (!parts || typeof parts !== "object") return null;
  const bits = [
    parts.houseNo,
    parts.moo ? `หมู่ ${parts.moo}` : null,
    parts.road,
    parts.subdistrict,
    parts.district,
    parts.province,
    parts.postalCode
  ]
    .filter(Boolean)
    .map(String);
  return bits.length ? bits.join(" · ") : null;
}

export default function AccountProfileOverview() {
  const { user, loading } = useMemberAuth();
  const [tab, setTab] = useState("overview");

  const scrollToEdit = useCallback(() => {
    const el = document.getElementById("hui-profile-edit-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    const fn = String(user.firstName || "").trim();
    const ln = String(user.lastName || "").trim();
    return [fn, ln].filter(Boolean).join(" ") || "สมาชิก";
  }, [user]);

  const shippingLine = useMemo(
    () => formatShippingSummary(user?.shippingAddressParts),
    [user]
  );

  if (loading || !user) {
    return (
      <div className="mb-8 rounded-2xl border border-hui-border bg-hui-surface/80 p-6 shadow-soft">
        <p className="text-sm text-hui-muted">กำลังโหลดโปรไฟล์…</p>
      </div>
    );
  }

  const pic = user.linePictureUrl;
  const handle = `@${String(user.username || "").toLowerCase()}`;
  const lineHint = looksLikeLineMember(user.username);

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-hui-border bg-gradient-to-br from-slate-200/90 via-slate-100 to-hui-pageTop shadow-soft">
        <div className="h-28 sm:h-36" aria-hidden />
        <div className="relative -mt-14 px-4 pb-2 sm:-mt-16 sm:px-6">
          <div className="rounded-2xl border border-hui-border bg-white px-4 py-5 shadow-soft sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="relative shrink-0">
                  {pic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pic}
                      alt=""
                      className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-hui-border sm:h-28 sm:w-28"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-hui-cta/90 to-hui-burgundy text-2xl font-bold text-white shadow-md ring-2 ring-hui-border sm:h-28 sm:w-28"
                      aria-hidden
                    >
                      {initials(
                        user.firstName,
                        user.lastName,
                        user.username
                      )}
                    </div>
                  )}
                  <span
                    className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"
                    title="สมาชิกที่ใช้งาน"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-hui-muted">
                    โปรไฟล์สมาชิก
                  </p>
                  <h2 className="hui-h2 mt-0.5 truncate text-hui-burgundy">
                    {displayName}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-hui-muted">
                    {handle}
                  </p>
                  {lineHint ? (
                    <p className="mt-2 text-xs leading-relaxed text-hui-muted">
                      เข้าระบบด้วย LINE — รูปโปรไฟล์ซิงก์จาก LINE เมื่อเข้าล่าสุด
                      {pic ? null : " (ยังไม่มีรูปในระบบ — ล็อกอิน LINE อีกครั้งเพื่ออัปเดต)"}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={scrollToEdit}
                className="hui-btn-primary shrink-0 self-start px-6 py-2.5 text-sm"
              >
                แก้ไขโปรไฟล์
              </button>
            </div>

            <div
              className="mt-6 flex flex-wrap gap-1 border-t border-hui-border pt-4"
              role="tablist"
              aria-label="เมนูโปรไฟล์"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === t.id
                      ? "bg-hui-cta/15 text-hui-cta ring-1 ring-hui-cta/30"
                      : "text-hui-muted hover:bg-hui-pageTop hover:text-hui-body"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={scrollToEdit}
                className="rounded-full px-4 py-2 text-sm font-semibold text-hui-muted transition hover:bg-hui-pageTop hover:text-hui-body"
              >
                ตั้งค่าบัญชี
              </button>
            </div>
          </div>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-hui-border bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <h3 className="hui-h3 text-base">ภาพรวมโปรไฟล์</h3>
              <button
                type="button"
                onClick={scrollToEdit}
                className="text-sm font-semibold text-hui-cta hover:underline"
              >
                แก้ไข
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-hui-body">
              ใช้พื้นที่นี้เป็นหน้าแรกของคุณหลังล็อกอิน — แสดงชื่อจาก LINE
              (แยกเป็นชื่อ–นามสกุลในระบบ) และลิงก์ติดต่อที่ตั้งไว้
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.email ? (
                <a
                  href={`mailto:${encodeURIComponent(user.email)}`}
                  className="inline-flex items-center rounded-full border border-hui-border bg-hui-pageTop px-3 py-1.5 text-xs font-medium text-hui-section hover:border-hui-cta/40"
                >
                  อีเมล
                </a>
              ) : null}
              {user.prizeContactLine ? (
                <span className="inline-flex items-center rounded-full border border-hui-border bg-hui-pageTop px-3 py-1.5 text-xs font-medium text-hui-section">
                  LINE ติดต่อรางวัล: {user.prizeContactLine}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={scrollToEdit}
                  className="text-xs font-medium text-hui-cta hover:underline"
                >
                  + เพิ่ม LINE สำหรับติดต่อรางวัล
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-hui-border bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <h3 className="hui-h3 text-base">ข้อมูลส่วนตัว</h3>
              <button
                type="button"
                onClick={scrollToEdit}
                className="text-sm font-semibold text-hui-cta hover:underline"
              >
                แก้ไข
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-hui-muted">ชื่อ</dt>
                <dd className="font-medium text-hui-section">
                  {user.firstName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-hui-muted">นามสกุล</dt>
                <dd className="font-medium text-hui-section">
                  {user.lastName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-hui-muted">อีเมล</dt>
                <dd className="font-medium text-hui-section">
                  {user.email || (
                    <span className="text-hui-muted">ยังไม่ได้กรอก</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-hui-muted">เบอร์โทร</dt>
                <dd className="font-medium text-hui-section">
                  {user.phone || (
                    <span className="text-hui-muted">ยังไม่ได้กรอก</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-hui-border bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <h3 className="hui-h3 text-base">ที่อยู่จัดส่ง</h3>
              <button
                type="button"
                onClick={scrollToEdit}
                className="text-sm font-semibold text-hui-cta hover:underline"
              >
                แก้ไข
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-hui-body">
              {shippingLine ||
                user.shippingAddress ||
                "ยังไม่ได้กรอกที่อยู่ — ใช้เมื่อรับของรางวัลหรือจัดส่ง"}
            </p>
          </section>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-hui-border bg-hui-surface/60 p-8 text-center shadow-soft">
          <h3 className="hui-h3">บล็อก & โปรโมทกิจกรรม</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-hui-muted">
            กำลังออกแบบให้คุณโพสต์กิจกรรม โปรโมทตัวเอง หรือลิงก์ไปยังช่องทางของคุณ —
            ฟีเจอร์นี้จะต่อจากหน้าโปรไฟล์นี้โดยไม่ต้องย้ายธีม
          </p>
        </div>
      )}

      {lineHint && isNewFormatMemberLoginCode(user.username) ? (
        <p className="mt-4 text-center text-xs text-hui-muted">
          รหัสเข้าระบบ 6 หลักของคุณคือ{" "}
          <span className="font-mono font-semibold text-hui-section">
            {user.username}
          </span>
        </p>
      ) : null}
    </div>
  );
}
