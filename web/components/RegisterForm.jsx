"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiCheckDuplicateName } from "../lib/memberApi";
import {
  COUNTRY_NON_TH,
  COUNTRY_TH,
  firstNameEnglishHint,
  lastNameEnglishHint,
  shouldShowLatinThaiHint,
  shouldShowThaiEnglishHint,
  validateNamesForCountry,
  validateRegisterFormClient
} from "../lib/registerValidation";
import { useMemberAuth } from "./MemberAuthProvider";

const inputBase =
  "mt-1 w-full rounded-xl border px-3 py-2 text-sm transition-colors";
const inputNormal = "border-slate-300";
const inputWarn = "border-amber-500 bg-amber-50/40 ring-1 ring-amber-400/80";

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useMemberAuth();
  const [countryCode, setCountryCode] = useState(COUNTRY_TH);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameDuplicate, setNameDuplicate] = useState(false);
  const [dupCheckPending, setDupCheckPending] = useState(false);
  const [duplicateChoice, setDuplicateChoice] = useState("");
  const prevDupRef = useRef(false);

  const namesParsed = validateNamesForCountry(
    countryCode,
    firstName,
    lastName
  );
  const namesValid = namesParsed.ok === true;

  useEffect(() => {
    const v = validateNamesForCountry(countryCode, firstName, lastName);
    if (!v.ok) {
      setNameDuplicate(false);
      setDupCheckPending(false);
      return;
    }
    setDupCheckPending(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await apiCheckDuplicateName({
          countryCode,
          firstName: v.firstName,
          lastName: v.lastName
        });
        if (!cancelled) {
          setNameDuplicate(Boolean(r.duplicate));
          setDupCheckPending(false);
        }
      } catch {
        if (!cancelled) {
          setNameDuplicate(false);
          setDupCheckPending(false);
        }
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [countryCode, firstName, lastName]);

  useEffect(() => {
    if (nameDuplicate && !prevDupRef.current) {
      setDuplicateChoice("");
    }
    prevDupRef.current = nameDuplicate;
  }, [nameDuplicate]);

  const firstThaiWarn = shouldShowThaiEnglishHint(countryCode, firstName);
  const lastThaiWarn = shouldShowThaiEnglishHint(countryCode, lastName);
  const firstLatinWarn = shouldShowLatinThaiHint(countryCode, firstName);
  const lastLatinWarn = shouldShowLatinThaiHint(countryCode, lastName);

  const duplicateNameAcknowledged =
    nameDuplicate === true && duplicateChoice === "first_time";

  const submitBlocked =
    loading ||
    (namesValid && dupCheckPending) ||
    (nameDuplicate === true && duplicateChoice !== "first_time");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const local = validateRegisterFormClient({
      countryCode,
      firstName,
      lastName,
      phone,
      username,
      password,
      passwordConfirm,
      nameDuplicate: nameDuplicate === true,
      duplicateChoice
    });
    if (!local.ok) {
      setError(local.error);
      return;
    }
    setLoading(true);
    try {
      await register({
        countryCode,
        firstName,
        lastName,
        phone,
        username,
        password,
        passwordConfirm,
        duplicateNameAcknowledged
      });
      router.push("/");
    } catch (err) {
      setError(err.message || "สมัครไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">สมัครสมาชิก</h1>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
        <p className="font-semibold text-slate-800">1 คนต่อ 1 บัญชีเท่านั้น</p>
        <p>
          กรุณากรอกข้อมูลจริงให้ถูกต้อง
          ข้อมูลผิดอาจแก้ไขภายหลังได้ยากและอาจเสียสิทธิ์รับรางวัล
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="countryCode"
            className="block text-sm font-medium text-slate-700"
          >
            ประเทศ / ประเภทเอกสารชื่อ–นามสกุล
          </label>
          <select
            id="countryCode"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={`${inputBase} ${inputNormal} bg-white`}
          >
            <option value={COUNTRY_TH}>
              ประเทศไทย — กรอกชื่อ–นามสกุลภาษาไทย (ตามบัตรประชาชน)
            </option>
            <option value={COUNTRY_NON_TH}>
              ต่างประเทศ — กรอกชื่อ–นามสกุลภาษาอังกฤษ (ตามหนังสือเดินทาง)
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium leading-snug text-slate-700"
          >
            {countryCode === COUNTRY_TH ? (
              <>
                <span className="block">
                  ชื่อ (ภาษาไทย) ไม่ต้องใส่คำนำหน้า เช่น นาย นาง นางสาว
                </span>
                <span className="block">กรุณากรอกให้ตรงตามบัตรประชาชน</span>
              </>
            ) : (
              <span className="block">ชื่อ (ภาษาอังกฤษ)</span>
            )}
          </label>
          <input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={`${inputBase} ${
              firstThaiWarn || firstLatinWarn ? inputWarn : inputNormal
            }`}
            required
            autoComplete="given-name"
            aria-invalid={firstThaiWarn || firstLatinWarn}
          />
          {firstThaiWarn ? (
            <p className="mt-1.5 text-sm font-medium text-amber-900">
              {firstNameEnglishHint}
            </p>
          ) : null}
          {firstLatinWarn ? (
            <p className="mt-1.5 text-sm font-medium text-amber-900">
              หากถือเอกสารไทยให้เลือก &quot;ประเทศไทย&quot; แล้วกรอกชื่อเป็นภาษาไทย
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium leading-snug text-slate-700"
          >
            {countryCode === COUNTRY_TH
              ? "นามสกุล (ภาษาไทย) กรุณากรอกให้ตรงตามบัตรประชาชน"
              : "นามสกุล (ภาษาอังกฤษ)"}
          </label>
          <input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={`${inputBase} ${
              lastThaiWarn || lastLatinWarn ? inputWarn : inputNormal
            }`}
            required
            autoComplete="family-name"
            aria-invalid={lastThaiWarn || lastLatinWarn}
          />
          {lastThaiWarn ? (
            <p className="mt-1.5 text-sm font-medium text-amber-900">
              {lastNameEnglishHint}
            </p>
          ) : null}
          {lastLatinWarn ? (
            <p className="mt-1.5 text-sm font-medium text-amber-900">
              หากถือเอกสารไทยให้เลือก &quot;ประเทศไทย&quot;
              แล้วกรอกนามสกุลเป็นภาษาไทย
            </p>
          ) : null}
        </div>

        {nameDuplicate === true && namesValid && !dupCheckPending ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-slate-800"
            role="status"
          >
            <p className="font-semibold text-amber-950">
              ชื่อและนามสกุลนี้มีในระบบแล้ว
            </p>
            <p className="mt-2 leading-relaxed">
              หากพบว่าเป็นการสมัครซ้ำซ้อน จะขัดการจ่ายรางวัล
            </p>
            <p className="mt-2 font-semibold text-amber-950">ยืนยันว่า</p>
            <fieldset className="mt-3 space-y-2">
              <legend className="sr-only">สถานะการสมัครก่อนหน้า</legend>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="dupChoice"
                  value="repeat"
                  checked={duplicateChoice === "repeat"}
                  onChange={() => setDuplicateChoice("repeat")}
                  className="mt-1"
                />
                <span>เคยสมัครมาก่อน (จำรหัสไม่ได้ติดต่อเจ้าหน้าที่)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="dupChoice"
                  value="first_time"
                  checked={duplicateChoice === "first_time"}
                  onChange={() => setDuplicateChoice("first_time")}
                  className="mt-1"
                />
                <span>
                  ไม่เคยสมัครมาก่อน (เป็นคนละคน เพียงแต่ ชื่อ–นามสกุล เหมือนกันเท่านั้น)
                </span>
              </label>
            </fieldset>
            {duplicateChoice === "repeat" ? (
              <p className="mt-3 text-sm font-medium text-rose-800">
                กรุณา{" "}
                <Link href="/login" className="underline">
                  เข้าสู่ระบบ
                </Link>{" "}
                ด้วยบัญชีเดิม — จำรหัสผ่านไม่ได้กรุณา{" "}
                <Link href="/contact" className="underline">
                  ติดต่อเจ้าหน้าที่
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {namesValid && dupCheckPending ? (
          <p className="text-xs text-slate-500">กำลังตรวจสอบชื่อในระบบ…</p>
        ) : null}

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            เบอร์โทรศัพท์
          </label>
          <input
            id="phone"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="0812345678"
            required
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-700">
            ชื่อผู้ใช้ (a–z, ตัวเลข, _)
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            รหัสผ่าน (อย่างน้อย 6 ตัว)
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-slate-700">
            ยืนยันรหัสผ่าน
          </label>
          <input
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitBlocked}
          className="w-full rounded-xl bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "กำลังส่ง..." : "สมัครสมาชิก"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="text-blue-600 underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
