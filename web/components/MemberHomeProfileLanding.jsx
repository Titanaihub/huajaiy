"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiPatchPassword, getMemberToken } from "../lib/memberApi";
import { postUploadFormData } from "../lib/uploadClient";
import { heartTotalsFromPublicUser } from "../lib/memberHeartTotals";
import { useMemberAuth } from "./MemberAuthProvider";
import {
  COUNTRY_NON_TH,
  COUNTRY_TH,
  validateNamesForCountry,
  validatePhoneClient
} from "../lib/registerValidation";
import {
  BrandFacebookGlyph,
  BrandLineWordmark,
  BrandTiktokGlyph,
  SOCIAL_BRAND_ICON_WRAP_CLASS
} from "./MemberSocialBrandMarks";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";
const DEFAULT_AVATAR = "/tailadmin-template/images/default-member-avatar-heart.svg";
/** ประวัติหัวใจชมพู — เชลล์สมาชิก /member/pink-history (TailAdmin /pink-history) */
const HEART_HISTORY_PINK = "/member/pink-history";
const HEART_HISTORY_RED_WALLET = "/account/heart-history/purchases";
const HEART_HISTORY_GIVEAWAY = "/account/heart-history/giveaway";

function formatBirthDate(v) {
  if (!v) return "ยังไม่ได้กรอก";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "ยังไม่ได้กรอก";
    return d.toLocaleDateString("th-TH", { dateStyle: "long" });
  } catch {
    return "ยังไม่ได้กรอก";
  }
}

function shippingRows(parts) {
  if (!parts || typeof parts !== "object") return [];
  return [
    ["บ้านเลขที่", parts.houseNo],
    ["หมู่", parts.moo],
    ["ถนน", parts.road],
    ["ตำบล", parts.subdistrict],
    ["อำเภอ", parts.district],
    ["จังหวัด", parts.province],
    ["รหัสไปรษณีย์", parts.postalCode]
  ];
}

function normalizeSocialUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

async function uploadImage(file) {
  const body = new FormData();
  body.append("image", file);
  const data = await postUploadFormData(body);
  return data.publicUrl;
}

/**
 * หน้าแรกหลังเข้า `/member` — การ์ดหัวใจ + หัวโปรไฟล์ (ชื่อ–นามสกุลจริง) + แก้ไขข้อมูล
 */
