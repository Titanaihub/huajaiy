"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AdminCentralGamePanel from "./AdminCentralGamePanel";
import { DEFAULT_NEW_ROOM_HEART_PRESET } from "../lib/centralGameDefaults";
import {
  CENTRAL_GAME_ADMIN_LINE_URL,
  CENTRAL_GAME_MAX_PER_MEMBER,
  CENTRAL_GAME_MAX_TILES
} from "../lib/centralGameLimits";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCentralGameCreate,
  apiAdminCentralGameDetail,
  apiAdminCentralGamesList
} from "../lib/rolesApi";
import { useMemberAuth } from "./MemberAuthProvider";

/** เซสชันเบราว์เซอร์ — กู้ร่างเดิมได้เฉพาะเกมที่ยังไม่มีผู้ได้รางวัล (ดูใน useEffect) */
const MEMBER_DRAFT_SESSION_KEY = "huajaiy.memberCreateDraftId";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** POST สร้างเกมถูกปฏิเสธเพราะโควต้า — ใช้เกมที่มีอยู่แทนร่างใหม่ */
function isCentralGameQuotaError(message) {
  const m = String(message || "");
  return (
    m.includes("สร้างได้ไม่เกิน") ||
    /ไม่เกิน\s*\d+\s*เกม/u.test(m) ||
    m.includes("ครบตามจำนวนสูงสุด")
  );
}

const PURPOSES = [
  {
    id: "shop_sales",
    label: "ร้านค้า — เพื่อให้เกิดการขาย"
  },
  {
    id: "product_promo",
    label: "โปรโมชันสินค้า"
  },
  {
    id: "giveaway",
    label: "ใจดี — อยากแจกรางวัล"
  },
  {
    id: "other",
    label: "อื่นๆ (ต้องระบุเหตุผล)"
  }
];

/** บันทึกลงคำอธิบายเกม — ใช้เฉพาะข้อความที่ผู้สร้างกรอก (ไม่แทรกบรรทัดวัตถุประสงค์อัตโนมัติในช่องรายละเอียด) */
function buildDescription({ purpose, otherReason, prizeConditions }) {
  const head = [];
  if (purpose === "other" && otherReason.trim()) {
    head.push(`เหตุผล (อื่นๆ): ${otherReason.trim()}`);
  }
  const body = prizeConditions.trim();
  if (!head.length) return body;
  if (!body) return head.join("\n");
  return [...head, "", body].join("\n");
}

