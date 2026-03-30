"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function safeDecodeParam(raw) {
  if (raw == null || raw === "") return "";
  try {
    return decodeURIComponent(String(raw))
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .trim();
  } catch {
    return String(raw)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .trim()
      .slice(0, 500);
  }
}

export default function ContactForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefilledRef = useRef(false);
  const prizeRedirectRef = useRef(false);

  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam === "prize-withdraw" && !prizeRedirectRef.current) {
      prizeRedirectRef.current = true;
      const refParam = searchParams.get("ref");
      const balanceParam = searchParams.get("balance");
      const qs = new URLSearchParams();
      if (refParam) qs.set("ref", refParam);
      if (balanceParam) qs.set("balance", balanceParam);
      const suffix = qs.toString();
      router.replace(suffix ? `/account/prize-withdraw?${suffix}` : "/account/prize-withdraw");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;

    const topicParam = searchParams.get("topic");
    const messageParam = searchParams.get("message");

    if (topicParam === "prize-withdraw") {
      return;
    }

    if (topicParam) {
      const t = safeDecodeParam(topicParam).slice(0, 80);
      if (t) setTopic((prev) => (prev.trim() ? prev : t));
    }

    if (messageParam) {
      const m = safeDecodeParam(messageParam).slice(0, 2000);
      if (m) setMessage((prev) => (prev.trim() ? prev : m));
    }
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, message })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "ส่งไม่สำเร็จ");
      }
      setDone(true);
      setTopic("");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err.message || "ส่งไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700">
            หัวข้อ (ไม่บังคับ)
          </label>
          <input
            id="topic"
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="เช่น สอบถามสินค้า / ชำระเงิน"
            maxLength={80}
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            ชื่อ (ไม่บังคับ)
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            maxLength={120}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            อีเมล (ไม่บังคับ)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            maxLength={256}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">
            ข้อความ <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-relaxed shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="พิมพ์ข้อความที่นี่"
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-slate-500">{message.length}/2000 ตัวอักษร</p>
        </div>
        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {done ? (
          <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-900 ring-1 ring-brand-100">
            ส่งข้อความแล้ว — ทีมงานจะใช้ข้อมูลนี้ติดตามการถอน/ตอบกลับ (ขณะนี้บันทึกผ่านระบบเว็บไซต์)
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-800 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading ? "กำลังส่ง..." : "ส่งข้อความ"}
        </button>
      </form>
    </div>
  );
}
