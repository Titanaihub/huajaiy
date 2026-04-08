"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { postUploadFormData } from "../lib/uploadClient";
import { useMemberAuth } from "./MemberAuthProvider";

function normalizeHttpsProfileUrl(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  let s = t;
  if (/^http:\/\//i.test(s)) s = s.replace(/^http:/i, "https:");
  else if (!/^https:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

async function uploadPublicImage(file) {
  const body = new FormData();
  body.append("image", file);
  const data = await postUploadFormData(body);
  return data.publicUrl;
}

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("อ่านรูปไม่ได้"));
    img.src = objectUrl;
  });
}

const JPEG_FLAT_BG = "#f8fafc";

async function compressToJpeg(file) {
  const img = await loadImage(file);
  const maxSide = 1920;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = JPEG_FLAT_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("บีบอัดไม่สำเร็จ"))),
      "image/jpeg",
      0.85
    );
  });
}

function isProbablyPng(file) {
  return (
    (file.type && String(file.type).toLowerCase() === "image/png") ||
    /\.png$/i.test(file.name || "")
  );
}

const TITLE_PLACEHOLDER_MAX_LEN = 72;

/** ตัวอย่างในช่องกรอก — อิงเฉพาะบัญชีที่ล็อกอิน ไม่ใช้ชื่อสมาชิกคนอื่น */
function buildPublicPageTitlePlaceholder(user) {
  if (!user || typeof user !== "object") {
    return "ตั้งชื่อที่แสดงบนหัวเพจ (เว้นว่าง = ใช้ชื่อในบัญชี)";
  }
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    const s = `เช่น ${fullName}`;
    return s.length > TITLE_PLACEHOLDER_MAX_LEN
      ? `${s.slice(0, TITLE_PLACEHOLDER_MAX_LEN - 1)}…`
      : s;
  }
  const un = String(user.username || "").trim();
  if (un) {
    const s = `เช่น เพจ @${un}`;
    return s.length > TITLE_PLACEHOLDER_MAX_LEN
      ? `${s.slice(0, TITLE_PLACEHOLDER_MAX_LEN - 1)}…`
      : s;
  }
  return "ตั้งชื่อที่แสดงบนหัวเพจ (เว้นว่าง = ใช้ชื่อในบัญชี)";
}

async function uploadBannerImage(file) {
  const body = new FormData();
  if (isProbablyPng(file)) {
    body.append(
      "image",
      file,
      file.name && /\.png$/i.test(file.name) ? file.name : `upload-${Date.now()}.png`
    );
  } else {
    const blob = await compressToJpeg(file);
    body.append(
      "image",
      new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" })
    );
  }
  const data = await postUploadFormData(body);
  return data.publicUrl;
}

/**
 * @param {{ username: string; member: Record<string, unknown> }} props
 */
