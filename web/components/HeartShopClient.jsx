"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "../lib/config";
import {
  apiCreateHeartPurchase,
  apiHeartPackages,
  apiMyHeartPurchases
} from "../lib/heartsApi";
import { getMemberToken } from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

function purchaseStatusThai(s) {
  if (s === "pending") return "รออนุมัติ";
  if (s === "approved") return "อนุมัติแล้ว";
  if (s === "rejected") return "ปฏิเสธ";
  return s;
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
  const [selected, setSelected] = useState(null);
  const [slipFile, setSlipFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
      router.replace("/login?next=/account/hearts-shop");
      return;
    }
    loadAll();
  }, [authLoading, user, router, loadAll]);

  async function submitPurchase(e) {
    e.preventDefault();
    if (!selected || !slipFile) {
      setMsg("เลือกแพ็กเกจและแนบรูปสลิป");
      return;
    }
    setSubmitting(true);
    setMsg("");
    try {
      const url = await uploadSlipFile(slipFile);
      await apiCreateHeartPurchase(selected.id, url);
      setSelected(null);
      setSlipFile(null);
      setMsg("ส่งคำขอแล้ว — รอแอดมินอนุมัติ");
      await loadAll();
      await refresh();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return <p className="text-sm text-slate-600">กำลังโหลด…</p>;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        เลือกแพ็กเกจ โอนเงินตามราคา แล้วอัปโหลดสลิป — แอดมินจะตรวจและเติมหัวใจชมพู/แดงให้เมื่ออนุมัติ
      </p>
      {loadErr ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadErr}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-slate-900">แพ็กเกจ</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {packages.length === 0 && !loadErr ? (
            <li className="text-sm text-slate-500">ยังไม่มีแพ็กเปิดขาย</li>
          ) : (
            packages.map((p) => (
              <li
                key={p.id}
                className={`rounded-xl border p-4 shadow-sm ${
                  selected?.id === p.id
                    ? "border-brand-400 bg-brand-50/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="font-semibold text-slate-900">{p.title}</p>
                {p.description ? (
                  <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                ) : null}
                <p className="mt-2 text-sm">
                  <span className="text-rose-600 font-medium">ชมพู {p.pinkQty}</span>
                  {" · "}
                  <span className="text-red-700 font-medium">แดง {p.redQty}</span>
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  ฿{p.priceThb?.toLocaleString("th-TH")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    setMsg("");
                  }}
                  className="mt-3 rounded-lg bg-brand-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-900"
                >
                  เลือกแพ็กนี้
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {selected ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-800">
            ส่งสลิป: {selected.title}
          </h3>
          <form onSubmit={submitPurchase} className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600">รูปสลิปโอนเงิน</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm"
              />
            </div>
            {msg ? (
              <p
                className={`text-sm ${
                  msg.includes("แล้ว") ? "text-green-700" : "text-red-600"
                }`}
              >
                {msg}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {submitting ? "กำลังส่ง…" : "ส่งคำขออนุมัติ"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSlipFile(null);
                  setMsg("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-slate-900">ประวัติการซื้อ</h2>
        {purchases.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">ยังไม่มี</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {purchases.map((x) => (
              <li key={x.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <span className="font-medium">{purchaseStatusThai(x.status)}</span> · ชมพู{" "}
                {x.pinkQty} แดง{" "}
                {x.redQty} · ฿{x.priceThbSnapshot?.toLocaleString("th-TH")} ·{" "}
                {new Date(x.createdAt).toLocaleString("th-TH")}
                {x.slipUrl ? (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={x.slipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-800 underline"
                    >
                      สลิป
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm">
        <Link href="/account" className="text-brand-800 underline">
          ← ภาพรวมบัญชี
        </Link>
      </p>
    </div>
  );
}
