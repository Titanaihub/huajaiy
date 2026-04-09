"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiAdminCreateSiteCmsPage,
  apiAdminDeleteSiteCmsPage,
  apiAdminListSiteCmsPages,
  apiAdminPatchSiteCmsPage
} from "../lib/rolesApi";
import { getMemberToken } from "../lib/memberApi";

export default function AdminSiteCmsPanel() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const data = await apiAdminListSiteCmsPages(token);
      setPages(Array.isArray(data.pages) ? data.pages : []);
    } catch (e) {
      setErr(e.message || "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setSlug("");
    setTitle("");
    setBody("");
    setPublished(true);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setSlug(p.slug || "");
    setTitle(p.title || "");
    setBody(p.body != null ? String(p.body) : "");
    setPublished(p.published !== false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      if (editingId) {
        await apiAdminPatchSiteCmsPage(token, editingId, {
          slug,
          title,
          body,
          published
        });
      } else {
        await apiAdminCreateSiteCmsPage(token, { slug, title, body, published });
      }
      resetForm();
      await load();
    } catch (e2) {
      setErr(e2.message || "ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("ลบหน้านี้ถาวร?")) return;
    const token = getMemberToken();
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      await apiAdminDeleteSiteCmsPage(token, id);
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setErr(e.message || "ลบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hui-border bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-hui-section">
          {editingId ? "แก้ไขหน้าเว็บ" : "สร้างหน้าเว็บใหม่"}
        </h3>
        <p className="mt-1 text-xs text-hui-muted">
          ลิงก์สาธารณะจะเป็น{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5">/p/ชื่อ-slug</code>{" "}
          (เช่น <code className="rounded bg-neutral-100 px-1">/p/about-us</code>)
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-hui-body" htmlFor="cms-slug">
              slug (URL)
            </label>
            <input
              id="cms-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-hui-border px-3 py-2 text-sm"
              placeholder="เช่น about-us"
              disabled={busy}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-hui-body" htmlFor="cms-title">
              หัวข้อ
            </label>
            <input
              id="cms-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full max-w-lg rounded-lg border border-hui-border px-3 py-2 text-sm"
              placeholder="หัวข้อที่แสดงบนหน้า"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-hui-body" htmlFor="cms-body">
              เนื้อหา (ข้อความล้วน — ขึ้นบรรทัดใหม่ตามที่พิมพ์)
            </label>
            <textarea
              id="cms-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-lg border border-hui-border px-3 py-2 font-mono text-sm"
              placeholder="พิมพ์เนื้อหา..."
              disabled={busy}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-hui-body">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              disabled={busy}
            />
            เผยแพร่ (ปิดแล้วผู้เยี่ยมเปิดลิงก์ไม่ได้)
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : editingId ? "บันทึก" : "สร้างหน้า"}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={busy}
                onClick={resetForm}
                className="rounded-lg border border-hui-border px-4 py-2 text-sm text-hui-body hover:bg-neutral-50"
              >
                ยกเลิกแก้ไข
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-hui-section">รายการหน้า</h3>
        {loading ? (
          <p className="mt-2 text-sm text-hui-muted">กำลังโหลด…</p>
        ) : pages.length === 0 ? (
          <p className="mt-2 text-sm text-hui-muted">ยังไม่มีหน้า — สร้างจากแบบฟอร์มด้านบน</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pages.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hui-border bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-hui-section">{p.title}</span>
                  <span className="text-hui-muted"> · </span>
                  <code className="text-xs text-pink-700">/p/{p.slug}</code>
                  {!p.published ? (
                    <span className="ml-2 text-xs text-amber-700">(ฉบับร่าง)</span>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`/p/${encodeURIComponent(p.slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-hui-border px-2 py-1 text-xs text-hui-body hover:bg-neutral-50"
                  >
                    เปิดดู
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEdit(p)}
                    className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-hui-body hover:bg-neutral-200 disabled:opacity-50"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(p.id)}
                    className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