export default function PublicMemberPageOwnerPanel({ username, member }) {
  const router = useRouter();
  const { user, patchProfile } = useMemberAuth();
  const [open, setOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [lineDraft, setLineDraft] = useState("");
  const [fbDraft, setFbDraft] = useState("");
  const [ttDraft, setTtDraft] = useState("");
  const [socialSaving, setSocialSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [listedBusy, setListedBusy] = useState(false);

  const isOwner = useMemo(
    () =>
      Boolean(
        user &&
          String(user.username || "").toLowerCase() ===
            String(username || "").toLowerCase()
      ),
    [user, username]
  );

  const titlePlaceholder = useMemo(
    () => buildPublicPageTitlePlaceholder(user),
    [user]
  );

  useEffect(() => {
    setTitleDraft(String(member?.publicPageTitle || "").trim());
    setBioDraft(String(member?.publicPageBio || "").trim());
  }, [member?.publicPageTitle, member?.publicPageBio]);

  useEffect(() => {
    setLineDraft(String(member?.socialLineUrl || "").trim());
    setFbDraft(String(member?.socialFacebookUrl || "").trim());
    setTtDraft(String(member?.socialTiktokUrl || "").trim());
  }, [member?.socialLineUrl, member?.socialFacebookUrl, member?.socialTiktokUrl]);

  const onPickCover = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !isOwner) return;
      setErr("");
      setMsg("");
      setUploadBusy(true);
      try {
        const url = await uploadBannerImage(file);
        await patchProfile({ publicPageCoverUrl: url });
        setMsg("อัปโหลดแบนเนอร์แล้ว");
        router.refresh();
      } catch (ce) {
        setErr(ce instanceof Error ? ce.message : String(ce));
      } finally {
        setUploadBusy(false);
      }
    },
    [isOwner, patchProfile, router]
  );

  const onPickAvatar = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !isOwner) return;
      setErr("");
      setMsg("");
      setAvatarBusy(true);
      try {
        const url = await uploadPublicImage(file);
        await patchProfile({ profilePictureUrl: url });
        setMsg("อัปโหลดรูปโลโก้/รูปกลมแล้ว");
        router.refresh();
      } catch (ce) {
        setErr(ce instanceof Error ? ce.message : String(ce));
      } finally {
        setAvatarBusy(false);
      }
    },
    [isOwner, patchProfile, router]
  );

  const clearAvatar = useCallback(async () => {
    if (!isOwner) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      await patchProfile({ profilePictureUrl: null });
      setMsg("ลบรูปที่อัปโหลดแล้ว — ถ้าล็อกอิน LINE ไว้จะใช้รูปจาก LINE");
      router.refresh();
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setSaving(false);
    }
  }, [isOwner, patchProfile, router]);

  const saveSocial = useCallback(async () => {
    if (!isOwner) return;
    setErr("");
    setMsg("");
    setSocialSaving(true);
    try {
      await patchProfile({
        socialLineUrl: normalizeHttpsProfileUrl(lineDraft),
        socialFacebookUrl: normalizeHttpsProfileUrl(fbDraft),
        socialTiktokUrl: normalizeHttpsProfileUrl(ttDraft)
      });
      setMsg("บันทึกลิงก์ LINE / Facebook / TikTok แล้ว");
      router.refresh();
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setSocialSaving(false);
    }
  }, [fbDraft, isOwner, lineDraft, patchProfile, router, ttDraft]);

  const clearCover = useCallback(async () => {
    if (!isOwner) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      await patchProfile({ publicPageCoverUrl: null });
      setMsg("เอารูปแบนเนอร์ออกแล้ว");
      router.refresh();
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setSaving(false);
    }
  }, [isOwner, patchProfile, router]);

  const listedOnPage = useMemo(() => {
    if (member && typeof member === "object" && "publicPageListed" in member) {
      return member.publicPageListed === true;
    }
    return user?.publicPageListed !== false;
  }, [member, user?.publicPageListed]);

  const toggleListed = useCallback(async () => {
    if (!isOwner) return;
    setErr("");
    setMsg("");
    setListedBusy(true);
    try {
      await patchProfile({ publicPageListed: !listedOnPage });
      setMsg(
        !listedOnPage
          ? "เผยแพร่เพจแล้ว — ผู้เยี่ยมชมเห็นเพจและลิงก์ในชุมชนได้"
          : "ซ่อนเพจแล้ว — ผู้เยี่ยมชมจะไม่เห็นเพจจนกว่าจะเผยแพร่อีกครั้ง"
      );
      router.refresh();
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setListedBusy(false);
    }
  }, [isOwner, listedOnPage, patchProfile, router]);

  const saveText = useCallback(async () => {
    if (!isOwner) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      await patchProfile({
        publicPageTitle: titleDraft.trim() === "" ? null : titleDraft.trim(),
        publicPageBio: bioDraft.trim() === "" ? null : bioDraft.trim()
      });
      setMsg("บันทึกชื่อเพจและคำอธิบายแล้ว");
      router.refresh();
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setSaving(false);
    }
  }, [bioDraft, isOwner, patchProfile, router, titleDraft]);

  if (!isOwner) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm">
      {!listedOnPage ? (
        <p className="mb-3 rounded-lg border border-amber-300/80 bg-white/80 px-3 py-2 text-xs leading-relaxed text-amber-950">
          เพจยัง<strong className="font-semibold">ไม่แสดง</strong>บนเว็บสาธารณะและในรายการเพจชุมชน — กด{" "}
          <strong className="font-semibold">เผยแพร่เพจ</strong> เมื่อต้องการให้คนอื่นเปิดลิงก์นี้ได้
        </p>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={listedBusy || saving || uploadBusy || avatarBusy || socialSaving}
          onClick={toggleListed}
          className={
            listedOnPage
              ? "rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-950 shadow ring-1 ring-amber-300/80 hover:bg-amber-100/80 disabled:opacity-50"
              : "rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
          }
        >
          {listedBusy
            ? "กำลังอัปเดต…"
            : listedOnPage
              ? "ยกเลิกการเผยแพร่ (ซ่อนเพจ)"
              : "เผยแพร่เพจสู่เว็บ"}
        </button>
        <span className="text-[11px] text-amber-900/85">
          สถานะ: {listedOnPage ? "เผยแพร่แล้ว" : "ยังไม่เผยแพร่"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left font-semibold text-amber-950"
      >
        <span>แก้ไขเพจของฉัน</span>
        <span className="text-xs font-normal opacity-80">{open ? "ซ่อน" : "เปิด"}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-4 border-t border-amber-200/80 pt-3">
          <p className="text-xs leading-relaxed text-amber-900/90">
            <strong className="font-semibold">แบนเนอร์</strong> แนะนำความกว้างอย่างน้อย{" "}
            <strong className="font-semibold">1200 px</strong> อัตราส่วนประมาณ{" "}
            <strong className="font-semibold">3:1 ถึง 4:1</strong> (เช่น{" "}
            <strong className="font-semibold">1200×400</strong> หรือ{" "}
            <strong className="font-semibold">1200×300</strong>) — ระบบครอปให้พอดีแถบปกบนเว็บ
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-950 shadow ring-1 ring-amber-300/80 hover:bg-amber-100/80">
              {uploadBusy ? "กำลังอัปโหลด…" : "อัปโหลดแบนเนอร์"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={uploadBusy || saving || avatarBusy || socialSaving}
                onChange={onPickCover}
              />
            </label>
            {String(member?.publicPageCoverUrl || "").trim() ? (
              <button
                type="button"
                disabled={saving || uploadBusy || avatarBusy || socialSaving}
                onClick={clearCover}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-950 shadow ring-1 ring-amber-300/80 hover:bg-amber-100/80 disabled:opacity-50"
              >
                เอารูปแบนเนอร์ออก
              </button>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-amber-900/90">
            <strong className="font-semibold">รูปโลโก้ (วงกลม)</strong> อัปโหลดเป็น{" "}
            <strong className="font-semibold">สี่เหลี่ยมจัตุรัส</strong> แนะนำ{" "}
            <strong className="font-semibold">500×500 px</strong> (อย่างน้อย{" "}
            <strong className="font-semibold">400×400</strong>) — ระบบแสดงเป็นวงกลม
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-950 shadow ring-1 ring-amber-300/80 hover:bg-amber-100/80">
              {avatarBusy ? "กำลังอัปโหลด…" : "อัปโหลดรูปโลโก้"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={avatarBusy || saving || uploadBusy || socialSaving}
                onChange={onPickAvatar}
              />
            </label>
            {String(member?.profilePictureUrl || "").trim() ? (
              <button
                type="button"
                disabled={saving || avatarBusy || uploadBusy || socialSaving}
                onClick={clearAvatar}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-950 shadow ring-1 ring-amber-300/80 hover:bg-amber-100/80 disabled:opacity-50"
              >
                ใช้รูปจาก LINE แทน
              </button>
            ) : null}
          </div>

          <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-3">
            <p className="text-xs font-semibold text-amber-950">ลิงก์โซเชียล (ไอคอนสีบนเพจ)</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900/85">
              ใส่ URL เต็มขึ้นต้นด้วย <code className="rounded bg-amber-100/90 px-1">https://</code>{" "}
              หรือพิมพ์เฉพาะโดเมน ระบบจะเติมให้ — ว่าง = ยังไม่เชื่อมลิงก์
            </p>
            <label className="mt-2 block text-[11px] font-medium text-amber-900" htmlFor="owner-social-line">
              LINE
            </label>
            <input
              id="owner-social-line"
              type="url"
              value={lineDraft}
              onChange={(e) => setLineDraft(e.target.value)}
              placeholder="https://line.me/ti/p/~..."
              className="mt-0.5 w-full rounded-lg border border-amber-200/90 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-400"
            />
            <label className="mt-2 block text-[11px] font-medium text-amber-900" htmlFor="owner-social-fb">
              Facebook
            </label>
            <input
              id="owner-social-fb"
              type="url"
              value={fbDraft}
              onChange={(e) => setFbDraft(e.target.value)}
              placeholder="https://facebook.com/..."
              className="mt-0.5 w-full rounded-lg border border-amber-200/90 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-400"
            />
            <label className="mt-2 block text-[11px] font-medium text-amber-900" htmlFor="owner-social-tt">
              TikTok
            </label>
            <input
              id="owner-social-tt"
              type="url"
              value={ttDraft}
              onChange={(e) => setTtDraft(e.target.value)}
              placeholder="https://www.tiktok.com/@..."
              className="mt-0.5 w-full rounded-lg border border-amber-200/90 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-400"
            />
            <button
              type="button"
              disabled={socialSaving || saving || uploadBusy || avatarBusy}
              onClick={() => void saveSocial()}
              className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {socialSaving ? "กำลังบันทึก…" : "บันทึกลิงก์โซเชียล"}
            </button>
            <p className="mt-2 text-[10px] text-amber-900/75">
              แก้ได้ที่นี่หรือที่{" "}
              <Link href="/member" className="font-semibold text-amber-950 underline underline-offset-2">
                เมนูสมาชิก
              </Link>
            </p>
          </div>
          <div>
            <label htmlFor="public-page-title" className="block text-xs font-medium text-amber-900">
              ชื่อเพจ (แยกจากชื่อ–นามสกุลในบัญชี)
            </label>
            <input
              id="public-page-title"
              type="text"
              maxLength={120}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder={titlePlaceholder}
              className="mt-1 w-full rounded-lg border border-amber-200/90 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none ring-0 placeholder:text-gray-400 focus:border-amber-400"
            />
            <p className="mt-0.5 text-[11px] text-amber-900/75">
              ถ้าเว้นว่าง จะใช้ชื่อ–นามสกุลในบัญชีแทน
            </p>
          </div>
          <div>
            <label htmlFor="public-page-bio" className="block text-xs font-medium text-amber-900">
              คำอธิบายบนเพจ
            </label>
            <textarea
              id="public-page-bio"
              rows={3}
              maxLength={2000}
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              placeholder="เขียนแนะนำเพจของคุณ…"
              className="mt-1 w-full resize-y rounded-lg border border-amber-200/90 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-amber-400"
            />
          </div>
          <button
            type="button"
            disabled={saving || uploadBusy || avatarBusy || socialSaving}
            onClick={saveText}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก…" : "บันทึกชื่อเพจและคำอธิบาย"}
          </button>
          {err ? (
            <p className="text-xs font-medium text-red-700" role="alert">
              {err}
            </p>
          ) : null}
          {msg ? (
            <p className="text-xs font-medium text-emerald-800" role="status">
              {msg}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
