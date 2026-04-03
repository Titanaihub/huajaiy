"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { getApiBase } from "../lib/config";
import {
  apiAttachHeartPurchaseSlip,
  apiCreateHeartPurchase,
  apiHeartPackages,
  apiMyHeartPurchases
} from "../lib/heartsApi";
import { getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

function purchaseStatusLabel(p) {
  if (p.status === "approved") return "อนุมัติแล้ว";
  if (p.status === "rejected") return "ปฏิเสธ";
  if (p.status === "pending") {
    if (!p.slipUrl) return "รอแนบสลิป";
    return "รอการอนุมัติ";
  }
  return p.status;
}

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
    img.src = objectUrl;
  });
}

async function compressImage(originalFile) {
  const img = await loadImage(originalFile);
  const maxSide = 1600;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("บีบอัดรูปไม่สำเร็จ"));
        resolve(blob);
      },
      "image/jpeg",
      0.82
    );
  });
}

async function uploadSlipFile(file) {
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  const compressed = await compressImage(file);
  const uploadFile = new File([compressed], `${Date.now()}.jpg`, {
    type: "image/jpeg"
  });
  body.append("image", uploadFile);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "อัปโหลดสลิปไม่สำเร็จ");
  }
  return data.publicUrl;
}

export default function HeartShopClient() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useMemberAuth();
  const [packages, setPackages] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [creatingId, setCreatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [slipFileByPurchase, setSlipFileByPurchase] = useState({});
  const [submittingSlipId, setSubmittingSlipId] = useState(null);
  const [msg, setMsg] = useState("");

  const loadAll = useCallback(async () => {
    setLoadErr("");
    try {
      const pk = await apiHeartPackages();
      setPackages(pk.packages || []);
    } catch (e) {
      setLoadErr(e.message || String(e));
      setPackages([]);
    }
    const token = getMemberToken();
    if (!token) {
      setPurchases([]);
      return;
    }
    try {
      const mine = await apiMyHeartPurchases();
      setPurchases(mine.purchases || []);
    } catch {
      setPurchases([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    loadAll();
  }, [authLoading, user, router, loadAll]);

  async function onSelectPackage(pkg) {
    setMsg("");
    setCreatingId(pkg.id);
    try {
      await apiCreateHeartPurchase(pkg.id);
      setMsg("สร้างรายการสั่งซื้อแล้ว — เปิด「ดูรายละเอียดการชำระ」เพื่อโอนและแนบสลิป");
      await loadAll();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setCreatingId(null);
    }
  }

  async function submitSlipForPurchase(purchaseId, e) {
    e.preventDefault();
    const slipFile = slipFileByPurchase[purchaseId];
    if (!slipFile) {
      setMsg("เลือกรูปสลิปก่อน");
      return;
    }
    setSubmittingSlipId(purchaseId);
    setMsg("");
    try {
      const url = await uploadSlipFile(slipFile);
      await apiAttachHeartPurchaseSlip(purchaseId, url);
      setSlipFileByPurchase((prev) => {
        const next = { ...prev };
        delete next[purchaseId];
        return next;
      });
      setMsg("ส่งสลิปแล้ว — รอแอดมินอนุมัติ");
      await loadAll();
      await refresh();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setSubmittingSlipId(null);
    }
  }

  if (authLoading || !user) {
    return <p className="text-sm text-hui-muted">กำลังโหลด…</p>;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-hui-body">
        เมื่อระบบอนุมัติการซื้อ จำนวนหัวใจแดงจะเข้าไปในเมนู{" "}
        <strong className="text-hui-section">แจกหัวใจแดง</strong> (เมนูผู้สร้าง → แจกหัวใจแดง)
      </p>
      {loadErr ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadErr}
        </p>
      ) : null}

      <section>
        <h2 className="hui-h2">แพ็กเกจ</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {packages.length === 0 && !loadErr ? (
            <li className="text-sm text-hui-muted">ยังไม่มีแพ็กเปิดขาย</li>
          ) : (
            packages.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft"
              >
                <p className="hui-card-title">{p.title}</p>
                <p className="mt-2 text-sm text-hui-body">
                  {(p.description || "").trim() ||
                    "หัวใจแดงสำหรับเอาไว้แจกเล่นเกม"}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-1 text-base text-hui-body">
                  <span>หัวใจแดง</span>
                  <span className="text-2xl font-bold tabular-nums text-hui-cta sm:text-3xl">
                    {p.redQty?.toLocaleString("th-TH")}
                  </span>
                  <span>ดวง</span>
                </p>
                <p className="hui-price mt-1">
                  ฿{p.priceThb?.toLocaleString("th-TH")}
                </p>
                <button
                  type="button"
                  disabled={creatingId === p.id}
                  onClick={() => onSelectPackage(p)}
                  className="hui-btn-primary mt-3 px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {creatingId === p.id ? "กำลังสร้างรายการ…" : "เลือกแพ็กนี้"}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="hui-h2">รายการสั่งซื้อ</h2>
        {msg ? (
          <p
            className={`mt-2 text-sm ${
              msg.includes("แล้ว") || msg.includes("สร้าง") ? "text-green-700" : "text-red-600"
            }`}
          >
            {msg}
          </p>
        ) : null}
        {purchases.length === 0 ? (
          <p className="mt-2 text-sm text-hui-muted">ยังไม่มีรายการ — เลือกแพ็กด้านบนเพื่อสั่งซื้อ</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-hui-border bg-hui-surface shadow-soft">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-hui-border bg-hui-pageTop/90">
                  <th className="px-3 py-2.5 font-semibold text-hui-section">วันที่</th>
                  <th className="px-3 py-2.5 font-semibold text-hui-section">รายการสั่งซื้อ</th>
                  <th className="px-3 py-2.5 font-semibold text-hui-section">สถานะ</th>
                  <th className="px-3 py-2.5 font-semibold text-hui-section">ดูรายละเอียดการชำระ</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b border-hui-border/80">
                        <td className="whitespace-nowrap px-3 py-2.5 text-hui-body">
                          {new Date(row.createdAt).toLocaleString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-hui-body">
                          {row.packageTitle || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-hui-body">
                          {purchaseStatusLabel(row)}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : row.id)
                            }
                            className="text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
                          >
                            {expanded ? "ซ่อน" : "ดูรายละเอียดการชำระ"}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-hui-border/80 bg-hui-pageTop/60">
                          <td colSpan={4} className="px-3 py-4">
                            <div className="max-w-lg rounded-xl border border-hui-border bg-white p-3 text-sm text-hui-body">
                              <p className="text-sm font-semibold uppercase tracking-wide text-hui-section">
                                โอนเงินมาที่
                              </p>
                              <ul className="mt-2 space-y-1 text-hui-body">
                                <li>
                                  <span className="font-medium text-hui-muted">ชื่อบัญชี:</span>{" "}
                                  {row.paymentAccountName || "—"}
                                </li>
                                <li>
                                  <span className="font-medium text-hui-muted">เลขบัญชี:</span>{" "}
                                  {row.paymentAccountNumber || "—"}
                                </li>
                                <li>
                                  <span className="font-medium text-hui-muted">ธนาคาร:</span>{" "}
                                  {row.paymentBankName || "—"}
                                </li>
                              </ul>
                              {row.paymentQrUrl ? (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-hui-muted">สแกน QR จ่าย</p>
                                  <img
                                    src={row.paymentQrUrl}
                                    alt="QR ชำระเงิน"
                                    className="mt-2 max-h-48 w-auto max-w-full rounded-lg border border-hui-border bg-white object-contain"
                                  />
                                </div>
                              ) : null}
                            </div>
                            {row.status === "pending" && !row.slipUrl ? (
                              <form
                                className="mt-4 max-w-lg space-y-3"
                                onSubmit={(e) => submitSlipForPurchase(row.id, e)}
                              >
                                <div>
                                  <label className="hui-label">
                                    รูปสลิปโอนเงิน
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                      setSlipFileByPurchase((prev) => ({
                                        ...prev,
                                        [row.id]: e.target.files?.[0] || null
                                      }))
                                    }
                                    className="mt-1 block w-full text-sm"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={submittingSlipId === row.id}
                                  className="hui-btn-primary px-4 py-2 text-sm disabled:opacity-50"
                                >
                                  {submittingSlipId === row.id
                                    ? "กำลังส่ง…"
                                    : "ส่งคำขออนุมัติ"}
                                </button>
                              </form>
                            ) : null}
                            {row.slipUrl ? (
                              <p className="mt-3 text-sm">
                                <a
                                  href={row.slipUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
                                >
                                  เปิดดูสลิปที่ส่งแล้ว
                                </a>
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-sm">
        <Link
          href="/account"
          className="font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
        >
          ← ภาพรวมบัญชี
        </Link>
      </p>
    </div>
  );
}
