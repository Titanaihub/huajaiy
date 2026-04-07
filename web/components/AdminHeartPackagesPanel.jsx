"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBase, uploadUrl } from "../lib/config";
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
  const res = await fetch(uploadUrl(), { method: "POST", body });
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
  const [editPkg, setEditPkg] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRedQty, setEditRedQty] = useState("0");
  const [editPriceThb, setEditPriceThb] = useState("0");
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [editPayName, setEditPayName] = useState("");
  const [editPayNumber, setEditPayNumber] = useState("");
  const [editPayBank, setEditPayBank] = useState("");
  const [editQrFile, setEditQrFile] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");

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

  function openEdit(pkg) {
    setEditPkg(pkg);
    setEditTitle(pkg.title || "");
    setEditDescription(pkg.description || "");
    setEditRedQty(String(pkg.redQty ?? 0));
    setEditPriceThb(String(pkg.priceThb ?? 0));
    setEditSortOrder(String(pkg.sortOrder ?? 0));
    setEditPayName(pkg.paymentAccountName || "");
    setEditPayNumber(pkg.paymentAccountNumber || "");
    setEditPayBank(pkg.paymentBankName || "");
    setEditQrFile(null);
    setEditMsg("");
  }

  async function saveEdit(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token || !editPkg) return;
    setEditBusy(true);
    setEditMsg("");
    try {
      const t = editTitle.trim();
      if (!t) {
        setEditMsg("ต้องมีชื่อแพ็กเกจ");
        return;
      }
      const rq = parseInt(editRedQty, 10) || 0;
      if (rq < 1) {
        setEditMsg("จำนวนหัวใจแดง (แจก) อย่างน้อย 1");
        return;
      }
      if (!editPayName.trim() || !editPayNumber.trim() || !editPayBank.trim()) {
        setEditMsg("กรอกชื่อบัญชี เลขบัญชี และธนาคารให้ครบ");
        return;
      }
      let qrUrl = editPkg.paymentQrUrl || "";
      if (editQrFile) {
        qrUrl = await uploadImageToApi(editQrFile);
      }
      if (!/^https?:\/\//i.test(qrUrl)) {
        setEditMsg("ต้องมี QR โค้ด — อัปโหลดรูปใหม่หรือคงของเดิม");
        return;
      }
      await apiAdminPatchHeartPackage(token, editPkg.id, {
        title: t,
        description: editDescription,
        pinkQty: 0,
        redQty: rq,
        priceThb: parseInt(editPriceThb, 10) || 0,
        sortOrder: parseInt(editSortOrder, 10) || 0,
        paymentAccountName: editPayName.trim(),
        paymentAccountNumber: editPayNumber.trim(),
        paymentBankName: editPayBank.trim(),
        paymentQrUrl: qrUrl
      });
      setEditPkg(null);
      await load();
    } catch (e) {
      setEditMsg(e.message || String(e));
    } finally {
      setEditBusy(false);
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
      <p className="text-sm text-hui-body">
        ขายได้เฉพาะหัวใจแดง (เข้ายอดแจก) สำหรับผู้สร้างเกม — หัวใจชมพูได้จากกิจกรรม/รหัสพิเศษที่แอดมินกำหนดเท่านั้น · สมาชิกแนบสลิป แอดมินอนุมัติในแท็บอนุมัติสลิป
        · กด<strong>แก้ไข</strong>เพื่อเปลี่ยนชื่อ ราคา ยอดแดง บัญชีรับโอน หรือ QR เมื่อต้องการ
        · หลัง<strong>ปิดการขาย</strong> รายการ「เปิดการขาย」จะกดไม่ได้ (ปิดถาวรในหน้านี้)
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <form
        onSubmit={createPkg}
        className="rounded-xl border border-hui-border bg-hui-pageTop/90 p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-hui-body">สร้างแพ็กเกจใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-hui-body">ชื่อแพ็กเกจ</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-hui-body">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-hui-border bg-hui-pageTop px-3 py-2 text-sm text-hui-burgundy">
            ไม่มีช่องชมพู — ระบบบังคับแดงแจกอย่างเดียว
          </div>
          <div>
            <label className="text-sm font-medium text-red-700">หัวใจแดง (แจก) จำนวนดวง</label>
            <input
              type="number"
              min={1}
              value={redQty}
              onChange={(e) => setRedQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-hui-body">ราคา (บาท)</label>
            <input
              type="number"
              min={0}
              value={priceThb}
              onChange={(e) => setPriceThb(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-hui-body">ลำดับแสดง</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
            ข้อมูลรับโอน — สมาชิกจะเห็นตอนเลือกแพ็กเพื่อโอนและแนบสลิป
          </div>
          <div>
            <label className="text-sm font-medium text-hui-body">ชื่อบัญชี (รับโอน)</label>
            <input
              value={paymentAccountName}
              onChange={(e) => setPaymentAccountName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-hui-body">หมายเลขบัญชี</label>
            <input
              value={paymentAccountNumber}
              onChange={(e) => setPaymentAccountNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-hui-body">ชื่อธนาคาร</label>
            <input
              value={paymentBankName}
              onChange={(e) => setPaymentBankName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-hui-body">อัปโหลด QR โค้ด (สแกนจ่าย)</label>
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
          className="hui-btn-primary px-4 py-2 text-sm"
        >
          สร้างแพ็กเกจ
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-hui-muted">กำลังโหลด…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hui-border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hui-border bg-hui-pageTop text-sm font-semibold uppercase text-hui-body">
              <tr>
                <th className="px-3 py-2">ชื่อ</th>
                <th className="px-3 py-2">แดงแจก</th>
                <th className="px-3 py-2">ราคา</th>
                <th className="px-3 py-2">ชำระเงิน</th>
                <th className="px-3 py-2">ขาย</th>
                <th className="px-3 py-2 min-w-[10rem]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-hui-muted">
                    ยังไม่มีแพ็กเกจ
                  </td>
                </tr>
              ) : (
                list.map((p) => (
                  <tr key={p.id} className="border-b border-hui-border/70">
                    <td className="px-3 py-2 font-medium">{p.title}</td>
                    <td className="px-3 py-2 text-red-700">{p.redQty}</td>
                    <td className="px-3 py-2">฿{p.priceThb?.toLocaleString("th-TH")}</td>
                    <td className="px-3 py-2 text-sm text-hui-body">
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
                          onClick={() => openEdit(p)}
                          className="text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                        >
                          แก้ไข
                        </button>
                        {p.active ? (
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void closeSale(p)}
                            className="text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                          >
                            ปิดการขาย
                          </button>
                        ) : (
                          <span
                            className="cursor-not-allowed select-none text-sm font-semibold text-hui-muted underline decoration-hui-border"
                            title="ปิดการขายแล้ว — เปิดผ่านหน้านี้ไม่ได้ (ถือว่าปิดถาวร)"
                          >
                            เปิดการขาย
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => void deletePkg(p)}
                          className="text-sm font-semibold text-red-700 underline"
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

      {editPkg ? (
        <form
          onSubmit={saveEdit}
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-hui-section">แก้ไขแพ็กเกจ</h3>
          <p className="text-sm text-hui-body">
            แก้ชื่อ ราคา ยอดแดง หรือบัญชีรับโอน / QR ได้ตลอด — ช่อง QR เว้นว่างถ้าใช้รูปเดิม
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-hui-body">ชื่อแพ็กเกจ</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-hui-body">รายละเอียด</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-red-700">หัวใจแดง (แจก) จำนวนดวง</label>
              <input
                type="number"
                min={1}
                value={editRedQty}
                onChange={(e) => setEditRedQty(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-hui-body">ราคา (บาท)</label>
              <input
                type="number"
                min={0}
                value={editPriceThb}
                onChange={(e) => setEditPriceThb(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-hui-body">ลำดับแสดง</label>
              <input
                type="number"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 rounded-lg border border-white/60 bg-white/50 px-3 py-2 text-sm text-hui-body">
              บัญชีรับโอนและ QR (สมาชิกเห็นตอนซื้อ)
            </div>
            <div>
              <label className="text-sm font-medium text-hui-body">ชื่อบัญชี</label>
              <input
                value={editPayName}
                onChange={(e) => setEditPayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-hui-body">หมายเลขบัญชี</label>
              <input
                value={editPayNumber}
                onChange={(e) => setEditPayNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-hui-body">ชื่อธนาคาร</label>
              <input
                value={editPayBank}
                onChange={(e) => setEditPayBank(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-hui-body">
                อัปโหลด QR ใหม่ (เว้นว่างถ้าคงรูปเดิม)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditQrFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm"
              />
              {editPkg.paymentQrUrl ? (
                <p className="mt-1 text-sm text-hui-muted">
                  รูปปัจจุบัน:{" "}
                  <a
                    href={editPkg.paymentQrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                  >
                    เปิดดู
                  </a>
                </p>
              ) : null}
            </div>
          </div>
          {editMsg ? <p className="text-sm text-red-600">{editMsg}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={editBusy}
              className="hui-btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {editBusy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
            <button
              type="button"
              onClick={() => setEditPkg(null)}
              className="rounded-lg border border-hui-border px-4 py-2 text-sm"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
