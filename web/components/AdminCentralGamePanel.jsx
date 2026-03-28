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

const UNITS = ["บาท", "ชิ้น", "อัน", "คัน", "ใบ", "หลัง"];

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

function resizeSetSizes(prev, n, fill) {
  const out = prev.slice(0, n).map((x) => Math.max(1, parseInt(String(x), 10) || 1));
  const f = Math.max(1, parseInt(String(fill), 10) || 1);
  while (out.length < n) out.push(out[out.length - 1] ?? f);
  return out;
}

export default function AdminCentralGamePanel() {
  const [games, setGames] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [title, setTitle] = useState("");
  const [setCount, setSetCount] = useState(5);
  const [setSizes, setSetSizes] = useState([4, 4, 4, 4, 4]);
  const [pinkHeartCost, setPinkHeartCost] = useState(0);
  const [redHeartCost, setRedHeartCost] = useState(0);

  const [imageMap, setImageMap] = useState({});
  const [rules, setRules] = useState([emptyRule()]);

  const [newTitle, setNewTitle] = useState("เกมส่วนกลาง");
  const [newSets, setNewSets] = useState(5);
  const [newSetSizes, setNewSetSizes] = useState([4, 4, 4, 4, 4]);
  const [newPinkHeart, setNewPinkHeart] = useState(0);
  const [newRedHeart, setNewRedHeart] = useState(0);

  const tileCount = useMemo(
    () => setSizes.reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0),
    [setSizes]
  );
  const newTileCount = useMemo(
    () => newSetSizes.reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0),
    [newSetSizes]
  );
  const expectedSlots = tileCount;

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
      const sc = Math.max(1, g.setCount || 1);
      const fromApi = Array.isArray(g.setImageCounts) ? g.setImageCounts : null;
      if (fromApi && fromApi.length) {
        setSetSizes(
          resizeSetSizes(
            fromApi.map((x) => Math.max(1, parseInt(String(x), 10) || 1)),
            sc,
            g.imagesPerSet || 4
          )
        );
      } else {
        setSetSizes(Array(sc).fill(Math.max(1, g.imagesPerSet || 4)));
      }
      setPinkHeartCost(
        typeof g.pinkHeartCost === "number" ? g.pinkHeartCost : g.heartCost ?? 0
      );
      setRedHeartCost(typeof g.redHeartCost === "number" ? g.redHeartCost : 0);
      const map = {};
      for (const im of data.images || []) {
        const k0 = `${im.setIndex}-0`;
        if (map[k0] === undefined) map[k0] = im.imageUrl;
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
              prizeUnit: UNITS.includes(r.prizeUnit) ? r.prizeUnit : UNITS[0],
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
      const counts = newSetSizes
        .slice(0, newSets)
        .map((x) => Math.max(1, parseInt(String(x), 10) || 1));
      const data = await apiAdminCentralGameCreate(token, {
        title: newTitle,
        setCount: newSets,
        setImageCounts: counts,
        tileCount: counts.reduce((a, b) => a + b, 0),
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
      const counts = setSizes
        .slice(0, setCount)
        .map((x) => Math.max(1, parseInt(String(x), 10) || 1));
      await apiAdminCentralGamePatch(token, selectedId, {
        title,
        setCount,
        setImageCounts: counts,
        tileCount: counts.reduce((a, b) => a + b, 0),
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
      const url = imageMap[`${s}-0`];
      if (!url) {
        setMsg(`ยังไม่มีรูปสำหรับชุด ${s + 1}`);
        return;
      }
      images.push({ setIndex: s, imageUrl: url });
    }
    setMsg("");
    try {
      await apiAdminCentralGamePutImages(token, selectedId, images, { oneImagePerSet: true });
      setMsg("บันทึกรูปแล้ว (ชุดละ 1 ไฟล์ — ระบบคัดลอกไปทุกป้ายในชุด)");
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
        <strong>โครงกระดาน:</strong> กำหนดกี่ชุด และ<strong>แต่ละชุดมีกี่ภาพไม่จำเป็นต้องเท่ากัน</strong> (เช่น ชุด 1 มี 7 ภาพ ชุด 2 มี 5 ภาพ) — จำนวนป้ายรวม = ผลรวมภาพทุกชุด
        · <strong>รูป:</strong> อัปโหลด<strong>ชุดละ 1 ไฟล์</strong> (ป้ายทุกใบในชุดเดียวกันใช้รูปเดียวกัน) · <strong>กติการางวัล:</strong> เรียงลำดับการตรวจ — ระบบใช้กติกาแรกที่เข้าเงื่อนไขและมีรางวัลจริงเพื่อจบรอบ
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
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-600">จำนวนชุดภาพ</label>
            <input
              type="number"
              min={1}
              value={newSets}
              onChange={(e) => {
                const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                setNewSets(n);
                setNewSetSizes((prev) => resizeSetSizes(prev, n, prev[prev.length - 1] || 4));
              }}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-700">จำนวนภาพในแต่ละชุด (ไม่ต้องเท่ากัน)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {newSetSizes.slice(0, newSets).map((n, idx) => (
                <div key={idx}>
                  <label className="text-[10px] text-slate-500">ชุดที่ {idx + 1}</label>
                  <input
                    type="number"
                    min={1}
                    value={n}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setNewSetSizes((prev) => {
                        const next = [...prev];
                        next[idx] = v;
                        return next;
                      });
                    }}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-600">ป้ายรวม (ผลรวมทุกชุด)</label>
            <p className="mt-2 font-mono text-slate-800">{newTileCount}</p>
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

      {games.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">เกม</th>
                <th className="px-3 py-2">ป้าย</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2 text-right">การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{g.title}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">{g.tileCount}</td>
                  <td className="px-3 py-2">
                    {g.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        กำลังใช้
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">ไม่ได้ใช้</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditGame(g.id)}
                      className="mr-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGameById(g.id, g.title)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedId ? (
        <div id="central-game-editor" className="space-y-6 scroll-mt-24">
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
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">จำนวนชุด</label>
                <input
                  type="number"
                  min={1}
                  value={setCount}
                  onChange={(e) => {
                    const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setSetCount(n);
                    setSetSizes((prev) => resizeSetSizes(prev, n, prev[prev.length - 1] || 4));
                  }}
                  className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-xs font-medium text-slate-700">ภาพต่อชุด (แต่ละชุดตั้งค่าแยก)</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {setSizes.slice(0, setCount).map((n, idx) => (
                    <div key={idx}>
                      <label className="text-[10px] text-slate-500">ชุดที่ {idx + 1}</label>
                      <input
                        type="number"
                        min={1}
                        value={n}
                        onChange={(e) => {
                          const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setSetSizes((prev) => {
                            const next = [...prev];
                            next[idx] = v;
                            return next;
                          });
                        }}
                        className="mt-0.5 w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-amber-800">
                  ถ้าเปลี่ยนจำนวนภาพในชุด ให้ตรวจรูปและกติกาใหม่ แล้วบันทึกโครง → บันทึกรูป → บันทึกกติกา
                </p>
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
            <h3 className="font-semibold">อัปโหลดรูปแต่ละชุด</h3>
            <p className="mt-1 text-xs text-slate-500">
              <strong>ชุดละ 1 ไฟล์</strong> — รวม {expectedSlots} ป้ายบนกระดาน · ป้ายทุกใบในชุดเดียวกันใช้รูปเดียวกัน
            </p>
            <div className="mt-4 space-y-4">
              {Array.from({ length: setCount }, (_, s) => {
                const cap = Math.max(1, parseInt(String(setSizes[s]), 10) || 1);
                return (
                  <div key={s} className="flex flex-wrap items-start gap-4 rounded-lg border border-slate-100 p-3">
                    <div className="w-36 shrink-0">
                      <p className="text-xs font-semibold text-slate-800">
                        ชุดที่ {s + 1}
                      </p>
                      <p className="text-[10px] text-slate-500">{cap} ป้ายบนกระดาน (รูปเดียวกัน)</p>
                      <div className="mt-2 aspect-square w-full overflow-hidden rounded-lg border bg-slate-100">
                        {imageMap[`${s}-0`] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageMap[`${s}-0`]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <label className="text-[10px] font-medium text-slate-600">เลือกไฟล์รูปชุดนี้</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1 block w-full text-xs"
                        onChange={(e) => onPickSetImage(s, e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => saveImages()}
              className="mt-4 rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white"
            >
              บันทึกรูปแต่ละชุด ({setCount} ไฟล์)
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">กำหนดรางวัล (กติกา)</h3>
                <p className="mt-1 text-xs text-slate-500">
                  เรียงจากบนลงล่าง = ลำดับที่ระบบตรวจ · &quot;ต้องเปิดครบ&quot; ไม่เกินจำนวนป้ายในชุดนั้น · เลขชุด 0 = ชุดที่ 1
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRules((r) => [...r, emptyRule()])}
                className="text-xs text-brand-800 underline"
              >
                + แถวกติกา
              </button>
            </div>
            <div className="mt-3 space-y-4 overflow-x-auto">
              {rules.map((r, idx) => {
                const si = Math.min(
                  setCount - 1,
                  Math.max(0, Math.floor(Number(r.setIndex)) || 0)
                );
                const cap = Math.max(
                  1,
                  parseInt(String(setSizes[si] ?? setSizes[0]), 10) || 1
                );
                return (
                <div
                  key={idx}
                  className="grid min-w-[640px] gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500">ลำดับตรวจ</label>
                    <input
                      type="number"
                      value={r.sortOrder}
                      onChange={(e) => updateRule(idx, "sortOrder", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500">ชุด (0=ชุด1)</label>
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, setCount - 1)}
                      value={r.setIndex}
                      onChange={(e) => updateRule(idx, "setIndex", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500">เปิดครบ (สูงสุด {cap})</label>
                    <input
                      type="number"
                      min={1}
                      max={cap}
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
                    <select
                      value={UNITS.includes(r.prizeUnit) ? r.prizeUnit : UNITS[0]}
                      onChange={(e) => updateRule(idx, "prizeUnit", e.target.value)}
                      className="mt-1 w-full rounded border px-1 py-1 text-xs"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
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
              );
              })}
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
