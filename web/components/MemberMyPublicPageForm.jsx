"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  COUNTRY_NON_TH,
  COUNTRY_TH,
  validateRegisterNames
} from "../../authValidators";
import { getApiBase } from "../lib/config";
import { useMemberAuth } from "./MemberAuthProvider";

const USER_RE = /^[a-z0-9_]{3,32}$/;

async function uploadImageFile(file) {
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.publicUrl) {
    throw new Error(data.error || "อัปโหลดรูปไม่สำเร็จ");
  }
  return String(data.publicUrl).trim();
}

/**
 * แก้ไขเพจสาธารณะ /u/[username] — ปก รูปโปรไฟล์ คำแนะนำ ลิงก์โซเชียล แสดงในหน้าแรก/ชุมชน
 */
export default function MemberMyPublicPageForm() {
  const { user, loading, patchProfile } = useMemberAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const unRaw =
    user?.username != null ? String(user.username).trim().toLowerCase() : "";
  const usernameOk = USER_RE.test(unRaw);
  const previewHref = usernameOk ? `/u/${encodeURIComponent(unRaw)}` : null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [listed, setListed] = useState(true);
  const [fb, setFb] = useState("");
  const [line, setLine] = useState("");
  const [tt, setTt] = useState("");

  const syncFromUser = useCallback(() => {
    if (!user) return;
    setFirstName(user.firstName != null ? String(user.firstName).trim() : "");
    setLastName(user.lastName != null ? String(user.lastName).trim() : "");
    setBio(
      user.publicPageBio != null && String(user.publicPageBio).trim()
        ? String(user.publicPageBio).trim()
        : ""
    );
    setListed(user.publicPageListed !== false);
    setFb(user.socialFacebookUrl ? String(user.socialFacebookUrl).trim() : "");
    setLine(user.socialLineUrl ? String(user.socialLineUrl).trim() : "");
    setTt(user.socialTiktokUrl ? String(user.socialTiktokUrl).trim() : "");
  }, [user]);

  useEffect(() => {
    syncFromUser();
  }, [syncFromUser]);

  const save = useCallback(async () => {
    setMessage("");
    setError("");
    const cc =
      user?.countryCode === COUNTRY_NON_TH ? COUNTRY_NON_TH : COUNTRY_TH;
    const names = validateRegisterNames(cc, firstName, lastName);
    if (!names.ok) {
      setError(names.error);
      return;
    }
    setSaving(true);
    try {
      await patchProfile({
        firstName: names.firstName,
        lastName: names.lastName,
        publicPageBio: bio.trim() === "" ? null : bio.trim(),
        publicPageListed: listed,
        socialFacebookUrl: fb.trim() === "" ? null : fb.trim(),
        socialLineUrl: line.trim() === "" ? null : line.trim(),
        socialTiktokUrl: tt.trim() === "" ? null : tt.trim()
      });
      setMessage("บันทึกแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [
    user,
    patchProfile,
    firstName,
    lastName,
    bio,
    listed,
    fb,
    line,
    tt
  ]);

  const onPickCover = useCallback(
    async (e) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f || !f.type.startsWith("image/")) return;
      setMessage("");
      setError("");
      setSaving(true);
      try {
        const url = await uploadImageFile(f);
        await patchProfile({ publicPageCoverUrl: url });
        setMessage("อัปโหลดรูปปกแล้ว");
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
      } finally {
        setSaving(false);
      }
    },
    [patchProfile]
  );

  const onPickAvatar = useCallback(
    async (e) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f || !f.type.startsWith("image/")) return;
      setMessage("");
      setError("");
      setSaving(true);
      try {
        const url = await uploadImageFile(f);
        await patchProfile({ profilePictureUrl: url });
        setMessage("อัปโหลดรูปโปรไฟล์แล้ว");
      } catch (err) {
        setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
      } finally {
        setSaving(false);
      }
    },
    [patchProfile]
  );

  const clearCover = useCallback(async () => {
    setMessage("");
    setError("");
    setSaving(true);
    try {
      await patchProfile({ publicPageCoverUrl: null });
      setMessage("ลบรูปปกแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }, [patchProfile]);

  if (loading) {
    return (
      <p className="text-sm text-gray-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ปรับแต่งเพจของฉัน</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          รูปปก รูปโปรไฟล์ คำแนะนำ และลิงก์จะแสดงบนเพจสาธารณะของคุณ
          {listed ? " และอาจปรากฏในหน้าแรกกับเพจชุมชน" : ""}
        </p>
      </div>

      {!usernameOk ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          ตั้งชื่อผู้ใช้ (a–z ตัวเลข _ ความยาว 3–32) ในโปรไฟล์ก่อน จึงจะมีลิงก์เพจสาธารณะ
        </div>
      ) : null}

      {previewHref ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={previewHref}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            ดูเพจสาธารณะ
          </Link>
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">ชื่อที่แสดงบนเพจ</h2>
        <p className="mt-1 text-sm text-gray-600">
          {user.countryCode === COUNTRY_NON_TH
            ? "ชื่อ–นามสกุลภาษาอังกฤษ (ตามที่ตั้งไว้ในบัญชี)"
            : "ชื่อ–นามสกุลภาษาไทยให้ตรงตามบัตรประชาชน"}
        </p>
        {typeof user.selfServiceNameEditsRemaining === "number" ? (
          <p className="mt-1 text-xs text-gray-500">
            แก้ชื่อ–นามสกุลเองได้อีก {user.selfServiceNameEditsRemaining} ครั้ง
            — ถ้าหมดโควต้าให้ขอผ่านแอดมินที่โปรไฟล์เต็ม
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">ชื่อ</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">นามสกุล</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="mt-3 text-sm">
          <Link
            href="/member/profile"
            className="font-medium text-rose-600 hover:text-rose-700"
          >
            เปลี่ยนประเทศ / โปรไฟล์ฉบับเต็ม
          </Link>
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">รูปภาพ</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <label className="inline-flex cursor-pointer flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">รูปปกเพจ</span>
            <span className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
              {saving ? "กำลังอัปโหลด…" : "อัปโหลดรูปปก"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onPickCover}
              disabled={saving}
            />
          </label>
          <button
            type="button"
            onClick={clearCover}
            disabled={saving || !user.publicPageCoverUrl}
            className="self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ใช้พื้นหลังเริ่มต้น
          </button>
          <label className="inline-flex cursor-pointer flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">รูปโปรไฟล์</span>
            <span className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
              {saving ? "กำลังอัปโหลด…" : "อัปโหลดรูปโปรไฟล์"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onPickAvatar}
              disabled={saving}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">คำแนะนำบนเพจ</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="แนะนำตัว ลิงก์ หรือข้อความต้อนรับ (ไม่เกิน 2,000 ตัวอักษร)"
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
        />
        <p className="mt-1 text-xs text-gray-500">{bio.length}/2000</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">ลิงก์โซเชียล</h2>
        <p className="mt-1 text-sm text-gray-500">ใส่ URL ที่ขึ้นต้นด้วย https:// เท่านั้น</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Facebook</label>
            <input
              type="url"
              value={fb}
              onChange={(e) => setFb(e.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">LINE</label>
            <input
              type="url"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">TikTok</label>
            <input
              type="url"
              value={tt}
              onChange={(e) => setTt(e.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={listed}
            onChange={(e) => setListed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-900">
              แสดงเพจของฉันในหน้าแรกและเพจชุมชน
            </span>
            <span className="mt-0.5 block text-sm text-gray-600">
              ปิดตัวเลือกนี้หากไม่ต้องการให้เพจไปโผล่ในรายการแนะนำ (ลิงก์ /u/… ยังใช้ได้ตามปกติ)
            </span>
          </span>
        </label>
      </section>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก…" : "บันทึกทั้งหมด"}
        </button>
      </div>
    </div>
  );
}
