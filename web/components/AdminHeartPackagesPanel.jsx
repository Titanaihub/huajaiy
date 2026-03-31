"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCreateHeartPackage,
  apiAdminDeleteHeartPackage,
  apiAdminHeartPackages,
  apiAdminPatchHeartPackage
} from "../lib/rolesApi";

async function uploadImageToApi(file) {
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.publicUrl) {
    throw new Error(data.error || "อัปโหลดรูปไม่สำเร็จ");
  }
  return data.publicUrl;
}

export default function AdminHeartPackagesPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [redQty, setRedQty] = useState("0");
  const [priceThb, setPriceThb] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");
  const [paymentQrFile, setPaymentQrFile] = useState(null);
  const [createMsg, setCreateMsg] = useState("");
  const [paymentEditPkg, setPaymentEditPkg] = useState(null);
  const [paymentEditName, setPaymentEditName] = useState("");
  const [paymentEditNumber, setPaymentEditNumber] = useState("");
  const [paymentEditBank, setPaymentEditBank] = useState("");
  const [paymentEditQrFile, setPaymentEditQrFile] = useState(null);
  const [paymentEditBusy, setPaymentEditBusy] = useState(false);
  const [paymentEditMsg, setPaymentEditMsg] = useState("");

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const data = await apiAdminHeartPackages(token);
      setList(data.packages || []);
    } catch (e) {
      setErr(e.message || String(e));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createPkg(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setCreateMsg("");
    try {
      if (!paymentQrFile) {
        setCreateMsg("กรุณาเลือกไฟล์รูป QR โค้ดสำหรับสแกนจ่าย");
        return;
      }
      const qrUrl = await uploadImageToApi(paymentQrFile);
      await apiAdminCreateHeartPackage(token, {
        title,
        description,
        pinkQty: 0,
        redQty: parseInt(redQty, 10) || 0,
        priceThb: parseInt(priceThb, 10) || 0,
        sortOrder: parseInt(sortOrder, 10) || 0,
        active: true,
        paymentAccountName: paymentAccountName.trim(),
        paymentAccountNumber: paymentAccountNumber.trim(),
        paymentBankName: paymentBankName.trim(),
        paymentQrUrl: qrUrl
      });
      setTitle("");
      setDescription("");
      setRedQty("0");
      setPriceThb("0");
      setSortOrder("0");
      setPaymentAccountName("");
      setPaymentAccountNumber("");
      setPaymentBankName("");
      setPaymentQrFile(null);
      setCreateMsg("สร้างแล้ว");
      await load();
    } catch (e) {
      setCreateMsg(e.message || String(e));
    }
  }

  function openPaymentEdit(pkg) {
    setPaymentEditPkg(pkg);
    setPaymentEditName(pkg.paymentAccountName || "");
    setPaymentEditNumber(pkg.paymentAccountNumber || "");
    setPaymentEditBank(pkg.paymentBankName || "");
    setPaymentEditQrFile(null);
    setPaymentEditMsg("");
  }

  async function savePaymentEdit(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token || !paymentEditPkg) return;
    setPaymentEditBusy(true);
    setPaymentEditMsg("");
    try {
      if (!paymentEditName.trim() || !paymentEditNumber.trim() || !paymentEditBank.trim()) {
        setPaymentEditMsg("กรอกชื่อบัญชี เลขบัญชี และธนาคารให้ครบ");
        return;
      }
      let qrUrl = paymentEditPkg.paymentQrUrl || "";
      if (paymentEditQrFile) {
        qrUrl = await uploadImageToApi(paymentEditQrFile);
      }
      if (!/^https?:\/\//i.test(qrUrl)) {
        setPaymentEditMsg("ต้องมี QR โค้ด — อัปโหลดรูปใหม่หรือคงของเดิม");
        return;
      }
      await apiAdminPatchHeartPackage(token, paymentEditPkg.id, {
        paymentAccountName: paymentEditName.trim(),
        paymentAccountNumber: paymentEditNumber.trim(),
        paymentBankName: paymentEditBank.trim(),
        paymentQrUrl: qrUrl
      });
      setPaymentEditPkg(null);
      await load();
    } catch (e) {
      setPaymentEditMsg(e.message || String(e));
    } finally {
      setPaymentEditBusy(false);
    }
  }

  /** ปิดการขายเท่านั้น — 「เปิดการขาย」แสดงแต่กดไม่ได้ (ถือว่าปิดถาวรในหน้าแอดมิน) */
  async function closeSale(pkg) {
    if (!pkg.active) return;
    const token = getMemberToken();
    if (!token) return;
    if (
      !window.confirm(
        `ปิดการขาย「${pkg.title}」?\nหลังปิดแล้วจะไม่มีปุ่มเปิดผ่านหน้านี้อีก (ลบแพ็กได้ถ้าไม่มีประวัติซื้อ)`
      )
    ) {
      return;
    }
    setBusyId(pkg.id);
    setErr("");
    try {
      await apiAdminPatchHeartPackage(token, pkg.id, { active: false });
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function deletePkg(pkg) {
    if (
      !window.confirm(
        `ลบแพ็ก「${pkg.title}」ถาวร?\n(ถ้ามีสมาชิกเคยซื้อแพ็กนี้แล้ว ระบบจะไม่ให้ลบ)`
      )
    ) {
      return;
    }
    const token = getMemberToken();
    if (!token) return;
    setBusyId(pkg.id);
    setErr("");
    try {
      await apiAdminDeleteHeartPackage(token, pkg.id);
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <p className="text-sm text-slate-600">
        ขายได้เฉพาะหัวใจแดง (เข้ายอดแจก) สำหรับผู้สร้างเกม — หัวใจชมพูได้จากกิจกรรม/รหัสพิเศษที่แอดมินกำหนดเท่านั้น · สมาชิกแนบสลิป แอดมินอนุมัติในแท็บอนุมัติสลิป
        · หลัง<strong>ปิดการขาย</strong> รายการ「เปิดการขาย」จะกดไม่ได้ (ปิดถาวรในหน้านี้)
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <form
        onSubmit={createPkg}
        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-slate-800">สร้างแพ็กเกจใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">ชื่อแพ็กเกจ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-950">
            ไม่มีช่องชมพู — ระบบบังคับแดงแจกอย่างเดียว
          </div>
          <div>
            <label className="text-xs font-medium text-red-700">หัวใจแดง (แจก) จำนวนดวง</label>
            <input
              type="number"
              min={1}
              value={redQty}
              onChange={(e) => setRedQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">ราคา (บาท)</label>
            <input
              type="number"
              min={0}
              value={priceThb}
              onChange={(e) => setPriceThb(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">ลำดับแสดง</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            ข้อมูลรับโอน — สมาชิกจะเห็นตอนเลือกแพ็กเพื่อโอนและแนบสลิป
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">ชื่อบัญชี (รับโอน)</label>
            <input
              value={paymentAccountName}
              onChange={(e) => setPaymentAccountName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">หมายเลขบัญชี</label>
            <input
              value={paymentAccountNumber}
              onChange={(e) => setPaymentAccountNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">ชื่อธนาคาร</label>
            <input
              value={paymentBankName}
              onChange={(e) => setPaymentBankName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">อัปโหลด QR โค้ด (สแกนจ่าย)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentQrFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm"
              required
            />
          </div>
        </div>
        {createMsg ? (
          <p className={`text-sm ${createMsg.includes("แล้ว") ? "text-green-700" : "text-red-600"}`}>
            {createMsg}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
        >
          สร้างแพ็กเกจ
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">กำลังโหลด…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">ชื่อ</th>
                <th className="px-3 py-2">แดงแจก</th>
                <th className="px-3 py-2">ราคา</th>
                <th className="px-3 py-2">บัญชีโอน</th>
                <th className="px-3 py-2">ขาย</th>
                <th className="px-3 py-2 min-w-[10rem]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    ยังไม่มีแพ็กเกจ
                  </td>
                </tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium">{p.title}</td>
                    <td className="px-3 py-2 text-red-700">{p.redQty}</td>
                    <td className="px-3 py-2">฿{p.priceThb?.toLocaleString("th-TH")}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {p.paymentAccountName && p.paymentQrUrl ? (
                        <span className="text-emerald-800">ครบ</span>
                      ) : (
                        <span className="text-amber-800">ยังไม่ตั้ง</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {p.active ? "เปิด" : p.retired ? "หยุดขายถาวร" : "ปิด (ถาวรในหน้านี้)"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => openPaymentEdit(p)}
                          className="text-xs font-semibold text-slate-700 underline"
                        >
                          บัญชีโอน
                        </button>
                        {p.active ? (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void closeSale(p)}
                            className="text-xs font-semibold text-brand-800 underline"
                          >
                            ปิดการขาย
                          </button>
                        ) : (
                          <span
                            className="cursor-not-allowed select-none text-xs font-semibold text-slate-400 underline decoration-slate-300"
                            title="ปิดการขายแล้ว — เปิดผ่านหน้านี้ไม่ได้ (ถือว่าปิดถาวร)"
                          >
                            เปิดการขาย
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => void deletePkg(p)}
                          className="text-xs font-semibold text-red-700 underline"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {paymentEditPkg ? (
        <form
          onSubmit={savePaymentEdit}
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            ตั้งค่าบัญชีโอน: {paymentEditPkg.title}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">ชื่อบัญชี</label>
              <input
                value={paymentEditName}
                onChange={(e) => setPaymentEditName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">หมายเลขบัญชี</label>
              <input
                value={paymentEditNumber}
                onChange={(e) => setPaymentEditNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">ชื่อธนาคาร</label>
              <input
                value={paymentEditBank}
                onChange={(e) => setPaymentEditBank(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">
                อัปโหลด QR ใหม่ (เว้นว่างถ้าคงรูปเดิม)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentEditQrFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm"
              />
              {paymentEditPkg.paymentQrUrl ? (
                <p className="mt-1 text-xs text-slate-500">
                  รูปปัจจุบัน:{" "}
                  <a
                    href={paymentEditPkg.paymentQrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-800 underline"
                  >
                    เปิดดู
                  </a>
                </p>
              ) : null}
            </div>
          </div>
          {paymentEditMsg ? <p className="text-sm text-red-600">{paymentEditMsg}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={paymentEditBusy}
              className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
            >
              {paymentEditBusy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => setPaymentEditPkg(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
