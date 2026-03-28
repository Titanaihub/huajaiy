"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  apiGetMyNameChangeRequests,
  apiPostNameChangeRequest,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

function statusLabel(s) {
  if (s === "pending") return "รอแอดมินพิจารณา";
  if (s === "approved") return "อนุมัติแล้ว";
  if (s === "rejected") return "ไม่อนุมัติ";
  return s;
}

export default function AccountProfileForm() {
  const router = useRouter();
  const { user, loading, patchProfile } = useMemberAuth();
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [reqFirst, setReqFirst] = useState("");
  const [reqLast, setReqLast] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqMsg, setReqMsg] = useState("");
  const [reqErr, setReqErr] = useState("");
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/profile");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setGender(user.gender || "");
    setBirthDate(user.birthDate || "");
    setShippingAddress(user.shippingAddress || "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = getMemberToken();
        if (!token) return;
        const data = await apiGetMyNameChangeRequests(token);
        if (!cancelled) setRequests(data.requests || []);
      } catch {
        if (!cancelled) setRequests([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reqMsg]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileErr("");
    setProfileMsg("");
    try {
      await patchProfile({
        gender: gender === "" ? null : gender,
        birthDate: birthDate === "" ? null : birthDate,
        shippingAddress:
          shippingAddress.trim() === "" ? null : shippingAddress.trim()
      });
      setProfileMsg("บันทึกข้อมูลแล้ว");
    } catch (err) {
      setProfileErr(err.message || "บันทึกไม่สำเร็จ");
    }
  }

  async function submitNameChange(e) {
    e.preventDefault();
    setReqErr("");
    setReqMsg("");
    try {
      const token = getMemberToken();
      if (!token) throw new Error("ไม่ได้เข้าสู่ระบบ");
      await apiPostNameChangeRequest(token, {
        requestedFirstName: reqFirst,
        requestedLastName: reqLast,
        reason: reqReason
      });
      setReqMsg("ส่งคำขอแล้ว — รอแอดมินดำเนินการ");
      setReqFirst("");
      setReqLast("");
      setReqReason("");
    } catch (err) {
      setReqErr(err.message || "ส่งคำขอไม่สำเร็จ");
    }
  }

  if (loading || !user) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const isThai = (user.countryCode || "TH") === "TH";

  return (
    <div className="space-y-10">
        <section>
          <h3 className="text-base font-semibold text-slate-900">
            ข้อมูลในระบบ
          </h3>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">ชื่อ–นามสกุล (ในระบบ)</dt>
                <dd className="font-medium text-slate-900">
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">เบอร์โทร</dt>
                <dd className="font-medium text-slate-900">{user.phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">ประเทศเอกสารชื่อ</dt>
                <dd className="font-medium text-slate-900">
                  {isThai ? "ไทย" : "ต่างประเทศ (ชื่ออังกฤษ)"}
                </dd>
              </div>
            </dl>
          </div>

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-700">
                เพศ
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">ไม่ระบุ</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-slate-700">
                วันเดือนปีเกิด
              </label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="shippingAddress"
                className="block text-sm font-medium text-slate-700"
              >
                ที่อยู่จัดส่งสินค้า
              </label>
              <textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={4}
                placeholder="กรอกภายหลังได้ — บรรทัดเต็มที่อยู่จัดส่ง"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {profileErr ? (
              <p className="text-sm text-red-600">{profileErr}</p>
            ) : null}
            {profileMsg ? (
              <p className="text-sm text-green-700">{profileMsg}</p>
            ) : null}
            <button
              type="submit"
              className="rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
            >
              บันทึกข้อมูลส่วนตัว
            </button>
          </form>
        </section>

        <section>
          <h3 className="text-base font-semibold text-slate-900">
            ขอเปลี่ยนชื่อ–นามสกุล (ผ่านแอดมิน)
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {isThai
              ? "กรอกชื่อ–นามสกุลใหม่เป็นภาษาไทยให้ถูกต้องตามบัตรประชาชน"
              : "กรอกชื่อ–นามสกุลใหม่เป็นภาษาอังกฤษตามเอกสาร"}
          </p>
          <form onSubmit={submitNameChange} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                ต้องการเปลี่ยนชื่อเป็น
              </label>
              <input
                value={reqFirst}
                onChange={(e) => setReqFirst(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                ต้องการเปลี่ยนนามสกุลเป็น
              </label>
              <input
                value={reqLast}
                onChange={(e) => setReqLast(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                เหตุผลที่ขอเปลี่ยน (อย่างน้อย 10 ตัวอักษร)
              </label>
              <textarea
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                rows={4}
                required
                minLength={10}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {reqErr ? <p className="text-sm text-red-600">{reqErr}</p> : null}
            {reqMsg ? <p className="text-sm text-green-700">{reqMsg}</p> : null}
            <button
              type="submit"
              className="rounded-xl border border-brand-300 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-100"
            >
              ส่งคำขอให้แอดมิน
            </button>
          </form>

          {requests.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-slate-800">
                ประวัติคำขอเปลี่ยนชื่อ
              </h3>
              <ul className="mt-3 space-y-3 text-sm">
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
                  >
                    <p className="font-medium text-slate-800">
                      {statusLabel(r.status)} — ขอเป็น {r.requestedFirstName}{" "}
                      {r.requestedLastName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString("th-TH")}
                    </p>
                    {r.resolverNote ? (
                      <p className="mt-1 text-xs text-slate-600">
                        หมายเหตุ: {r.resolverNote}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <p className="text-sm text-slate-600">
          <Link href="/account" className="text-brand-800 underline">
            ← ภาพรวมบัญชี
          </Link>
        </p>
    </div>
  );
}
