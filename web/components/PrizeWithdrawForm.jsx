"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiCancelPrizeWithdrawalRequest,
  apiGetMyCentralPrizeAwards,
  apiGetMyPrizeWithdrawals,
  apiGetPrizeWithdrawalAvailable,
  apiPostPrizeWithdrawalRequest,
  getMemberToken
} from "../lib/memberApi";
import PrizeWithdrawalHistoryTable from "./PrizeWithdrawalHistoryTable";
import { MEMBER_WORKSPACE_PATH } from "../lib/memberWorkspacePath";
import { useMemberAuth } from "./MemberAuthProvider";

const MIN_WITHDRAW_BAHT = 20;
const MIN_PICKUP_WITHDRAW_BAHT = 1;
const MAX_PICKUP_NOTE_LEN = 500;
const PICKUP_BANK_NAME_PLACEHOLDER = "รับเงินสดหน้างาน";

function formatBaht(n) {
  if (!Number.isFinite(n)) return "0";
  return Math.floor(n).toLocaleString("th-TH");
}

function parseRefCreator(raw) {
  if (raw == null) return "";
  return String(raw).trim().replace(/^@+/, "").toLowerCase();
}

export default function PrizeWithdrawForm({ hideShellPageTitle = false } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useMemberAuth();

  const refCreator = useMemo(
    () => parseRefCreator(searchParams.get("ref")),
    [searchParams]
  );
  const pickupMode = useMemo(() => searchParams.get("pickup") === "1", [searchParams]);
  const balanceFromQuery = useMemo(() => searchParams.get("balance"), [searchParams]);
  const [pickedCreator, setPickedCreator] = useState("");
  const [creatorChoices, setCreatorChoices] = useState([]);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorErr, setCreatorErr] = useState("");
  const effectiveCreator = refCreator || pickedCreator;

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
  const [pickupNote, setPickupNote] = useState("");

  const accountHolderName = useMemo(() => {
    if (!user) return "";
    const fn = String(user.firstName || "").trim();
    const ln = String(user.lastName || "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();
    return full || String(user.username || "").trim() || "";
  }, [user]);

  const loadAvail = useCallback(async () => {
    const token = getMemberToken();
    if (!token || !effectiveCreator) {
      setAvail(null);
      return;
    }
    setLoadingAvail(true);
    setAvailErr("");
    try {
      const data = await apiGetPrizeWithdrawalAvailable(token, effectiveCreator);
      setAvail(data);
    } catch (e) {
      setAvail(null);
      setAvailErr(e.message || String(e));
    } finally {
      setLoadingAvail(false);
    }
  }, [effectiveCreator]);

  const loadWithdrawals = useCallback(async () => {
    const token = getMemberToken();
    if (!token || !effectiveCreator) {
      setWithdrawals([]);
      return;
    }
    setLoadingWd(true);
    try {
      const data = await apiGetMyPrizeWithdrawals(token);
      const list = Array.isArray(data.withdrawals) ? data.withdrawals : [];
      const cu = effectiveCreator.toLowerCase();
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
  }, [effectiveCreator]);

  const loadCreatorChoices = useCallback(async () => {
    const token = getMemberToken();
    if (!token || refCreator) return;
    setCreatorLoading(true);
    setCreatorErr("");
    try {
      const data = await apiGetMyCentralPrizeAwards(token);
      const awards = Array.isArray(data.awards) ? data.awards : [];
      const cash = awards.filter((a) => String(a?.prizeCategory || "") === "cash");
      const byRecent = [...cash].sort(
        (a, b) => new Date(b?.wonAt || 0).getTime() - new Date(a?.wonAt || 0).getTime()
      );
      const seen = new Set();
      const choices = [];
      for (const a of byRecent) {
        const cu = parseRefCreator(a?.creatorUsername);
        if (!cu || seen.has(cu)) continue;
        seen.add(cu);
        choices.push(cu);
      }
      setCreatorChoices(choices);
      if (!pickedCreator && choices.length > 0) {
        setPickedCreator(choices[0]);
      }
    } catch (e) {
      setCreatorErr(e?.message || "โหลดผู้สร้างเกมไม่สำเร็จ");
      setCreatorChoices([]);
    } finally {
      setCreatorLoading(false);
    }
  }, [refCreator, pickedCreator]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadAvail();
    void loadWithdrawals();
  }, [authLoading, user, loadAvail, loadWithdrawals]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!refCreator) {
      void loadCreatorChoices();
    }
  }, [authLoading, user, refCreator, loadCreatorChoices]);

  useEffect(() => {
    if (!balanceFromQuery) return;
    const n = parseInt(String(balanceFromQuery).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n) && n > 0) {
      setAmountDigits(String(n));
    }
  }, [balanceFromQuery, effectiveCreator]);

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
    if (!effectiveCreator) {
      setSubmitErr("ไม่พบผู้สร้างเกม — เปิดหน้านี้จากลิงก์ในหน้ารางวัลของฉัน");
      return;
    }
    const amt = parseInt(amountDigits, 10);
    const minAmt = pickupMode ? MIN_PICKUP_WITHDRAW_BAHT : MIN_WITHDRAW_BAHT;
    if (!Number.isFinite(amt) || amt < minAmt) {
      setSubmitErr(pickupMode ? `ถอนขั้นต่ำ ${MIN_PICKUP_WITHDRAW_BAHT} บาท` : `ถอนขั้นต่ำ ${MIN_WITHDRAW_BAHT} บาท`);
      return;
    }
    if (!accountHolderName.trim()) {
      setSubmitErr("ไม่พบชื่อจากโปรไฟล์ — กรุณาอัปเดตชื่อ–นามสกุลในข้อมูลส่วนตัว");
      return;
    }
    const an = accountNumber.trim();
    const bn = bankName.trim();
    if (!pickupMode && (!an || !bn)) {
      setSubmitErr("กรุณากรอกหมายเลขบัญชีและชื่อธนาคาร");
      return;
    }
    if (avail && amt > avail.availableBaht) {
      setSubmitErr(`จำนวนเกินยอดถอนได้ (เหลือ ${formatBaht(avail.availableBaht)} บาท)`);
      return;
    }
    setBusy(true);
    try {
      const res = await apiPostPrizeWithdrawalRequest(
        token,
        pickupMode
          ? {
              creatorUsername: effectiveCreator,
              amountThb: amt,
              accountHolderName: accountHolderName.trim(),
              pickupCashHandoff: true,
              requesterNote: pickupNote.trim().slice(0, MAX_PICKUP_NOTE_LEN)
            }
          : {
              creatorUsername: effectiveCreator,
              amountThb: amt,
              accountHolderName: accountHolderName.trim(),
              accountNumber: an,
              bankName: bn
            }
      );
      setDone(true);
      setAmountDigits("");
      setAccountNumber("");
      setBankName("");
      setPickupNote("");
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
    return <p className="text-sm text-hui-muted">กำลังโหลด…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
        <p className="font-medium">ต้องเข้าสู่ระบบก่อนขอถอนเงินรางวัล</p>
        <Link href="/login" className="mt-2 inline-block font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  if (!effectiveCreator) {
    return (
      <div className="rounded-xl border border-hui-border bg-hui-pageTop px-4 py-4 text-sm text-hui-body">
        <p className="font-medium text-hui-section">เลือกผู้สร้างเกมที่จะถอนเงินรางวัล</p>
        {creatorLoading ? <p className="mt-2 text-hui-muted">กำลังโหลดรายการ…</p> : null}
        {creatorErr ? (
          <p className="mt-2 text-red-700" role="alert">
            {creatorErr}
          </p>
        ) : null}
        {creatorChoices.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {creatorChoices.map((cu) => (
              <button
                key={cu}
                type="button"
                onClick={() => setPickedCreator(cu)}
                className="rounded-xl border border-hui-border bg-white px-3 py-1.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
              >
                @{cu}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2">
            ยังไม่พบรางวัลเงินสดสำหรับถอน — ดูรายละเอียดที่{" "}
            <Link href="/member/prizes" className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
              รางวัลของฉัน
            </Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        {hideShellPageTitle ? null : (
          <h2 className="text-lg font-semibold text-hui-section">
            {pickupMode ? "ขอถอน / นัดรับเงินสด (มารับเอง)" : "ถอนเงินรางวัล (เงินสด)"}
          </h2>
        )}
        <p className={`text-sm text-hui-body ${hideShellPageTitle ? "" : "mt-1"}`}>
          {pickupMode ? (
            <>
              คำขอจะส่งถึงผู้สร้างเกม{" "}
              <span className="font-semibold text-hui-cta">@{effectiveCreator}</span> เพื่อบันทึกจำนวนบาทที่ต้องการนัดรับ
              (มารับเอง) — ไม่ต้องกรอกบัญชีธนาคาร
            </>
          ) : (
            <>
              คำขอจะส่งถึงผู้สร้างเกม{" "}
              <span className="font-semibold text-hui-cta">@{effectiveCreator}</span> เพื่อโอนเงิน — หลังจ่ายแล้วผู้สร้างจะกดอนุมัติในระบบ
            </>
          )}
        </p>
      </div>

      {loadingAvail ? (
        <p className="text-sm text-hui-muted">กำลังตรวจสอบยอดถอนได้…</p>
      ) : availErr ? (
        <p className="text-sm text-red-700" role="alert">
          {availErr}
        </p>
      ) : avail ? (
        <div className="rounded-xl border border-hui-border bg-white p-4 text-sm shadow-sm">
          <p className="text-hui-body">
            ยอดถอนได้คงเหลือ{" "}
            <span className="text-lg font-bold tabular-nums text-emerald-800">
              {formatBaht(avail.availableBaht)}
            </span>{" "}
            บาท
            <span className="block pt-1 text-sm text-hui-muted">
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
          <p className="font-semibold">ส่งคำขอแล้ว</p>
          <p className="mt-1">
            {pickupMode ? (
              <>
                ผู้สร้างเกมจะเห็นคำขอในเมนู「คำขอถอนรางวัลถึงฉัน」— นัดรับเงินสดตามที่ตกลง แล้วกดอนุมัติในระบบ
                คุณติดตามสถานะได้ใน「ประวัติการขอถอน」ด้านล่าง
              </>
            ) : (
              <>
                ผู้สร้างเกมจะเห็นคำขอในเมนู「คำขอถอนรางวัลถึงฉัน」— หลังโอนแล้วกดอนุมัติ และคุณติดตามสถานะได้ใน「ประวัติการขอถอน」ด้านล่าง
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/member/prizes"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              กลับหน้ารางวัลของฉัน
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                router.push("/member/prizes");
              }}
              className="text-sm font-semibold text-hui-body underline"
            >
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-hui-border bg-white p-4 shadow-sm sm:p-5"
      >
        <div>
          <label htmlFor="withdraw-amount" className="block text-sm font-medium text-hui-body">
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
            className="mt-1.5 w-full rounded-xl border border-hui-border px-3 py-2.5 font-mono text-base tabular-nums shadow-sm focus:border-hui-cta focus:outline-none focus:ring-2 focus:ring-hui-cta/20"
          />
          <p className="mt-1 text-sm text-hui-muted">
            {pickupMode ? (
              <>
                มารับเองไม่มีขั้นต่ำถอน {MIN_WITHDRAW_BAHT} บาท — ระบุจำนวนตั้งแต่ {MIN_PICKUP_WITHDRAW_BAHT} บาท · ระบบจะตรวจไม่ให้เกินยอดถอนได้ — คำขอที่รอดำเนินการจะถูกหักจากยอดนี้
              </>
            ) : (
              <>
                ขั้นต่ำ {MIN_WITHDRAW_BAHT} บาท · ระบบจะตรวจไม่ให้เกินยอดถอนได้ — คำขอที่รอดำเนินการจะถูกหักจากยอดนี้
              </>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-hui-body">
            ชื่อเจ้าของบัญชี <span className="text-rose-600">*</span>
          </label>
          <p className="mt-1.5 rounded-xl border border-hui-border bg-hui-pageTop px-3 py-2.5 text-sm font-medium text-hui-section">
            {accountHolderName || "— (ไม่พบชื่อในระบบ)"}
          </p>
          <p className="mt-1 text-sm text-hui-muted">
            ดึงจากชื่อ–นามสกุลในโปรไฟล์ — แก้ได้ที่{" "}
            <Link href={MEMBER_WORKSPACE_PATH} className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
              ข้อมูลส่วนตัว
            </Link>
          </p>
        </div>

        {pickupMode ? (
          <>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-sm text-emerald-950">
              <p className="font-medium">มารับเอง — ไม่ต้องกรอกบัญชีธนาคาร</p>
              <p className="mt-1 text-emerald-900/90">
                ระบบจะบันทึกคำขอให้ผู้สร้างเห็นว่าเป็นการรับเงินสดหน้างาน ({PICKUP_BANK_NAME_PLACEHOLDER})
              </p>
            </div>
            <div>
              <label htmlFor="withdraw-pickup-note" className="block text-sm font-medium text-hui-body">
                หมายเหตุ <span className="font-normal text-hui-muted">(ถ้ามี)</span>
              </label>
              <textarea
                id="withdraw-pickup-note"
                name="pickupNote"
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value.slice(0, MAX_PICKUP_NOTE_LEN))}
                rows={3}
                placeholder="เช่น ช่วงเวลาที่สะดวกนัดรับ หรือข้อความถึงผู้สร้าง"
                className="mt-1.5 w-full resize-y rounded-xl border border-hui-border px-3 py-2.5 text-sm shadow-sm focus:border-hui-cta focus:outline-none focus:ring-2 focus:ring-hui-cta/20"
                autoComplete="off"
              />
              <p className="mt-1 text-sm text-hui-muted">
                แสดงให้ผู้สร้างเกมเห็นพร้อมคำขอ — สูงสุด {MAX_PICKUP_NOTE_LEN} ตัวอักษร
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="withdraw-account" className="block text-sm font-medium text-hui-body">
                หมายเลขบัญชี <span className="text-rose-600">*</span>
              </label>
              <input
                id="withdraw-account"
                name="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.slice(0, 32))}
                className="mt-1.5 w-full rounded-xl border border-hui-border px-3 py-2.5 text-sm shadow-sm focus:border-hui-cta focus:outline-none focus:ring-2 focus:ring-hui-cta/20"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="withdraw-bank" className="block text-sm font-medium text-hui-body">
                ชื่อธนาคาร <span className="text-rose-600">*</span>
              </label>
              <input
                id="withdraw-bank"
                name="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value.slice(0, 120))}
                placeholder="เช่น ธนาคารกสิกรไทย"
                className="mt-1.5 w-full rounded-xl border border-hui-border px-3 py-2.5 text-sm shadow-sm focus:border-hui-cta focus:outline-none focus:ring-2 focus:ring-hui-cta/20"
              />
            </div>
          </>
        )}

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
            avail.availableBaht < (pickupMode ? MIN_PICKUP_WITHDRAW_BAHT : MIN_WITHDRAW_BAHT) ||
            loadingAvail ||
            done
          }
          className="hui-btn-primary w-full py-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hui-cta/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "กำลังส่งคำขอ…" : pickupMode ? "ส่งคำขอ (ระบุจำนวนบาท)" : "ถอนเงิน"}
        </button>
      </form>

      <PrizeWithdrawalHistoryTable
        withdrawals={withdrawals}
        loading={loadingWd}
        creatorRefLabel={effectiveCreator}
        onRefresh={loadWithdrawals}
        allowCancel
        onCancelRequest={handleCancelRequest}
        cancelingId={cancelingId}
        focusRowId={focusRowId}
        emptyMessage="ยังไม่มีรายการ — ส่งคำขอด้านบนเมื่อพร้อม"
      />

      <p className="text-sm text-hui-muted">
        {pickupMode
          ? "การนัดรับเงินสดเป็นการประสานงานกับผู้สร้างเกม — ยังไม่มีการโอนอัตโนมัติจากเว็บ"
          : "การถอนเป็นการประสานงานกับผู้สร้างเกม — ยังไม่มีการโอนอัตโนมัติจากเว็บ"}
      </p>
    </section>
  );
}
