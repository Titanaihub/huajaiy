"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  apiGetMyNameChangeRequests,
  apiGetMyPhoneHistory,
  apiPatchPassword,
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
  const [shippingParts, setShippingParts] = useState({
    houseNo: "",
    moo: "",
    road: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: ""
  });
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [reqFirst, setReqFirst] = useState("");
  const [reqLast, setReqLast] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqMsg, setReqMsg] = useState("");
  const [reqErr, setReqErr] = useState("");
  const [requests, setRequests] = useState([]);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/profile");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setGender(user.gender || "");
    setBirthDate(user.birthDate || "");
    setPhone(String(user.phone || "").replace(/\s+/g, ""));
    const p = user.shippingAddressParts || {};
    setShippingParts({
      houseNo: p.houseNo || "",
      moo: p.moo || "",
      road: p.road || "",
      subdistrict: p.subdistrict || "",
      district: p.district || "",
      province: p.province || "",
      postalCode: p.postalCode || ""
    });
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = getMemberToken();
        if (!token) return;
        const data = await apiGetMyPhoneHistory(token);
        if (!cancelled) setPhoneHistory(data.history || []);
      } catch {
        if (!cancelled) setPhoneHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileErr("");
    setProfileMsg("");
    try {
      const payload = {
        gender: gender === "" ? null : gender,
        birthDate: birthDate === "" ? null : birthDate,
        shippingAddressParts: {
          houseNo: shippingParts.houseNo,
          moo: shippingParts.moo,
          road: shippingParts.road,
          subdistrict: shippingParts.subdistrict,
          district: shippingParts.district,
          province: shippingParts.province,
          postalCode: shippingParts.postalCode
        }
      };
      const nextPhone = String(phone || "").replace(/\s+/g, "").trim();
      const currentPhone = String(user.phone || "").replace(/\s+/g, "").trim();
      if (nextPhone !== currentPhone) {
        payload.phone = nextPhone;
      }
      await patchProfile(payload);
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

  async function submitPasswordChange(e) {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");
    try {
      const token = getMemberToken();
      if (!token) throw new Error("ไม่ได้เข้าสู่ระบบ");
      await apiPatchPassword(token, {
        currentPassword: currentPw,
        newPassword: newPw,
        newPasswordConfirm: confirmPw
      });
      setPwMsg("เปลี่ยนรหัสผ่านแล้ว — กรุณาใช้รหัสใหม่เมื่อเข้าสู่ระบบครั้งถัดไป");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwErr(err.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
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
                <dt className="text-slate-500">ชื่อผู้ใช้ (ล็อกอิน)</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {user.username}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ชื่อ–นามสกุล (ในระบบ)</dt>
                <dd className="font-medium text-slate-900">
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">เบอร์โทร (ปัจจุบัน)</dt>
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
              <label
                htmlFor="profilePhone"
                className="block text-sm font-medium text-slate-700"
              >
                เบอร์โทร
              </label>
              <input
                id="profilePhone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(String(e.target.value).replace(/\s+/g, ""))
                }
                placeholder="0812345678"
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                เปลี่ยนเบอร์ได้ที่นี่ — ระบบจะเก็บประวัติเบอร์เก่าไว้ด้านล่าง
              </p>
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
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-700">
                ที่อยู่จัดส่งสินค้า
              </legend>
              <p className="text-xs text-slate-500">
                กรอกภายหลังได้ — แยกช่องตามที่อยู่จริงเพื่อจัดส่งถูกต้อง
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label
                    htmlFor="shipHouseNo"
                    className="block text-xs font-medium text-slate-600"
                  >
                    บ้านเลขที่
                  </label>
                  <input
                    id="shipHouseNo"
                    value={shippingParts.houseNo}
                    onChange={(e) =>
                      setShippingParts((s) => ({
                        ...s,
                        houseNo: e.target.value
                      }))
                    }
                    autoComplete="street-address"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="shipMoo"
                    className="block text-xs font-medium text-slate-600"
                  >
                    หมู่
                  </label>
                  <input
                    id="shipMoo"
                    value={shippingParts.moo}
                    onChange={(e) =>
                      setShippingParts((s) => ({ ...s, moo: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="shipRoad"
                    className="block text-xs font-medium text-slate-600"
                  >
                    ถนน
                  </label>
                  <input
                    id="shipRoad"
                    value={shippingParts.road}
                    onChange={(e) =>
                      setShippingParts((s) => ({ ...s, road: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="shipSubdistrict"
                    className="block text-xs font-medium text-slate-600"
                  >
                    ตำบล / แขวง
                  </label>
                  <input
                    id="shipSubdistrict"
                    value={shippingParts.subdistrict}
                    onChange={(e) =>
                      setShippingParts((s) => ({
                        ...s,
                        subdistrict: e.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="shipDistrict"
                    className="block text-xs font-medium text-slate-600"
                  >
                    อำเภอ / เขต
                  </label>
                  <input
                    id="shipDistrict"
                    value={shippingParts.district}
                    onChange={(e) =>
                      setShippingParts((s) => ({
                        ...s,
                        district: e.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="shipProvince"
                    className="block text-xs font-medium text-slate-600"
                  >
                    จังหวัด
                  </label>
                  <input
                    id="shipProvince"
                    value={shippingParts.province}
                    onChange={(e) =>
                      setShippingParts((s) => ({
                        ...s,
                        province: e.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="shipPostal"
                    className="block text-xs font-medium text-slate-600"
                  >
                    รหัสไปรษณีย์
                  </label>
                  <input
                    id="shipPostal"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={shippingParts.postalCode}
                    onChange={(e) =>
                      setShippingParts((s) => ({
                        ...s,
                        postalCode: e.target.value.replace(/\D/g, "").slice(0, 10)
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </fieldset>
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

          <form
            onSubmit={submitPasswordChange}
            className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm"
          >
            <h4 className="text-sm font-semibold text-slate-900">
              เปลี่ยนรหัสผ่าน
            </h4>
            <p className="text-xs text-slate-500">
              กรอกรหัสเดิมและรหัสใหม่ (อย่างน้อย 6 ตัวอักษร)
            </p>
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-slate-700"
              >
                รหัสผ่านปัจจุบัน
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-slate-700"
              >
                รหัสผ่านใหม่
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700"
              >
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {pwErr ? <p className="text-sm text-red-600">{pwErr}</p> : null}
            {pwMsg ? <p className="text-sm text-green-700">{pwMsg}</p> : null}
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              บันทึกรหัสผ่านใหม่
            </button>
          </form>

          {phoneHistory.length > 0 ? (
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-slate-800">
                ประวัติการเปลี่ยนเบอร์โทร
              </h4>
              <ul className="mt-3 space-y-3 text-sm">
                {phoneHistory.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2"
                  >
                    <p className="font-medium text-slate-800">
                      {h.oldPhone} → {h.newPhone}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(h.changedAt).toLocaleString("th-TH")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
