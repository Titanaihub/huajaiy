"use client";

import { useState } from "react";

export default function ContactForm() {
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="พิมพ์ข้อความที่นี่"
          maxLength={2000}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {done ? (
        <p className="text-sm text-brand-700">
          ส่งข้อความแล้ว — เราจะติดต่อกลับตามช่องทางที่เหมาะสม (ขณะนี้บันทึกในระบบเว็บไซต์)
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
      >
        {loading ? "กำลังส่ง..." : "ส่งข้อความ"}
      </button>
    </form>
  );
}
