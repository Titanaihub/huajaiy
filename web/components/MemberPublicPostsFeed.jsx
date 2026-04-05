"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import {
  apiCreateMyPublicPost,
  apiDeleteMyPublicPost,
  apiPatchMyPublicPost,
  getMemberToken
} from "../lib/memberApi";
import { useMemberAuth } from "./MemberAuthProvider";

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sortPosts(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  arr.sort((a, b) => {
    const so = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (so !== 0) return so;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
  return arr;
}

function blocksToApi(blocks) {
  return (blocks || [])
    .map((b) => {
      if (!b || typeof b !== "object") return null;
      const t = String(b.type || "").toLowerCase();
      if (t === "paragraph") {
        const text = String(b.text ?? "").trim();
        if (!text) return null;
        return { type: "paragraph", text };
      }
      if (t === "image") {
        const url = String(b.url ?? "").trim();
        if (!/^https:\/\//i.test(url)) return null;
        return { type: "image", url };
      }
      if (t === "link") {
        const url = String(b.url ?? "").trim();
        const label = String(b.label ?? "").trim();
        if (!/^https:\/\//i.test(url)) return null;
        return { type: "link", url, label: label || url };
      }
      return null;
    })
    .filter(Boolean);
}

function blocksFromApi(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((b) => {
    const t = String(b?.type || "").toLowerCase();
    const base = { clientId: newClientId() };
    if (t === "paragraph") {
      return { ...base, type: "paragraph", text: String(b.text ?? "") };
    }
    if (t === "image") {
      return { ...base, type: "image", url: String(b.url ?? "") };
    }
    if (t === "link") {
      return {
        ...base,
        type: "link",
        url: String(b.url ?? ""),
        label: String(b.label ?? "")
      };
    }
    return { ...base, type: "paragraph", text: "" };
  });
}

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("อ่านรูปไม่ได้"));
    img.src = objectUrl;
  });
}

const JPEG_FLAT_BG = "#f8fafc";

async function compressToJpeg(file) {
  const img = await loadImage(file);
  const maxSide = 1920;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = JPEG_FLAT_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("บีบอัดไม่สำเร็จ"))),
      "image/jpeg",
      0.85
    );
  });
}

function isProbablyPng(file) {
  return (
    (file.type && String(file.type).toLowerCase() === "image/png") ||
    /\.png$/i.test(file.name || "")
  );
}

async function uploadPostImage(file) {
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  if (isProbablyPng(file)) {
    body.append(
      "image",
      file,
      file.name && /\.png$/i.test(file.name) ? file.name : `upload-${Date.now()}.png`
    );
  } else {
    const blob = await compressToJpeg(file);
    body.append(
      "image",
      new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" })
    );
  }
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
  return data.publicUrl;
}

