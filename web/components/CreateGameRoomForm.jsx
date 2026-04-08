"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AdminCentralGamePanel from "./AdminCentralGamePanel";
import { DEFAULT_NEW_ROOM_HEART_PRESET } from "../lib/centralGameDefaults";
import {
  CENTRAL_GAME_ADMIN_LINE_URL,
  CENTRAL_GAME_MAX_PER_MEMBER,
  CENTRAL_GAME_MAX_TILES
} from "../lib/centralGameLimits";
import { getMemberToken } from "../lib/memberApi";
import { apiAdminCentralGameCreate } from "../lib/rolesApi";
import { useMemberAuth } from "./MemberAuthProvider";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PURPOSES = [
  {
    id: "shop_sales",
    label: "ร้านค้า — ส่งเสริมการขาย"
  },
  {
    id: "product_promo",
    label: "โปรโมทสินค้า"
  },
  {
    id: "giveaway",
    label: "ใจป๋า — อยากแจกรางวัล"
  },
  {
    id: "other",
    label: "อื่นๆ (ต้องระบุเหตุผล)"
  }
];

function purposeLabel(id) {
  return PURPOSES.find((p) => p.id === id)?.label || id;
}

function buildDescription({ purpose, otherReason, prizeConditions }) {
  const lines = [
    `วัตถุประสงค์เปิดห้องเกม: ${purposeLabel(purpose)}`,
    purpose === "other" && otherReason.trim()
      ? `เหตุผล (อื่นๆ): ${otherReason.trim()}`
      : null,
    "",
    "เงื่อนไขรางวัล / ข้อความถึงผู้เล่น:",
    prizeConditions.trim(),
    "",
    "ผู้สร้างยืนยันรับทราบกฎระเบียบบนแพลตฟอร์ม (ห้ามเชื่อมโยงการพนัน และห้ามสื่อลามก) และรับผิดชอบจ่ายรางวัลตามที่ประกาศไว้"
  ];
  return lines.filter((x) => x != null).join("\n");
}

