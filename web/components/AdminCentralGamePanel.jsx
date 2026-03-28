"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCentralGameActivate,
  apiAdminCentralGameCreate,
  apiAdminCentralGameDeactivate,
  apiAdminCentralGameDelete,
  apiAdminCentralGameDetail,
  apiAdminCentralGamePatch,
  apiAdminCentralGamePutImages,
  apiAdminCentralGamePutRules,
  apiAdminCentralGamesList
} from "../lib/rolesApi";

const UNITS = ["บาท", "ดอลลาร์ (USD)", "อัน", "ใบ", "กล่อง", "ชิ้น"];

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

async function compressToJpeg(file) {
  const img = await loadImage(file);
  const maxSide = 1200;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("บีบอัดไม่สำเร็จ"))),
      "image/jpeg",
      0.85
    );
  });
}

async function uploadImageFile(file) {
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  const blob = await compressToJpeg(file);
  body.append("image", new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" }));
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
  return data.publicUrl;
}

const emptyRule = () => ({
  setIndex: 0,
  needCount: 1,
  prizeCategory: "cash",
  prizeTitle: "",
  prizeValueText: "",
  prizeUnit: "บาท",
  sortOrder: 0,
  description: ""
});

export default function AdminCentralGamePanel() {
  const [games, setGames] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [title, setTitle] = useState("");
  const [setCount, setSetCount] = useState(5);
  const [imagesPerSet, setImagesPerSet] = useState(4);
  const [pinkHeartCost, setPinkHeartCost] = useState(0);
  const [redHeartCost, setRedHeartCost] = useState(0);

  const [imageMap, setImageMap] = useState({});
  const [rules, setRules] = useState([emptyRule()]);

  const [newTitle, setNewTitle] = useState("เกมส่วนกลาง");
  const [newSets, setNewSets] = useState(5);
  const [newPerSet, setNewPerSet] = useState(4);
  const [newPinkHeart, setNewPinkHeart] = useState(0);
  const [newRedHeart, setNewRedHeart] = useState(0);

  const tileCount = setCount * imagesPerSet;
  const expectedSlots = useMemo(() => setCount * imagesPerSet, [setCount, imagesPerSet]);

  const loadList = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setErr("");
    try {
      const data = await apiAdminCentralGamesList(token);
      setGames(data.games || []);
    } catch (e) {
      setErr(e.message || String(e));
      setGames([]);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    const token = getMemberToken();
    if (!token) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const data = await apiAdminCentralGameDetail(token, id);
      const g = data.game;
      if (!g) {
        setErr("ไม่ได้รับข้อมูลเกมจากเซิร์ฟเวอร์");
        return;
      }
      setTitle(g.title);
      setSetCount(g.setCount);
      setImagesPerSet(g.imagesPerSet);
      setPinkHeartCost(
        typeof g.pinkHeartCost === "number" ? g.pinkHeartCost : g.heartCost ?? 0
      );
      setRedHeartCost(typeof g.redHeartCost === "number" ? g.redHeartCost : 0);
      const map = {};
      for (const im of data.images || []) {
        map[`${im.setIndex}-${im.imageIndex}`] = im.imageUrl;
      }
      setImageMap(map);
      setRules(
        (data.rules || []).length
          ? data.rules.map((r) => ({
              setIndex: r.setIndex,
              needCount: r.needCount,
              prizeCategory: r.prizeCategory,
              prizeTitle: r.prizeTitle || "",
              prizeValueText: r.prizeValueText || "",
              prizeUnit: r.prizeUnit || "",
              sortOrder: r.sortOrder,
              description: r.description || ""
            }))
          : [emptyRule()]
      );
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function createGame(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setMsg("");
    try {
      const data = await apiAdminCentralGameCreate(token, {
        title: newTitle,
        setCount: newSets,
        imagesPerSet: newPerSet,
        tileCount: newSets * newPerSet,
        pinkHeartCost: newPinkHeart,
        redHeartCost: newRedHeart
      });
      setMsg("สร้างเกมแล้ว — เลือกจากรายการแล้วอัปโหลดรูป + กติกา");
      await loadList();
      if (data.snapshot?.game?.id) setSelectedId(data.snapshot.game.id);
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function saveMeta(e) {
    e.preventDefault();
    if (!selectedId) return;
    const token = getMemberToken();
    setMsg("");
    try {
      await apiAdminCentralGamePatch(token, selectedId, {
        title,
        setCount,
        imagesPerSet,
        tileCount: setCount * imagesPerSet,
        pinkHeartCost,
        redHeartCost
      });
      setMsg("บันทึกโครงเกมแล้ว");
      await loadList();
      await loadDetail(selectedId);
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function saveImages() {
    if (!selectedId) return;
    const token = getMemberToken();
    const images = [];
    for (let s = 0; s < setCount; s += 1) {
      for (let i = 0; i < imagesPerSet; i += 1) {
        const url = imageMap[`${s}-${i}`];
        if (!url) {
          setMsg(`ยังไม่มีรูปชุด ${s + 1} ภาพ ${i + 1}`);
          return;
        }
        images.push({ setIndex: s, imageIndex: i, imageUrl: url });
      }
    }
    setMsg("");
    try {
      await apiAdminCentralGamePutImages(token, selectedId, images);
      setMsg("บันทึกรูปครบทุกช่องแล้ว");
      await loadDetail(selectedId);
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function saveRules() {
    if (!selectedId) return;
    const token = getMemberToken();
    const payload = rules.map((r, idx) => ({
      setIndex: Math.floor(Number(r.setIndex)),
      needCount: Math.floor(Number(r.needCount)),
      prizeCategory: r.prizeCategory,
      prizeTitle: r.prizeTitle,
      prizeValueText: r.prizeValueText,
      prizeUnit: r.prizeUnit,
      sortOrder: r.sortOrder != null ? Number(r.sortOrder) : idx,
      description: r.description
    }));
    setMsg("");
    try {
      await apiAdminCentralGamePutRules(token, selectedId, payload);
      setMsg("บันทึกกติการางวัลแล้ว");
      await loadDetail(selectedId);
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function activate() {
    if (!selectedId) return;
    const token = getMemberToken();
    setMsg("");
    try {
      await apiAdminCentralGameActivate(token, selectedId);
      setMsg("เปิดใช้เกมนี้เป็นส่วนกลางแล้ว — หน้า /game จะใช้ชุดนี้");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function deactivate() {
    if (!selectedId) return;
    const token = getMemberToken();
    setMsg("");
    try {
      await apiAdminCentralGameDeactivate(token, selectedId);
      setMsg("ปิดใช้เกมนี้แล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function removeGame() {
    if (!selectedId || !window.confirm("ลบเกมนี้ถาวร?")) return;
    const token = getMemberToken();
    setMsg("");
    try {
      await apiAdminCentralGameDelete(token, selectedId);
      setSelectedId("");
      setMsg("ลบแล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function onPickImage(setIndex, imageIndex, file) {
    if (!file) return;
    setMsg("กำลังอัปโหลด…");
    try {
      const url = await uploadImageFile(file);
      setImageMap((m) => ({ ...m, [`${setIndex}-${imageIndex}`]: url }));
      setMsg("อัปโหลดรูปแล้ว — กดบันทึกรูปทั้งหมดเมื่อครบ");
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  function updateRule(i, field, value) {
    setRules((prev) =>
      prev.map((r, j) => (j === i ? { ...r, [field]: value } : r))
    );
  }

  return (
    <section className="space-y-8 text-sm">
      <p className="text-slate-600">
        กำหนดจำนวนป้าย = จำนวนชุด × ภาพต่อชุด · อัปโหลดรูปแต่ละช่อง · กติกาเรียงตามลำดับ — ระบบจะตรวจกติกาแรกที่เข้าเงื่อนไข (ชุดใดเปิดครบกี่ป้าย)
        ที่มีรางวัลจริง) เป็นการจบรอบ
      </p>
      {err ? <p className="text-red-600">{err}</p> : null}
      {msg ? (
        <p className={msg.includes("แล้ว") ? "text-green-700" : "text-amber-800"}>{msg}</p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">สร้างเกมใหม่</h3>
        <form onSubmit={createGame} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-600">ชื่อเกม</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">จำนวนชุดภาพ</label>
            <input
              type="number"
              min={1}
              value={newSets}
              onChange={(e) => setNewSets(parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">ภาพต่อชุด</label>
            <input
              type="number"
              min={1}
              value={newPerSet}
              onChange={(e) => setNewPerSet(parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">ป้ายรวม (คำนวณอัตโนมัติ)</label>
            <p className="mt-2 font-mono text-slate-800">{newSets * newPerSet}</p>
          </div>
          <div>
            <label className="text-xs text-slate-600">หักหัวใจชมพูต่อรอบ</label>
            <input
              type="number"
              min={0}
              value={newPinkHeart}
              onChange={(e) => setNewPinkHeart(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">หักหัวใจแดงต่อรอบ</label>
            <input
              type="number"
              min={0}
              value={newRedHeart}
              onChange={(e) => setNewRedHeart(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white hover:bg-brand-900"
            >
              สร้างเกม
            </button>
          </div>
        </form>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">เลือกเกมแก้ไข</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">— เลือก —</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title} {g.isActive ? "(กำลังใช้)" : ""} · {g.tileCount} ป้าย · ชมพู{" "}
              {g.pinkHeartCost ?? 0} แดง {g.redHeartCost ?? 0}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => loadList()}
          className="ml-2 mt-2 rounded border border-slate-300 px-2 py-1 text-xs"
        >
          รีเฟรชรายการ
        </button>
      </div>

      {selectedId ? (
        <div className="space-y-6">
          {loading ? <p className="text-slate-500">กำลังโหลด…</p> : null}

          <form onSubmit={saveMeta} className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="font-semibold">โครงเกม</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">ชื่อ</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">จำนวนชุด</label>
                <input
                  type="number"
                  min={1}
                  value={setCount}
                  onChange={(e) => setSetCount(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">ภาพต่อชุด</label>
                <input
                  type="number"
                  min={1}
                  value={imagesPerSet}
                  onChange={(e) => setImagesPerSet(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">ป้ายรวม</label>
                <p className="mt-2 font-mono">{tileCount}</p>
              </div>
              <div>
                <label className="text-xs text-slate-600">หักหัวใจชมพูต่อรอบ</label>
                <input
                  type="number"
                  min={0}
                  value={pinkHeartCost}
                  onChange={(e) => setPinkHeartCost(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">หักหัวใจแดงต่อรอบ</label>
                <input
                  type="number"
                  min={0}
                  value={redHeartCost}
                  onChange={(e) => setRedHeartCost(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
            <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-white">
              บันทึกโครง
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold">อัปโหลดภาพแต่ละชุด</h3>
            <p className="mt-1 text-xs text-slate-500">
              ชุด {setCount} × ภาพ {imagesPerSet} = {expectedSlots} ช่อง
            </p>
            <div className="mt-4 space-y-6">
              {Array.from({ length: setCount }, (_, s) => (
                <div key={s} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-700">ชุดที่ {s + 1}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {Array.from({ length: imagesPerSet }, (_, i) => (
                      <div key={i} className="w-28 shrink-0">
                        <p className="text-[10px] text-slate-500">ภาพ {i + 1}</p>
                        <div className="mt-1 aspect-square overflow-hidden rounded-lg border bg-slate-100">
                          {imageMap[`${s}-${i}`] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageMap[`${s}-${i}`]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 w-full text-[10px]"
                          onChange={(e) =>
                            onPickImage(s, i, e.target.files?.[0] || null)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => saveImages()}
              className="mt-4 rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white"
            >
              บันทึกรูปทั้งหมด ({expectedSlots} ช่อง)
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">กติการางวัล (เรียงลำดับการตรวจ)</h3>
              <button
                type="button"
                onClick={() => setRules((r) => [...r, emptyRule()])}
                className="text-xs text-brand-800 underline"
              >
                + แถว
              </button>
            </div>
            <div className="mt-3 space-y-4 overflow-x-auto">
              {rules.map((r, idx) => (
                <div
                  key={idx}
                  className="grid min-w-[640px] gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500">ลำดับ</label>
                    <input
                      type="number"
                      value={r.sortOrder}
                      onChange={(e) => updateRule(idx, "sortOrder", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500">ชุด (0=1)</label>
                    <input
                      type="number"
                      min={0}
                      max={setCount - 1}
                      value={r.setIndex}
                      onChange={(e) => updateRule(idx, "setIndex", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500">ต้องเปิดครบ</label>
                    <input
                      type="number"
                      min={1}
                      max={imagesPerSet}
                      value={r.needCount}
                      onChange={(e) => updateRule(idx, "needCount", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500">หมวดรางวัล</label>
                    <select
                      value={r.prizeCategory}
                      onChange={(e) => updateRule(idx, "prizeCategory", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    >
                      <option value="cash">เงินสด</option>
                      <option value="item">สิ่งของ</option>
                      <option value="voucher">บัตรกำนัล</option>
                      <option value="none">ไม่มีรางวัล</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500">หัวข้อรางวัล</label>
                    <input
                      value={r.prizeTitle}
                      onChange={(e) => updateRule(idx, "prizeTitle", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                      placeholder="เช่น รางวัลที่ 1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500">รายละเอียด (เช่น 1000)</label>
                    <input
                      value={r.prizeValueText}
                      onChange={(e) => updateRule(idx, "prizeValueText", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500">หน่วย</label>
                    <input
                      list={`units-${idx}`}
                      value={r.prizeUnit}
                      onChange={(e) => updateRule(idx, "prizeUnit", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                    <datalist id={`units-${idx}`}>
                      {UNITS.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-12">
                    <label className="text-[10px] text-slate-500">หมายเหตุ</label>
                    <input
                      value={r.description}
                      onChange={(e) => updateRule(idx, "description", e.target.value)}
                      className="mt-1 w-full rounded border px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <button
                      type="button"
                      onClick={() => setRules((prev) => prev.filter((_, j) => j !== idx))}
                      className="text-xs text-red-700 underline"
                    >
                      ลบแถว
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => saveRules()}
              className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white"
            >
              บันทึกกติกา
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => activate()}
              className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"
            >
              เปิดใช้เกมนี้ (ส่วนกลาง)
            </button>
            <button
              type="button"
              onClick={() => deactivate()}
              className="rounded-lg border border-slate-400 px-4 py-2"
            >
              ปิดใช้เกมนี้
            </button>
            <button
              type="button"
              onClick={() => removeGame()}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-900"
            >
              ลบเกม
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