export default function CreateGameRoomForm({
  hideShellPageTitle = false,
  /** เปิดจาก /member/create-game — หน้าเดียว: กรอกด้านบนแล้วตั้งค่าเกมเต็มด้านล่างโดยไม่สลับหน้า */
  memberShellEmbed = false
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gameFromUrl = searchParams.get("game");
  /** ทั้ง /member/create-game และ /account/create-game?member_embed=1 (iframe ในเชลล์สมาชิก) */
  const isMemberEmbed =
    Boolean(memberShellEmbed) || searchParams.get("member_embed") === "1";
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
  const [introTick, setIntroTick] = useState(0);
  const [studioGameId, setStudioGameId] = useState(null);
  const [draftBootErr, setDraftBootErr] = useState("");
  const [bootstrapNotice, setBootstrapNotice] = useState("");
  const studioRef = useRef(null);

  useEffect(() => {
    if (!managingExisting) return;
    if (typeof gameFromUrl !== "string" || !UUID_RE.test(gameFromUrl.trim())) return;
    const id = gameFromUrl.trim();
    setStudioGameId(id);
    if (isMemberEmbed) {
      sessionStorage.setItem(MEMBER_DRAFT_SESSION_KEY, id);
    }
  }, [managingExisting, gameFromUrl, isMemberEmbed]);

  /**
   * โหมดสมาชิก: กู้ร่างจาก session เฉพาะเมื่อเกมนั้นยังไม่มีผู้ได้รางวัล
   * (ถ้ามีรางวัลแล้ว — ไม่ดึงมาโชว์หน้า «สร้างเกมใหม่» ให้ไปจัดการจาก «เกมของฉัน»)
   */
  useEffect(() => {
    if (!isMemberEmbed || !user || loading) return;
    if (managingExisting) return;
    if (studioGameId) return;

    const stored = sessionStorage.getItem(MEMBER_DRAFT_SESSION_KEY)?.trim();
    if (!stored || !UUID_RE.test(stored)) return;

    let cancelled = false;
    (async () => {
      try {
        const token = getMemberToken();
        if (!token) return;
        const data = await apiAdminCentralGameDetail(token, stored);
        const awardCount = Math.max(0, Math.floor(Number(data?.prizeAwardCount)) || 0);
        if (awardCount > 0) {
          sessionStorage.removeItem(MEMBER_DRAFT_SESSION_KEY);
          return;
        }
        if (!cancelled) setStudioGameId(stored);
      } catch {
        sessionStorage.removeItem(MEMBER_DRAFT_SESSION_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMemberEmbed, user, loading, managingExisting, studioGameId]);

  /** หลังสร้างร่าง — ใส่ ?game= ให้ตรงกับแถบที่อยู่ รีเฟรชแล้วยังกลับมาแก้ต่อได้ */
  function syncMemberCreateGameUrl(gid) {
    if (!gid || !UUID_RE.test(String(gid).trim())) return;
    const id = String(gid).trim();
    const q = new URLSearchParams(searchParams.toString());
    q.set("game", id);
    const path = pathname || "/member/create-game";
    router.replace(`${path}?${q.toString()}#game-studio`);
  }

  async function handleMemberCreateDraft() {
    setErr("");
    setDraftBootErr("");
    setBootstrapNotice("");
    try {
      buildMemberIntroMergeOrThrow();
    } catch (e) {
      setErr(e?.message || String(e));
      return;
    }
    const token = getMemberToken();
    if (!token) {
      setErr("ไม่ได้เข้าสู่ระบบ — กรุณาล็อกอินใหม่");
      return;
    }
    setBusy(true);
    try {
      const description = buildDescription({
        purpose,
        otherReason,
        prizeConditions: ""
      });
      const title = `เกมใหม่ — ${new Date().toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short"
      })}`;
      const data = await apiAdminCentralGameCreate(token, {
        title,
        description,
        setCount: 1,
        imagesPerSet: 4,
        ...DEFAULT_NEW_ROOM_HEART_PRESET
      });
      const gid = data.game?.id || data.snapshot?.game?.id || null;
      if (!gid) {
        throw new Error("สร้างร่างแล้วแต่ไม่ได้รับรหัสเกมจากระบบ — ลองรีเฟรชหน้า");
      }
      sessionStorage.setItem(MEMBER_DRAFT_SESSION_KEY, gid);
      setStudioGameId(gid);
      syncMemberCreateGameUrl(gid);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          document.getElementById("game-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (ex) {
      const msg = ex?.message || String(ex);
      if (isCentralGameQuotaError(msg)) {
        try {
          const list = await apiAdminCentralGamesList(token);
          const games = Array.isArray(list.games) ? list.games : [];
          const pick = games[0];
          const id = pick && pick.id ? String(pick.id).trim() : "";
          if (id && UUID_RE.test(id)) {
            sessionStorage.setItem(MEMBER_DRAFT_SESSION_KEY, id);
            setStudioGameId(id);
            syncMemberCreateGameUrl(id);
            setBootstrapNotice(
              `บัญชีนี้มีเกมครบ ${CENTRAL_GAME_MAX_PER_MEMBER} เกมแล้ว — เปิดเกมล่าสุดให้แก้ไขด้านล่าง หากต้องการสร้างร่างใหม่ให้ลบเกมเก่าที่ «เกมของฉัน» ก่อน`
            );
            return;
          }
        } catch {
          /* fall through */
        }
      }
      setDraftBootErr(ex?.message || "สร้างเกมร่างไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  /** ใช้ร่วมกับปุ่ม «บันทึกข้อมูล» ในแผงสตูดิโอ — ผนวกเฉพาะเหตุผล (อื่นๆ) ถ้ามี ไม่แทรกบรรทัดวัตถุประสงค์ */
  function buildMemberIntroMergeOrThrow() {
    if (!agreeRules) {
      throw new Error("กรุณากดยืนยันว่ารับทราบกฎระเบียบและความรับผิดชอบ");
    }
    if (purpose === "other" && otherReason.trim().length < 8) {
      throw new Error("กรุณาระบุเหตุผล (อื่นๆ) อย่างน้อย 8 ตัวอักษร");
    }
    const descriptionPrefix = buildDescription({ purpose, otherReason, prizeConditions: "" });
    return { descriptionPrefix };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (isMemberEmbed) return;

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
      const nextUrl = `/account/create-game?game=${encodeURIComponent(gid)}#game-studio`;
      router.replace(nextUrl);
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

  const memberPolicyStack = isMemberEmbed ? (
    <div className="space-y-4">
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
      <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950">
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
  ) : null;

  const intakeForm = (
      <form
        onSubmit={onSubmit}
        className="space-y-6"
      >
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

        {!isMemberEmbed ? (
          <>
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
          </>
        ) : null}

        {!isMemberEmbed ? (
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
        ) : null}

        {!isMemberEmbed ? (
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
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-hui-border bg-hui-surface/90 p-4 text-sm text-hui-body">
          <input
            type="checkbox"
            checked={agreeRules}
            onChange={(e) => setAgreeRules(e.target.checked)}
            className="mt-1"
          />
          <span>
            {isMemberEmbed ? (
              <>
                ยืนยันรับทราบกฎข้างต้น (ห้ามพนัน/สื่อลามก) และรับผิดชอบจ่ายรางวัลตามที่กรอก
              </>
            ) : (
              <>
                ข้าพเจ้า<strong>รับทราบและยินยอม</strong>ตามกฎระเบียบข้างต้น รวมถึงข้อห้ามเรื่องการพนันและสื่อลามก
                และรับทราบว่าข้าพเจ้ามีหน้าที่จ่ายรางวัลและชี้แจงเงื่อนไขให้ผู้เล่นตามที่กรอกไว้
              </>
            )}
          </span>
        </label>

        {isMemberEmbed ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              disabled={busy || Boolean(studioGameId)}
              onClick={() => void handleMemberCreateDraft()}
              className="hui-btn-primary px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "กำลังสร้างร่าง…"
                : studioGameId
                  ? "สร้างร่างแล้ว — เลื่อนลงไปตั้งค่าได้ด้านล่าง"
                  : "สร้างร่างเกมและเปิดแผงตั้งค่า"}
            </button>
            <p className="text-sm text-hui-muted">
              ระบบจะบันทึกเกมเป็นร่างเมื่อกดปุ่มนี้เท่านั้น — แค่เข้ามาดูหน้านี้จะไม่สร้างเกมในรายการให้
            </p>
          </div>
        ) : null}

        {!isMemberEmbed ? (
          <p className="text-sm leading-relaxed text-hui-muted">
            หลังเปิดห้อง ระบบจะสร้างเกมด้วยค่าเริ่มต้น{" "}
            <strong className="font-medium text-hui-section">หักหัวใจแดง 1 ต่อรอบ</strong>{" "}
            <span className="text-hui-muted">(ปรับโหมด/ยอดได้ทันทีในขั้นตอนตั้งค่าเกมด้านล่าง)</span>
          </p>
        ) : null}

        {err ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {err}
          </p>
        ) : null}

        {!isMemberEmbed ? (
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
          </div>
        ) : null}
      </form>
  );

  const panelFocusId =
    managingExisting && typeof gameFromUrl === "string" && UUID_RE.test(gameFromUrl.trim())
      ? gameFromUrl.trim()
      : studioGameId;

  return (
    <div className="space-y-8">
      {isMemberEmbed ? memberPolicyStack : null}
      <div>
        {hideShellPageTitle ? null : (
          <h2 className="hui-h2">
            {isMemberEmbed
              ? "สร้างเกม"
              : managingExisting
                ? "จัดการห้องเกม"
                : "เปิดห้องเกม"}
          </h2>
        )}
        {!isMemberEmbed ? (
          <p className={`text-sm text-hui-muted ${hideShellPageTitle ? "" : "mt-1"}`}>
            {managingExisting
              ? "ด้านล่างคือแผงตั้งค่าเกมของคุณ"
              : "เลือกวัตถุประสงค์ อ่านข้อห้ามและกฎระเบียบ แล้วระบุเงื่อนไขรางวัลให้ชัดเจน"}
          </p>
        ) : null}
        {!isMemberEmbed ? (
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
        ) : null}
      </div>

      {memberShellEmbed || !managingExisting ? intakeForm : null}

      {draftBootErr ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {draftBootErr}
        </p>
      ) : null}

      {bootstrapNotice ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          {bootstrapNotice}
        </p>
      ) : null}

      {user ? (
        <div
          ref={studioRef}
          id="game-studio"
          className="scroll-mt-8 border-t border-hui-border pt-10"
        >
          <h3 className="hui-h3">ตั้งค่าห้องเกมของฉัน</h3>

          {isMemberEmbed && !panelFocusId && draftBootErr ? (
            <div
              className="mt-6 space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900"
              role="alert"
            >
              <p className="font-semibold text-rose-950">ยังเปิดแผงตั้งค่าไม่ได้</p>
              <p className="whitespace-pre-wrap leading-relaxed">{draftBootErr}</p>
              <button
                type="button"
                className="rounded-full bg-[#FF2E8C] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                onClick={() => {
                  setDraftBootErr("");
                }}
              >
                ปิดข้อความนี้
              </button>
            </div>
          ) : null}

          {isMemberEmbed && !panelFocusId && busy ? (
            <div
              className="mt-6 rounded-2xl border border-dashed border-pink-200 bg-pink-50/50 px-5 py-10 text-center"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-pink-900">กำลังสร้างร่างเกม…</p>
            </div>
          ) : null}

          {(!isMemberEmbed || panelFocusId) ? (
            <div className="mt-6">
              <AdminCentralGamePanel
                key={panelFocusId || "my-games-studio"}
                embedded
                memberShellEmbed={isMemberEmbed}
                memberBasicInfoOnly={false}
                focusGameId={panelFocusId}
                suppressTopPolicyCallouts={Boolean(isMemberEmbed)}
                disableEmbeddedAutoSelect={Boolean(isMemberEmbed)}
                hideEmbeddedGamesTable={Boolean(isMemberEmbed)}
                externalReloadToken={introTick}
                beforePersistMeta={
                  isMemberEmbed
                    ? async () => buildMemberIntroMergeOrThrow()
                    : undefined
                }
                onBeforePersistMetaError={(msg) => setErr(msg)}
                onAfterSuccessfulSave={
                  isMemberEmbed
                    ? () => {
                        setErr("");
                        setIntroTick((x) => x + 1);
                      }
                    : undefined
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