function PostBodyBlocks({ blocks, expanded, className }) {
  const list = Array.isArray(blocks) ? blocks : [];
  const wrapCls = expanded ? "space-y-3" : "space-y-2 max-h-[7.5rem] overflow-hidden";
  return (
    <div className={`text-sm leading-relaxed text-gray-700 ${wrapCls} ${className || ""}`}>
      {list.map((b, i) => {
        const t = String(b?.type || "").toLowerCase();
        if (t === "paragraph") {
          return (
            <p key={i} className="whitespace-pre-wrap break-words">
              {String(b.text ?? "")}
            </p>
          );
        }
        if (t === "image") {
          const url = String(b.url || "").trim();
          if (!/^https:\/\//i.test(url)) return null;
          return (
            <div key={i} className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="max-h-64 w-full object-contain" />
            </div>
          );
        }
        if (t === "link") {
          const url = String(b.url || "").trim();
          const label = String(b.label || url || "ลิงก์").trim();
          if (!/^https:\/\//i.test(url)) return null;
          return (
            <p key={i}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-rose-700 underline decoration-rose-400/50 hover:text-rose-900"
              >
                {label}
              </a>
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

function needsExpand(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  let len = 0;
  for (const b of list) {
    const t = String(b?.type || "").toLowerCase();
    if (t === "paragraph") len += String(b.text || "").length;
    if (t === "image" || t === "link") len += 80;
  }
  return len > 220 || list.some((b) => String(b?.type || "").toLowerCase() === "image");
}

function MemberPublicPostCard({ post, isOwner, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const layout = post.layout === "stack" ? "stack" : "row";
  const cover = String(post.coverImageUrl || "").trim();
  const title = String(post.title || "").trim();
  const showExpand = needsExpand(post.bodyBlocks);

  const media = cover ? (
    <div
      className={
        layout === "stack"
          ? "aspect-[16/10] w-full overflow-hidden bg-gray-100"
          : "h-44 w-full shrink-0 overflow-hidden bg-gray-100 md:h-full md:min-h-[11rem] md:w-44 md:max-w-[44%]"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="h-full w-full object-cover" />
    </div>
  ) : (
    <div
      className={
        layout === "stack"
          ? "flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-rose-100 to-indigo-100 text-gray-400"
          : "flex h-44 w-full shrink-0 items-center justify-center bg-gradient-to-br from-rose-100 to-indigo-100 text-gray-400 md:h-auto md:min-h-[11rem] md:w-44"
      }
    >
      <span className="text-xs font-medium">ไม่มีรูปหัวข้อ</span>
    </div>
  );

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-snug text-gray-900">{title}</h3>
        {isOwner ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(post)}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200"
            >
              แก้ไข
            </button>
            <button
              type="button"
              onClick={() => onDelete(post)}
              className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              ลบ
            </button>
          </div>
        ) : null}
      </div>
      {post.bodyBlocks && post.bodyBlocks.length > 0 ? (
        <>
          <PostBodyBlocks blocks={post.bodyBlocks} expanded={expanded} />
          {showExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="self-start text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              {expanded ? "ย่อ" : "ขยาย"}
            </button>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-gray-400">ไม่มีคำอธิบาย</p>
      )}
      {isOwner ? (
        <p className="text-[11px] text-gray-400">
          ลำดับแสดง: {Number(post.sortOrder) || 0} ·{" "}
          {layout === "stack" ? "แบบซ้อน (2 การ์ด/แถว)" : "แบบแถว (1 การ์ด/แถว)"}
        </p>
      ) : null}
    </div>
  );

  if (layout === "stack") {
    return (
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {media}
        {body}
      </article>
    );
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:flex-row">
      {media}
      {body}
    </article>
  );
}

const defaultBlocks = () => [{ clientId: newClientId(), type: "paragraph", text: "" }];

/**
 * @param {{ username: string; initialPosts: unknown[] }} props
 */
export default function MemberPublicPostsFeed({ username, initialPosts }) {
  const router = useRouter();
  const { user } = useMemberAuth();
  const [posts, setPosts] = useState(() => sortPosts(initialPosts));
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [blocks, setBlocks] = useState(defaultBlocks);
  const [layout, setLayout] = useState("row");
  const [sortOrder, setSortOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [err, setErr] = useState("");

  const isOwner = useMemo(
    () =>
      Boolean(
        user &&
          String(user.username || "").toLowerCase() ===
            String(username || "").toLowerCase()
      ),
    [user, username]
  );

  useEffect(() => {
    setPosts(sortPosts(initialPosts));
  }, [initialPosts]);

  const resetComposer = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setCoverUrl("");
    setBlocks(defaultBlocks());
    setLayout("row");
    setSortOrder(0);
    setErr("");
  }, []);

  const onEdit = useCallback(
    (post) => {
      setEditingId(post.id);
      setTitle(String(post.title || ""));
      setCoverUrl(String(post.coverImageUrl || "").trim());
      const raw = blocksFromApi(post.bodyBlocks);
      setBlocks(raw.length ? raw : defaultBlocks());
      setLayout(post.layout === "stack" ? "stack" : "row");
      setSortOrder(Number(post.sortOrder) || 0);
      setErr("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const onDelete = useCallback(
    async (post) => {
      if (!isOwner) return;
      if (!window.confirm("ลบโพสต์นี้?")) return;
      const token = getMemberToken();
      if (!token) {
        setErr("กรุณาเข้าสู่ระบบ");
        return;
      }
      setBusy(true);
      setErr("");
      try {
        await apiDeleteMyPublicPost(token, post.id);
        setPosts((prev) => sortPosts(prev.filter((p) => p.id !== post.id)));
        if (editingId === post.id) resetComposer();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [editingId, isOwner, resetComposer, router]
  );

  const updateBlock = useCallback((clientId, patch) => {
    setBlocks((prev) =>
      prev.map((b) => (b.clientId === clientId ? { ...b, ...patch } : b))
    );
  }, []);

  const removeBlock = useCallback((clientId) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.clientId !== clientId);
      return next.length ? next : defaultBlocks();
    });
  }, []);

  const addBlock = useCallback((type) => {
    const base = { clientId: newClientId() };
    if (type === "paragraph") {
      setBlocks((prev) => [...prev, { ...base, type: "paragraph", text: "" }]);
    } else if (type === "image") {
      setBlocks((prev) => [...prev, { ...base, type: "image", url: "" }]);
    } else {
      setBlocks((prev) => [
        ...prev,
        { ...base, type: "link", url: "", label: "" }
      ]);
    }
  }, []);

  const moveBlock = useCallback((clientId, dir) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.clientId === clientId);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const onPickCover = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isOwner) return;
    setUploadBusy(true);
    setErr("");
    try {
      const url = await uploadPostImage(file);
      setCoverUrl(url);
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setUploadBusy(false);
    }
  }, [isOwner]);

  const onPickBlockImage = useCallback(
    async (clientId, e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !isOwner) return;
      setUploadBusy(true);
      setErr("");
      try {
        const url = await uploadPostImage(file);
        updateBlock(clientId, { url });
      } catch (ce) {
        setErr(ce instanceof Error ? ce.message : String(ce));
      } finally {
        setUploadBusy(false);
      }
    },
    [isOwner, updateBlock]
  );

  const submit = useCallback(async () => {
    if (!isOwner) return;
    const token = getMemberToken();
    if (!token) {
      setErr("กรุณาเข้าสู่ระบบ");
      return;
    }
    const apiBlocks = blocksToApi(blocks);
    if (!String(title || "").trim()) {
      setErr("กรุณากรอกหัวข้อ");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const payload = {
        title: String(title).trim(),
        coverImageUrl: String(coverUrl || "").trim() || null,
        bodyBlocks: apiBlocks,
        layout: layout === "stack" ? "stack" : "row",
        sortOrder: Math.max(0, Math.floor(Number(sortOrder) || 0))
      };
      if (editingId) {
        const { post } = await apiPatchMyPublicPost(token, editingId, payload);
        setPosts((prev) => sortPosts(prev.map((p) => (p.id === post.id ? post : p))));
        resetComposer();
      } else {
        const { post } = await apiCreateMyPublicPost(token, payload);
        setPosts((prev) => sortPosts([...prev.filter((p) => p.id !== post.id), post]));
        resetComposer();
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    blocks,
    coverUrl,
    editingId,
    isOwner,
    layout,
    resetComposer,
    router,
    sortOrder,
    title
  ]);

  return (
    <div className="space-y-4">
      {isOwner ? (
        <section className="rounded-xl border border-rose-200/80 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-gray-900">
            {editingId ? "แก้ไขโพสต์" : "สร้างโพสต์ใหม่"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            หัวข้อ + รูปปก · คำอธิบายประกอบด้วยย่อหน้า รูป (HTTPS) และลิงก์ข้อความ · เลือกแบบการ์ดและลำดับแสดง
          </p>
          {err ? (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              รูปหัวข้อ (ปกโพสต์)
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*" className="max-w-full text-sm" onChange={onPickCover} disabled={uploadBusy || busy} />
                {uploadBusy ? <span className="text-xs text-gray-500">กำลังอัปโหลด…</span> : null}
                {coverUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="" className="h-16 w-24 rounded object-cover" />
                    <button
                      type="button"
                      className="text-xs text-gray-600 underline"
                      onClick={() => setCoverUrl("")}
                    >
                      เอารูปออก
                    </button>
                  </>
                ) : null}
              </div>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              ชื่อหัวข้อ
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="หัวข้อโพสต์"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-gray-600">คำอธิบาย</legend>
              {blocks.map((b, idx) => (
                <div
                  key={b.clientId}
                  className="rounded-lg border border-gray-100 bg-gray-50/80 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase text-gray-500">
                      {b.type === "paragraph"
                        ? "ย่อหน้า"
                        : b.type === "image"
                          ? "รูป"
                          : "ลิงก์"}
                    </span>
                    <button
                      type="button"
                      className="text-[11px] text-gray-600 hover:text-gray-900"
                      onClick={() => moveBlock(b.clientId, -1)}
                      disabled={idx === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-gray-600 hover:text-gray-900"
                      onClick={() => moveBlock(b.clientId, 1)}
                      disabled={idx >= blocks.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-red-600 hover:text-red-800"
                      onClick={() => removeBlock(b.clientId)}
                    >
                      ลบบล็อก
                    </button>
                  </div>
                  {b.type === "paragraph" ? (
                    <textarea
                      className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                      rows={4}
                      value={b.text}
                      onChange={(e) => updateBlock(b.clientId, { text: e.target.value })}
                      placeholder="ข้อความ…"
                    />
                  ) : b.type === "image" ? (
                    <div className="space-y-2">
                      <input
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                        value={b.url}
                        onChange={(e) => updateBlock(b.clientId, { url: e.target.value })}
                        placeholder="https://… (URL รูป)"
                      />
                      <div>
                        <span className="text-[11px] text-gray-500">หรืออัปโหลด: </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs"
                          onChange={(e) => onPickBlockImage(b.clientId, e)}
                          disabled={uploadBusy || busy}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                        value={b.label}
                        onChange={(e) => updateBlock(b.clientId, { label: e.target.value })}
                        placeholder="ข้อความลิงก์"
                      />
                      <input
                        className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                        value={b.url}
                        onChange={(e) => updateBlock(b.clientId, { url: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => addBlock("paragraph")}
                >
                  + ย่อหน้า
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => addBlock("image")}
                >
                  + รูป
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => addBlock("link")}
                >
                  + ลิงก์
                </button>
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600">
                รูปแบบการ์ด
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                >
                  <option value="row">แบบแถว — รูปซ้าย ข้อความขวา (1 การ์ดต่อแถว)</option>
                  <option value="stack">แบบซ้อน — รูปบน ข้อความล่าง (2 การ์ดต่อแถวบนจอใหญ่)</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-600">
                ลำดับแสดง (เลขน้อยขึ้นก่อน)
                <input
                  type="number"
                  min={0}
                  max={999999}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy || uploadBusy}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? "กำลังบันทึก…" : editingId ? "บันทึกการแก้ไข" : "โพสต์"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetComposer}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  ยกเลิกการแก้ไข
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {posts.length === 0 ? (
        <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">ยังไม่มีโพสต์</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {isOwner
              ? "สร้างโพสต์แรกด้านบน — ผู้เยี่ยมชมจะเห็นการ์ดที่นี่"
              : "สมาชิกยังไม่ได้เพิ่มโพสต์บนเพจนี้"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className={p.layout === "stack" ? "" : "md:col-span-2"}
            >
              <MemberPublicPostCard
                post={p}
                isOwner={isOwner}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