export default function MemberHomeProfileLanding({ user }) {
  const { patchProfile } = useMemberAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState({
    open: false,
    variant: "error",
    message: ""
  });
  const [msg, setMsg] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [editAddressOpen, setEditAddressOpen] = useState(false);

  const [profileDraft, setProfileDraft] = useState({
    username: "",
    socialLineUrl: "",
    socialFacebookUrl: "",
    socialTiktokUrl: ""
  });
  const [personalDraft, setPersonalDraft] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    phone: "",
    email: ""
  });
  const [addressDraft, setAddressDraft] = useState({
    houseNo: "",
    moo: "",
    road: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: ""
  });
  const [passwordDraft, setPasswordDraft] = useState({
    newPassword: "",
    newPasswordConfirm: ""
  });
  const publicBio = String(user?.publicPageBio || "").trim();

  const avatarUrl =
    String(user?.profilePictureUrl || "").trim() ||
    String(user?.linePictureUrl || "").trim() ||
    DEFAULT_AVATAR;

  const username = String(user?.username || "").trim();

  const hearts = heartTotalsFromPublicUser(user);
  const pinkShown = hearts.pink;
  const redFromUsersShown = hearts.redFromUsers;
  const giveawayRedShown = hearts.giveawayRed;
  const shareGiveawayEscrow = Math.max(
    0,
    Math.floor(Number(user?.shareRewardGiveawayEscrow) || 0)
  );
  const shareWalletEscrow = Math.max(
    0,
    Math.floor(Number(user?.shareRewardWalletEscrow) || 0)
  );
  const shipping = shippingRows(user?.shippingAddressParts);
  const hasShipping = shipping.some(([, v]) => String(v || "").trim() !== "");
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "สมาชิก";
  const socialLine = normalizeSocialUrl(user?.socialLineUrl);
  const socialFacebook = normalizeSocialUrl(user?.socialFacebookUrl);
  const socialTiktok = normalizeSocialUrl(user?.socialTiktokUrl);

  useEffect(() => {
    setProfileDraft({
      username: String(user?.username || ""),
      socialLineUrl: String(user?.socialLineUrl || ""),
      socialFacebookUrl: String(user?.socialFacebookUrl || ""),
      socialTiktokUrl: String(user?.socialTiktokUrl || "")
    });
    setPersonalDraft({
      firstName: String(user?.firstName || ""),
      lastName: String(user?.lastName || ""),
      gender: String(user?.gender || ""),
      birthDate: String(user?.birthDate || ""),
      phone: String(user?.phone || ""),
      email: String(user?.email || "")
    });
    const sp = user?.shippingAddressParts || {};
    setAddressDraft({
      houseNo: String(sp.houseNo || ""),
      moo: String(sp.moo || ""),
      road: String(sp.road || ""),
      subdistrict: String(sp.subdistrict || ""),
      district: String(sp.district || ""),
      province: String(sp.province || ""),
      postalCode: String(sp.postalCode || "")
    });
  }, [user]);

  function showSaveFeedback(variant, message) {
    const m = String(message || "").trim();
    setSaveFeedback({
      open: true,
      variant: variant === "success" ? "success" : "error",
      message:
        m ||
        (variant === "success"
          ? "ดำเนินการสำเร็จ"
          : "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง")
    });
  }

  function closeSaveFeedback() {
    setSaveFeedback((s) => ({ ...s, open: false }));
  }

  async function saveProfileSection() {
    try {
      closeSaveFeedback();
      setMsg("");
      setSavingProfile(true);
      await patchProfile({
        username: profileDraft.username.trim().toLowerCase(),
        socialLineUrl: profileDraft.socialLineUrl.trim() || null,
        socialFacebookUrl: profileDraft.socialFacebookUrl.trim() || null,
        socialTiktokUrl: profileDraft.socialTiktokUrl.trim() || null
      });
      setMsg("บันทึกข้อมูลโปรไฟล์แล้ว");
      showSaveFeedback(
        "success",
        "บันทึกโปรไฟล์สำเร็จแล้ว (ยูสเซอร์และลิงก์โซเชียลถูกอัปเดตบนระบบแล้ว)"
      );
    } catch (e) {
      showSaveFeedback(
        "error",
        e?.message || "บันทึกโปรไฟล์ไม่สำเร็จ — ตรวจสอบยูสเซอร์และลิงก์ว่าถูกต้อง หรือลองใหม่ภายหลัง"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePersonalSection() {
    closeSaveFeedback();
    setMsg("");
    const rawCc = String(user?.countryCode || "TH").toUpperCase();
    const countryForNames =
      rawCc === COUNTRY_NON_TH ? COUNTRY_NON_TH : COUNTRY_TH;
    const names = validateNamesForCountry(
      countryForNames,
      personalDraft.firstName,
      personalDraft.lastName
    );
    if (!names.ok) {
      showSaveFeedback("error", names.error);
      return;
    }
    const phoneTrim = personalDraft.phone.trim();
    if (phoneTrim) {
      const pv = validatePhoneClient(phoneTrim);
      if (!pv.ok) {
        showSaveFeedback("error", pv.error);
        return;
      }
    }
    try {
      setSavingPersonal(true);
      await patchProfile({
        firstName: personalDraft.firstName.trim(),
        lastName: personalDraft.lastName.trim(),
        gender: personalDraft.gender.trim() || null,
        birthDate: personalDraft.birthDate.trim() || null,
        phone: personalDraft.phone.trim(),
        email: personalDraft.email.trim() || null
      });
      setMsg("บันทึกข้อมูลส่วนตัวแล้ว");
    } catch (e) {
      showSaveFeedback("error", e?.message || "บันทึกข้อมูลส่วนตัวไม่สำเร็จ");
    } finally {
      setSavingPersonal(false);
    }
  }

  async function saveAddressSection() {
    try {
      closeSaveFeedback();
      setMsg("");
      setSavingAddress(true);
      await patchProfile({
        shippingAddressParts: {
          houseNo: addressDraft.houseNo.trim(),
          moo: addressDraft.moo.trim(),
          road: addressDraft.road.trim(),
          subdistrict: addressDraft.subdistrict.trim(),
          district: addressDraft.district.trim(),
          province: addressDraft.province.trim(),
          postalCode: addressDraft.postalCode.trim()
        }
      });
      setMsg("บันทึกที่อยู่แล้ว");
    } catch (e) {
      showSaveFeedback("error", e?.message || "บันทึกที่อยู่ไม่สำเร็จ");
    } finally {
      setSavingAddress(false);
    }
  }

  async function saveSetPassword() {
    try {
      closeSaveFeedback();
      setMsg("");
      setSavingPassword(true);
      const token = getMemberToken();
      if (!token) throw new Error("ไม่ได้เข้าสู่ระบบ");
      const np = passwordDraft.newPassword.trim();
      const nc = passwordDraft.newPasswordConfirm.trim();
      if (!np) throw new Error("กรุณากรอกรหัสผ่านใหม่");
      if (np !== nc) throw new Error("รหัสผ่านยืนยันไม่ตรงกัน");
      await apiPatchPassword(token, { newPassword: np, newPasswordConfirm: nc });
      setPasswordDraft({ newPassword: "", newPasswordConfirm: "" });
      setMsg("บันทึกรหัสผ่านแล้ว");
    } catch (e) {
      showSaveFeedback("error", e?.message || "บันทึกรหัสผ่านไม่สำเร็จ");
    } finally {
      setSavingPassword(false);
    }
  }

  async function onUploadAvatar(file) {
    if (!file) return;
    try {
      closeSaveFeedback();
      setMsg("");
      setUploadingImage(true);
      const url = await uploadImage(file);
      await patchProfile({ profilePictureUrl: url });
      setMsg("อัปโหลดรูปโปรไฟล์แล้ว");
    } catch (e) {
      showSaveFeedback("error", e?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="border-b border-pink-100 bg-transparent">
      {/* การ์ดหัวใจ — แถวบนสุด (เหมือนแม่แบบ) */}
      <div className="grid w-full gap-3 pb-4 pt-4 sm:grid-cols-3 sm:gap-4 sm:pb-5 sm:pt-5">
        <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white px-4 py-4 shadow-sm">
          <div className="flex gap-3">
            <span
              className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl bg-pink-100"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HEART_PINK_SRC} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            </span>
            <div className="min-w-0 flex-1 text-pink-600">
              <p className="text-2xl font-bold tabular-nums text-pink-700">
                {pinkShown.toLocaleString("th-TH")}
              </p>
              <div className="mt-0.5 flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug">หัวใจชมพู</p>
                <Link
                  href={HEART_HISTORY_PINK}
                  title="เปิดประวัติหัวใจชมพู — /member/pink-history"
                  aria-label="ประวัติหัวใจชมพู"
                  className="shrink-0 pt-0.5 text-sm font-semibold text-pink-600 underline-offset-2 hover:text-pink-700 hover:underline"
                >
                  ประวัติ
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white px-4 py-4 shadow-sm">
          <div className="flex gap-3">
            <span
              className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl bg-pink-100"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HEART_RED_SRC} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
            </span>
            <div className="min-w-0 flex-1 text-red-600">
              <p className="text-2xl font-bold tabular-nums text-red-700">
                {redFromUsersShown.toLocaleString("th-TH")}
              </p>
              <div className="mt-0.5 flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug">หัวใจแดง</p>
                <Link
                  href={HEART_HISTORY_RED_WALLET}
                  title="เปิดประวัติหัวใจแดง (กระเป๋าและห้อง)"
                  aria-label="ประวัติหัวใจแดง กระเป๋าและห้อง"
                  className="shrink-0 pt-0.5 text-sm font-semibold text-red-600 underline-offset-2 hover:text-red-700 hover:underline"
                >
                  ประวัติ
                </Link>
              </div>
              {shareWalletEscrow > 0 ? (
                <p className="mt-1.5 text-[11px] font-medium leading-snug text-red-800/90">
                  กันไว้แชร์โพสต์ (จากกระเป๋าแดง — หักจากยอดด้านบนแล้ว):{" "}
                  {shareWalletEscrow.toLocaleString("th-TH")} ดวง
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white px-4 py-4 shadow-sm">
          <div className="flex gap-3">
            <span
              className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl bg-pink-100"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HEART_RED_SRC}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-contain ring-2 ring-red-200"
              />
            </span>
            <div className="min-w-0 flex-1 text-red-600">
              <p className="text-2xl font-bold tabular-nums text-red-700">
                {giveawayRedShown.toLocaleString("th-TH")}
              </p>
              <div className="mt-0.5 flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug">หัวใจแดงสำหรับแจก</p>
                <Link
                  href={HEART_HISTORY_GIVEAWAY}
                  title="เปิดประวัติหัวใจแดงสำหรับแจก"
                  aria-label="ประวัติหัวใจแดงสำหรับแจก"
                  className="shrink-0 pt-0.5 text-sm font-semibold text-red-600 underline-offset-2 hover:text-red-700 hover:underline"
                >
                  ประวัติ
                </Link>
              </div>
              {shareGiveawayEscrow > 0 ? (
                <p className="mt-1.5 text-[11px] font-medium leading-snug text-red-800/90">
                  กันไว้แชร์โพสต์ (จากแดงแจก — หักจากยอดด้านบนแล้ว):{" "}
                  {shareGiveawayEscrow.toLocaleString("th-TH")} ดวง
                </p>
              ) : null}
              {shareWalletEscrow > 0 ? (
                <p className="mt-1 text-[11px] text-slate-600">
                  แคมเปญแชร์โพสต์กันจากกระเป๋าแดงอีก{" "}
                  {shareWalletEscrow.toLocaleString("th-TH")} ดวง — ดูการ์ด「หัวใจแดง」
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* หัวโปรไฟล์ — ใช้ชื่อ–นามสกุลจริง (ไม่ใช้ชื่อสมาชิกแยก) · ไม่มีแบนเนอร์ */}
      <div className="relative w-full pb-8 pt-0">
        <div className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm shadow-pink-100/30">
            <div className="relative bg-white px-4 pb-6 pt-5 sm:px-6 sm:pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-pink-100 bg-neutral-100 shadow-md sm:h-28 sm:w-28 md:h-32 md:w-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 pb-0.5">
                  <h1 className="truncate text-xl font-bold text-neutral-900 sm:text-2xl">
                    {fullName}
                  </h1>
                  {username ? (
                    <p className="mt-0.5 text-sm text-neutral-500">@{username}</p>
                  ) : null}
                  {publicBio ? (
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                      {publicBio}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {socialLine ? (
                      <a
                        href={socialLine}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={SOCIAL_BRAND_ICON_WRAP_CLASS}
                        aria-label="LINE"
                        title="LINE"
                      >
                        <BrandLineWordmark />
                      </a>
                    ) : null}
                    {socialFacebook ? (
                      <a
                        href={socialFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={SOCIAL_BRAND_ICON_WRAP_CLASS}
                        aria-label="Facebook"
                        title="Facebook"
                      >
                        <BrandFacebookGlyph />
                      </a>
                    ) : null}
                    {socialTiktok ? (
                      <a
                        href={socialTiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={SOCIAL_BRAND_ICON_WRAP_CLASS}
                        aria-label="TikTok"
                        title="TikTok"
                      >
                        <BrandTiktokGlyph />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditProfileOpen((v) => !v)}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-[#FF2E8C] shadow-sm transition hover:border-pink-300 hover:bg-pink-50 sm:self-auto"
                disabled={savingProfile || uploadingImage}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                แก้ไขโปรไฟล์
              </button>
            </div>
            {editProfileOpen ? (
              <div className="mt-4 grid gap-3 border-t border-pink-100 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-neutral-500">ยูสเซอร์</label>
                  <input className="mt-1 w-full rounded-lg border border-pink-100 px-3 py-2" value={profileDraft.username} onChange={(e) => setProfileDraft((s) => ({ ...s, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-500">กำหนดรหัสผ่าน</label>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    เข้าสมัครผ่าน LINE ไม่มีรหัสเดิม — ใส่รหัสใหม่กับยืนยันได้เลย ครั้งต่อไปเปลี่ยนรหัสก็ใช้ช่องนี้
                  </p>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-lg border border-pink-100 px-3 py-2"
                    placeholder="รหัสผ่านใหม่"
                    value={passwordDraft.newPassword}
                    onChange={(e) => setPasswordDraft((s) => ({ ...s, newPassword: e.target.value }))}
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-lg border border-pink-100 px-3 py-2"
                    placeholder="ยืนยันรหัสผ่าน"
                    value={passwordDraft.newPasswordConfirm}
                    onChange={(e) => setPasswordDraft((s) => ({ ...s, newPasswordConfirm: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={saveSetPassword}
                    className="mt-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-semibold text-[#FF2E8C] transition hover:bg-pink-100 disabled:opacity-60"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "กำลังบันทึก…" : "บันทึกรหัสผ่าน"}
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">ลิงก์ LINE</label>
                  <input className="mt-1 w-full rounded-lg border border-pink-100 px-3 py-2" value={profileDraft.socialLineUrl} onChange={(e) => setProfileDraft((s) => ({ ...s, socialLineUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">ลิงก์ Facebook</label>
                  <input className="mt-1 w-full rounded-lg border border-pink-100 px-3 py-2" value={profileDraft.socialFacebookUrl} onChange={(e) => setProfileDraft((s) => ({ ...s, socialFacebookUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">ลิงก์ TikTok</label>
                  <input className="mt-1 w-full rounded-lg border border-pink-100 px-3 py-2" value={profileDraft.socialTiktokUrl} onChange={(e) => setProfileDraft((s) => ({ ...s, socialTiktokUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">รูปโปรไฟล์</label>
                  <input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(e) => void onUploadAvatar(e.target.files?.[0])} />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={saveProfileSection}
                    className="rounded-full bg-[#FF2E8C] px-4 py-2 text-white disabled:opacity-60"
                    disabled={savingProfile || uploadingImage || savingPassword}
                  >
                    {savingProfile || uploadingImage ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="w-full pb-6">
        <div className="mt-3 space-y-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm shadow-pink-100/30 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-neutral-900">ข้อมูลส่วนตัว</h2>
            <button
              type="button"
              onClick={() => setEditPersonalOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-[#FF2E8C] transition hover:bg-pink-50"
              disabled={savingPersonal}
            >
              แก้ไข
            </button>
          </div>
          <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-500">ชื่อ–นามสกุล</p>
              <p className="font-semibold text-neutral-900">{fullName}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">เพศ</p>
              <p className="font-semibold text-neutral-900">{user?.gender || "ยังไม่ได้กรอก"}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">วันเกิด</p>
              <p className="font-semibold text-neutral-900">{formatBirthDate(user?.birthDate)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">โทรศัพท์</p>
              <p className="font-semibold text-neutral-900">{user?.phone || "ยังไม่ได้กรอก"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-neutral-500">อีเมล</p>
              <p className="font-semibold text-neutral-900">{user?.email || "ยังไม่ได้กรอก"}</p>
            </div>
          </div>
          {editPersonalOpen ? (
            <div className="grid gap-3 border-t border-pink-100 pt-4 text-sm sm:grid-cols-2">
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="ชื่อ" value={personalDraft.firstName} onChange={(e) => setPersonalDraft((s) => ({ ...s, firstName: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="นามสกุล" value={personalDraft.lastName} onChange={(e) => setPersonalDraft((s) => ({ ...s, lastName: e.target.value }))} />
              <select className="rounded-lg border border-pink-100 px-3 py-2" value={personalDraft.gender} onChange={(e) => setPersonalDraft((s) => ({ ...s, gender: e.target.value }))}>
                <option value="">ไม่ระบุเพศ</option><option value="male">ชาย</option><option value="female">หญิง</option><option value="other">อื่นๆ</option>
              </select>
              <input type="date" className="rounded-lg border border-pink-100 px-3 py-2" value={personalDraft.birthDate} onChange={(e) => setPersonalDraft((s) => ({ ...s, birthDate: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="โทรศัพท์" value={personalDraft.phone} onChange={(e) => setPersonalDraft((s) => ({ ...s, phone: e.target.value }))} />
              <input type="email" className="rounded-lg border border-pink-100 px-3 py-2" placeholder="อีเมล" value={personalDraft.email} onChange={(e) => setPersonalDraft((s) => ({ ...s, email: e.target.value }))} />
              <div className="sm:col-span-2">
                <button type="button" onClick={savePersonalSection} className="rounded-full bg-[#FF2E8C] px-4 py-2 text-white disabled:opacity-60" disabled={savingPersonal}>
                  {savingPersonal ? "กำลังบันทึก…" : "บันทึกข้อมูลส่วนตัว"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 space-y-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm shadow-pink-100/30 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-neutral-900">ที่อยู่</h2>
            <button
              type="button"
              onClick={() => setEditAddressOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-[#FF2E8C] transition hover:bg-pink-50"
              disabled={savingAddress}
            >
              แก้ไข
            </button>
          </div>
          {hasShipping ? (
            <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {shipping.map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-neutral-500">{label}</p>
                  <p className="font-semibold text-neutral-900">{String(value || "—")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">ยังไม่ได้กรอกที่อยู่</p>
          )}
          {editAddressOpen ? (
            <div className="grid gap-3 border-t border-pink-100 pt-4 text-sm sm:grid-cols-2">
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="บ้านเลขที่" value={addressDraft.houseNo} onChange={(e) => setAddressDraft((s) => ({ ...s, houseNo: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="หมู่" value={addressDraft.moo} onChange={(e) => setAddressDraft((s) => ({ ...s, moo: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2 sm:col-span-2" placeholder="ถนน" value={addressDraft.road} onChange={(e) => setAddressDraft((s) => ({ ...s, road: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="ตำบล/แขวง" value={addressDraft.subdistrict} onChange={(e) => setAddressDraft((s) => ({ ...s, subdistrict: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="อำเภอ/เขต" value={addressDraft.district} onChange={(e) => setAddressDraft((s) => ({ ...s, district: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="จังหวัด" value={addressDraft.province} onChange={(e) => setAddressDraft((s) => ({ ...s, province: e.target.value }))} />
              <input className="rounded-lg border border-pink-100 px-3 py-2" placeholder="รหัสไปรษณีย์" value={addressDraft.postalCode} onChange={(e) => setAddressDraft((s) => ({ ...s, postalCode: e.target.value.replace(/\D/g, "") }))} />
              <div className="sm:col-span-2">
                <button type="button" onClick={saveAddressSection} className="rounded-full bg-[#FF2E8C] px-4 py-2 text-white disabled:opacity-60" disabled={savingAddress}>
                  {savingAddress ? "กำลังบันทึก…" : "บันทึกที่อยู่"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {msg ? <p className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-700">{msg}</p> : null}
      </div>

      {saveFeedback.open ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeSaveFeedback}
        >
          <div
            className={`max-w-md rounded-2xl border bg-white p-6 shadow-xl ${
              saveFeedback.variant === "success"
                ? "border-emerald-200"
                : "border-rose-200"
            }`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="member-save-feedback-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="member-save-feedback-title"
              className={`text-lg font-bold ${
                saveFeedback.variant === "success" ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {saveFeedback.variant === "success"
                ? "บันทึกสำเร็จ"
                : "บันทึกไม่สำเร็จ"}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
              {saveFeedback.message}
            </p>
            <button
              type="button"
              className={`mt-6 w-full rounded-full py-2.5 text-sm font-semibold text-white ${
                saveFeedback.variant === "success"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#FF2E8C] hover:bg-rose-600"
              }`}
              onClick={closeSaveFeedback}
            >
              ตกลง
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
