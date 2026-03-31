"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiCancelPrizeWithdrawalRequest,
  apiGetMyPrizeWithdrawals,
  apiGetPrizeWithdrawalAvailable,
  apiPostPrizeWithdrawalRequest,
  getMemberToken
} from "../lib/memberApi";
import PrizeWithdrawalHistoryTable from "./PrizeWithdrawalHistoryTable";
import { useMemberAuth } from "./MemberAuthProvider";

const MIN_WITHDRAW_BAHT = 20;

function formatBaht(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString("th-TH");
}

function parseRefCreator(raw) {
  if (raw == null) return "";
  return String(raw).trim().replace(/^@+/, "").toLowerCase();
}

export default function PrizeWithdrawForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useMemberAuth();

  const refCreator = useMemo(
    () => parseRefCreator(searchParams.get("ref")),
    [searchParams]
  );

  const [avail, setAvail] = useState(null);
  const [availErr, setAvailErr] = useState("");
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [amountDigits, setAmountDigits] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [done, setDone] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWd, setLoadingWd] = useState(false);
  const [focusRowId, setFocusRowId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  const accountHolderName = useMemo(() => {
    if (!user) return "";
    const fn = String(user.firstName || "").trim();
    const ln = String(user.lastName || "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();
    return full || String(user.username || "").trim() || "";
  }, [user]);

  const loadAvail = useCallback(async () => {
    const token = getMemberToken();
    if (!token || !refCreator) {
      setAvail(null);
      return;
    }
    setLoadingAvail(true);
    setAvailErr("");
    try {
      const data = await apiGetPrizeWithdrawalAvailable(token, refCreator);
      setAvail(data);
    } catch (e) {
      setAvail(null);
      setAvailErr(e.message || String(e));
    } finally {
      setLoadingAvail(false);
    }
  }, [refCreator]);

  const loadWithdrawals = useCallback(async () => {
    const token = getMemberToken();
    if (!token || !refCreator) {
      setWithdrawals([]);
      return;
    }
    setLoadingWd(true);
    try {
      const data = await apiGetMyPrizeWithdrawals(token);
      const list = Array.isArray(data.withdrawals) ? data.withdrawals : [];
      const cu = refCreator.toLowerCase();
      setWithdrawals(
        list.filter(
          (w) => String(w.creatorUsername || "").trim().toLowerCase() === cu
        )
      );
    } catch {
      setWithdrawals([]);
    } finally {
      setLoadingWd(false);
    }
  }, [refCreator]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadAvail();
    void loadWithdrawals();
  }, [authLoading, user, loadAvail, loadWithdrawals]);

  async function handleCancelRequest(id) {
    const token = getMemberToken();
    if (!token) return;
    setCancelingId(id);
    try {
      await apiCancelPrizeWithdrawalRequest(token, id);
      await loadWithdrawals();
      await loadAvail();
    } finally {
      setCancelingId(null);
    }
  }

  function onAmountChange(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAmountDigits(v);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitErr("");
    setDone(false);
    const token = getMemberToken();
    if (!token || !user) {
      setSubmitErr("กรุณาเข้าสู่ระบบ");
      return;
    }
    if (!refCreator) {
      setSubmitErr("ไม่พบผู้สร้างเกม — เปิดหน้านี้จากลิงก์ในหน้ารางวัลของฉัน");
      return;
    }
    const amt = parseInt(amountDigits, 10);
    if (!Number.isFinite(amt) || amt < MIN_WITHDRAW_BAHT) {
      setSubmitErr(`ถอนขั้นต่ำ ${MIN_WITHDRAW_BAHT} บาท`);
      return;
    }
    if (!accountHolderName.trim()) {
      setSubmitErr("ไม่พบชื่อจากโปรไฟล์ — กรุณาอัปเดตชื่อ–นามสกุลในข้อมูลส่วนตัว");
      return;
    }
    const an = accountNumber.trim();
    const bn = bankName.trim();
    if (!an || !bn) {
      setSubmitErr("กรุณากรอกหมายเลขบัญชีและชื่อธนาคาร");
      return;
    }
    if (avail && amt > avail.availableBaht) {
      setSubmitErr(`จำนวนเกินยอดถอนได้ (เหลือ ${formatBaht(avail.availableBaht)} บาท)`);
      return;
    }
    setBusy(true);
    try {
      const res = await apiPostPrizeWithdrawalRequest(token, {
        creatorUsername: refCreator,
        amountThb: amt,
        accountHolderName: accountHolderName.trim(),
        accountNumber: an,
        bankName: bn
      });
      setDone(true);
      setAmountDigits("");
      setAccountNumber("");
      setBankName("");
      await loadAvail();
      await loadWithdrawals();
      const newId = res?.withdrawal?.id;
      if (newId) setFocusRowId(String(newId));
    } catch (err) {
      setSubmitErr(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-slate-500">กำลังโหลด…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">ต้องเข้าสู่ระบบก่อนขอถอนเงินรางวัล</p>
        <Link href="/login" className="mt-2 inline-block font-semibold text-brand-800 underline">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  if (!refCreator) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">ไม่พบข้อมูลผู้สร้างเกม</p>
        <p className="mt-2">
          เปิดหน้านี้จากปุ่ม「ถอนเงินรางวัล」ในหน้า{" "}
          <Link href="/account/prizes" className="font-semibold text-brand-800 underline">
            รางวัลของฉัน
          </Link>
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">ถอนเงินรางวัล (เงินสด)</h2>
        <p className="mt-1 text-sm text-slate-600">
          คำขอจะส่งถึงผู้สร้างเกม <span className="font-semibold text-brand-800">@{refCreator}</span>{" "}
          เพื่อโอนเงิน — หลังจ่ายแล้วผู้สร้างจะกดอนุมัติในระบบ
        </p>
      </div>

      {loadingAvail ? (
        <p className="text-sm text-slate-500">กำลังตรวจสอบยอดถอนได้…</p>
      ) : availErr ? (
        <p className="text-sm text-red-700" role="alert">
          {availErr}
        </p>
      ) : avail ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="text-slate-700">
            ยอดถอนได้คงเหลือ{" "}
            <span className="text-lg font-bold tabular-nums text-emerald-800">
              {formatBaht(avail.availableBaht)}
            </span>{" "}
            บาท
            <span className="block pt-1 text-xs text-slate-500">
              รวมจากรางวัลเงินสด {formatBaht(avail.earnedBaht)} บาท · หักคำขอที่รอ/อนุมัติแล้ว{" "}
              {formatBaht(avail.reservedBaht)} บาท
            </span>
          </p>
        </div>
      ) : null}

      {done ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          <p className="font-semibold">ส่งคำขอถอนเงินแล้ว</p>
          <p className="mt-1">
            ผู้สร้างเกมจะเห็นคำขอในเมนู「คำขอถอนรางวัลถึงฉัน」— หลังโอนแล้วกดอนุมัติ และคุณติดตามสถานะได้ใน「ประวัติการขอถอน」ด้านล่าง
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/account/prizes"
              className="font-semibold text-brand-800 underline hover:text-brand-950"
            >
              กลับหน้ารางวัลของฉัน
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                router.push("/account/prizes");
              }}
              className="text-sm font-semibold text-slate-600 underline"
            >
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div>
          <label htmlFor="withdraw-amount" className="block text-sm font-medium text-slate-700">
            จำนวนเงินที่ถอน (บาท) <span className="text-rose-600">*</span>
          </label>
          <input
            id="withdraw-amount"
            name="amount"
            inputMode="numeric"
            autoComplete="off"
            value={amountDigits}
            onChange={onAmountChange}
            placeholder="กรอกตัวเลขเท่านั้น"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-base tabular-nums shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <p className="mt-1 text-xs text-slate-500">
            ขั้นต่ำ {MIN_WITHDRAW_BAHT} บาท · ระบบจะตรวจไม่ให้เกินยอดถอนได้ — คำขอที่รอดำเนินการจะถูกหักจากยอดนี้
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            ชื่อเจ้าของบัญชี <span className="text-rose-600">*</span>
          </label>
          <p className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900">
            {accountHolderName || "— (ไม่พบชื่อในระบบ)"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ดึงจากชื่อ–นามสกุลในโปรไฟล์ — แก้ได้ที่{" "}
            <Link href="/account/profile" className="font-medium text-brand-800 underline">
              ข้อมูลส่วนตัว
            </Link>
          </p>
        </div>

        <div>
          <label htmlFor="withdraw-account" className="block text-sm font-medium text-slate-700">
            หมายเลขบัญชี <span className="text-rose-600">*</span>
          </label>
          <input
            id="withdraw-account"
            name="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.slice(0, 32))}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="withdraw-bank" className="block text-sm font-medium text-slate-700">
            ชื่อธนาคาร <span className="text-rose-600">*</span>
          </label>
          <input
            id="withdraw-bank"
            name="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value.slice(0, 120))}
            placeholder="เช่น ธนาคารกสิกรไทย"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {submitErr ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {submitErr}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            busy ||
            !avail ||
            avail.availableBaht < MIN_WITHDRAW_BAHT ||
            loadingAvail ||
            done
          }
          className="w-full rounded-xl bg-emerald-700 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "กำลังส่งคำขอ…" : "ถอนเงิน"}
        </button>
      </form>

      <PrizeWithdrawalHistoryTable
        withdrawals={withdrawals}
        loading={loadingWd}
        creatorRefLabel={refCreator}
        onRefresh={loadWithdrawals}
        allowCancel
        onCancelRequest={handleCancelRequest}
        cancelingId={cancelingId}
        focusRowId={focusRowId}
        emptyMessage="ยังไม่มีรายการ — ส่งคำขอด้านบนเมื่อพร้อม"
      />

      <p className="text-xs text-slate-500">
        การถอนเป็นการประสานงานกับผู้สร้างเกม — ยังไม่มีการโอนอัตโนมัติจากเว็บ
      </p>
    </section>
  );
}