export default function CreateGameRoomForm({ hideShellPageTitle = false } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameFromUrl = searchParams.get("game");
  const isMemberEmbed = searchParams.get("member_embed") === "1";
  const studioEditFull = searchParams.get("edit") === "full";
  const managingExisting =
    typeof gameFromUrl === "string" && UUID_RE.test(gameFromUrl.trim());

  const { user, loading } = useMemberAuth();
  const [purpose, setPurpose] = useState("shop_sales");
  const [otherReason, setOtherReason] = useState("");
  const [prizeConditions, setPrizeConditions] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [agreeRules, setAgreeRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [studioGameId, setStudioGameId] = useState(null);
  const studioRef = useRef(null);

  useEffect(() => {
    if (!managingExisting) return;
    setStudioGameId(gameFromUrl.trim());
  }, [managingExisting, gameFromUrl]);

  useEffect(() => {
    if (!studioGameId || !studioRef.current) return;
    studioRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [studioGameId]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!agreeRules) {
      setErr("กรุณากดยืนยันว่ารับทราบกฎระเบียบและความรับผิดชอบ");
      return;
    }
    if (purpose === "other" && otherReason.trim().length < 8) {
      setErr("กรุณาระบุเหตุผล (อื่นๆ) อย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (prizeConditions.trim().length < 15) {
      setErr("กรุณาอธิบายเงื่อนไขรางวัลให้ชัดเจน (อย่างน้อย 15 ตัวอักษร)");
      return;
    }

    const token = getMemberToken();
    if (!token) {
      setErr("ไม่ได้เข้าสู่ระบบ — กรุณาล็อกอินใหม่");
      return;
    }

    const titleBase =
      roomTitle.trim() ||
      `ห้องเกม — ${new Date().toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })}`;
    const title = titleBase.slice(0, 200);
    const description = buildDescription({ purpose, otherReason, prizeConditions });

    setBusy(true);
    try {
      const data = await apiAdminCentralGameCreate(token, {
        title,
        description,
        setCount: 1,
        imagesPerSet: 4,
        ...DEFAULT_NEW_ROOM_HEART_PRESET
      });
      const gid = data.game?.id || data.snapshot?.game?.id || null;
      if (!gid) throw new Error("สร้างห้องแล้วแต่ไม่ได้รับรหัสเกม — ลองรีเฟรชหน้า");
      setStudioGameId(gid);
      const nextUrl = isMemberEmbed
        ? `/member/game-studio?game=${encodeURIComponent(gid)}`
        : `/account/create-game?game=${encodeURIComponent(gid)}#game-studio`;
      if (isMemberEmbed && typeof window !== "undefined") {
        try {
          if (window.top && window.top !== window) {
            window.top.location.assign(nextUrl);
          } else if (window.parent && window.parent !== window) {
            window.parent.location.assign(nextUrl);
          } else {
            window.location.assign(nextUrl);
          }
        } catch {
          window.location.assign(nextUrl);
        }
        return;
      }
      router.replace(nextUrl);
      // บางเครื่อง/บางเบราว์เซอร์ไม่รีเฟรช query ทันที จึงบังคับเปลี่ยนหน้าเป็น fallback
      if (typeof window !== "undefined") {
        window.location.assign(nextUrl);
      }
    } catch (ex) {
      setErr(ex?.message || "เปิดห้องเกมไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-hui-muted" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-hui-border bg-hui-surface p-6 text-sm text-hui-body shadow-soft">
        <p className="font-medium text-hui-section">ต้องเข้าสู่ระบบก่อน</p>
        <p className="mt-2">
          <Link
            href="/login"
            className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    );
  }

  const intakeForm = (
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded-2xl border border-hui-border bg-hui-surface p-4 pt-5 shadow-soft">
          <div className="-mx-1 border-b border-hui-border/70 pb-3">
            <h3 className="hui-h3 leading-snug">
              วัตถุประสงค์ในการเปิดห้องเกม
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-hui-muted">
              เลือกข้อที่ตรงกับการใช้งานของคุณมากที่สุด
            </p>
          </div>
          <ul className="mt-4 w-full max-w-none space-y-3">
            {PURPOSES.map((p) => (
              <li key={p.id} className="w-full">
                <label className="flex w-full min-w-0 cursor-pointer items-start gap-3 text-sm leading-snug text-hui-body">
                  <input
                    type="radio"
                    name="purpose"
                    value={p.id}
                    checked={purpose === p.id}
                    onChange={() => setPurpose(p.id)}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0 flex-1">{p.label}</span>
                </label>
              </li>
            ))}
          </ul>
          {purpose === "other" ? (
            <div className="mt-4">
              <label
                htmlFor="otherReason"
                className="block text-sm font-medium text-hui-section"
              >
                เหตุผล (อื่นๆ) <span className="text-red-600">*</span>
              </label>
              <textarea
                id="otherReason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                rows={3}
                placeholder="อธิบายวัตถุประสงค์ให้ชัดเจน"
                className="hui-input"
              />
            </div>
          ) : null}
        </div>

        <div
          className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-950"
          role="note"
        >
          <p className="font-semibold text-rose-900">ข้อห้ามใช้งาน</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-rose-900/95">
            <li>
              <strong>ห้าม</strong>ใช้เกมหรือห้องเกมเพื่อธุรกิจหรือกิจกรรมที่เป็น<strong>การพนัน</strong>
              หรือชักจูงให้เล่นพนัน
            </li>
            <li>
              <strong>ห้าม</strong>ใช้เนื้อหา<strong>สื่อลามก</strong> หรือเนื้อหาที่ผิดกฎหมายและศีลธรรมอันดี
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
          <p className="font-semibold text-amber-900">กฎระเบียบสำหรับผู้สร้างเกม</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              ผู้สร้างเกมมีหน้าที่<strong>จ่ายรางวัล</strong>ตามที่กำหนดและประกาศไว้ต่อผู้เล่น
            </li>
            <li>
              ต้อง<strong>แจ้งเงื่อนไข</strong>การได้รับรางวัล วิธีรับ และระยะเวลาให้<strong>ชัดเจน</strong>{" "}
              เพื่อลดความขัดแย้ง
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
          <label htmlFor="roomTitle" className="hui-label">
            ชื่อห้อง / ชื่อเกม (ไม่บังคับ)
          </label>
          <input
            id="roomTitle"
            value={roomTitle}
            onChange={(e) => setRoomTitle(e.target.value)}
            maxLength={200}
            placeholder="เช่น ลดราคาเดือนมีนา — เกมพลิกการ์ด"
            className="hui-input"
          />
        </div>

        <div className="rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
          <label htmlFor="prizeConditions" className="hui-label">
            เงื่อนไขรางวัลและข้อความถึงผู้เล่น <span className="text-red-600">*</span>
          </label>
          <p className="mt-1 text-sm text-hui-muted">
            ระบุให้ชัด: รางวัลมีอะไรบ้าง จำนวน/มูลค่า วิธีรับ ระยะเวลา และข้อยกเว้น (ถ้ามี)
          </p>
          <textarea
            id="prizeConditions"
            value={prizeConditions}
            onChange={(e) => setPrizeConditions(e.target.value)}
            rows={6}
            required
            className="hui-input mt-2"
            placeholder="ตัวอย่าง: ผู้ที่ทายถูกครั้งแรก 3 คนแรก รับส่วนลด 100 บาท ติดต่อรับที่ LINE @xxx ภายใน 7 วัน..."
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hui-border bg-hui-surface/90 p-4 text-sm text-hui-body">
          <input
            type="checkbox"
            checked={agreeRules}
            onChange={(e) => setAgreeRules(e.target.checked)}
            className="mt-1"
          />
          <span>
            ข้าพเจ้า<strong>รับทราบและยินยอม</strong>ตามกฎระเบียบข้างต้น รวมถึงข้อห้ามเรื่องการพนันและสื่อลามก
            และรับทราบว่าข้าพเจ้ามีหน้าที่จ่ายรางวัลและชี้แจงเงื่อนไขให้ผู้เล่นตามที่กรอกไว้
          </span>
        </label>

        <p className="text-sm leading-relaxed text-hui-muted">
          หลังเปิดห้อง ระบบจะสร้างเกมด้วยค่าเริ่มต้น{" "}
          <strong className="font-medium text-hui-section">หักหัวใจแดง 1 ต่อรอบ</strong>{" "}
          <span className="text-hui-muted">(ปรับโหมด/ยอดได้ทันทีในขั้นตอนตั้งค่าเกมด้านล่าง)</span>
        </p>

        {err ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {err}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || Boolean(studioGameId)}
            className="hui-btn-primary px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "กำลังเปิดห้อง…"
              : studioGameId
                ? "สร้างห้องแล้ว"
                : "เปิดสร้างห้องเกม"}
          </button>
          {isMemberEmbed ? (
            <>
              <a
                href="/member"
                target="_top"
                rel="noopener noreferrer"
                className="text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                ← ภาพรวมสมาชิก
              </a>
              <a
                href="/member/game"
                target="_top"
                rel="noopener noreferrer"
                className="text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                เกมของฉัน
              </a>
            </>
          ) : (
            <>
              <Link
                href="/account"
                className="text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                ← กลับหลังบ้าน
              </Link>
              <Link
                href="/account/my-games"
                className="text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
              >
                เกมของฉัน
              </Link>
            </>
          )}
        </div>
      </form>
  );

  return (
    <div className="space-y-8">
      <div>
        {hideShellPageTitle ? null : (
          <h2 className="hui-h2">
            {managingExisting ? "จัดการห้องเกม" : "เปิดห้องเกม"}
          </h2>
        )}
        <p className={`text-sm text-hui-muted ${hideShellPageTitle ? "" : "mt-1"}`}>
          {managingExisting
            ? "ด้านล่างคือแผงตั้งค่าเกมของคุณ"
            : "เลือกวัตถุประสงค์ อ่านข้อห้ามและกฎระเบียบ แล้วระบุเงื่อนไขรางวัลให้ชัดเจน"}
        </p>
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950">
          <p className="font-semibold text-sky-900">ข้อกำหนดการสร้างเกม</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              1 เกมมีได้ไม่เกิน <strong>{CENTRAL_GAME_MAX_TILES}</strong> ป้าย (นับรวมทุกชุด)
            </li>
            <li>
              บัญชีสมาชิกสร้างได้ไม่เกิน <strong>{CENTRAL_GAME_MAX_PER_MEMBER}</strong> เกม
            </li>
          </ul>
          <p className="mt-2">
            หากมีปัญหาหรือต้องการปรับเพิ่ม กรุณาติดต่อแอดมิน{" "}
            <a
              href={CENTRAL_GAME_ADMIN_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-800"
            >
              LINE Official
            </a>
          </p>
        </div>
      </div>

      {!managingExisting ? intakeForm : null}

      {user ? (
        <div
          ref={studioRef}
          id="game-studio"
          className="scroll-mt-8 border-t border-hui-border pt-10"
        >
          <h3 className="hui-h3">
            {studioGameId ? "ตั้งค่าห้องเกม" : "ตั้งค่าห้องเกมของฉัน"}
          </h3>
          <div className="mt-6">
            <AdminCentralGamePanel
              key={studioGameId || "my-games-studio"}
              embedded
              memberShellEmbed={isMemberEmbed}
              memberBasicInfoOnly={isMemberEmbed && !studioEditFull}
              focusGameId={studioGameId || null}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
