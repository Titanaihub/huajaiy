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
  description: "",
  prizeTotalQty: 1
});

function emptyRuleForSet(setIdx) {
  return { ...emptyRule(), setIndex: setIdx };
}

function resizeSetSizes(prev, n, fill) {
  const out = prev.slice(0, n).map((x) => Math.max(1, parseInt(String(x), 10) || 1));
  const f = Math.max(1, parseInt(String(fill), 10) || 1);
  while (out.length < n) out.push(out[out.length - 1] ?? f);
  return out;
}

/** แถวกติกา — ใช้ทั้งแบบผูกชุด (ไม่โชว์เลขชุด) และแบมแก้ชุดเอง */
function RuleEditorRow({
  r,
  idx,
  needCap,
  showSetPicker,
  setCount,
  setSizes,
  updateRule,
  setRules
}) {
  const si = Math.min(
    setCount - 1,
    Math.max(0, Math.floor(Number(r.setIndex)) || 0)
  );
  const cap = needCap ?? Math.max(1, parseInt(String(setSizes[si] ?? setSizes[0]), 10) || 1);
  return (
    <div className="grid w-full grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-12">
      {showSetPicker ? (
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
      ) : null}
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
      <div className="sm:col-span-1">
        <label className="text-[10px] text-slate-500">จำนวนรางวัล</label>
        {r.prizeCategory === "none" ? (
          <div
            className="mt-1 rounded border border-dashed border-slate-200 bg-slate-50 px-1 py-1.5 text-center text-[10px] leading-tight text-slate-500"
            title="หมวดไม่มีรางวัล"
          >
            ไม่จำกัด
          </div>
        ) : (
          <input
            type="number"
            min={1}
            max={999999}
            value={r.prizeTotalQty ?? 1}
            onChange={(e) =>
              updateRule(idx, "prizeTotalQty", Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="mt-1 w-full rounded border px-1 py-1 text-xs"
          />
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="text-[10px] text-slate-500">หมวดรางวัล</label>
        <select
          value={r.prizeCategory}
          onChange={(e) => {
            const v = e.target.value;
            setRules((prev) =>
              prev.map((row, j) =>
                j === idx
                  ? {
                      ...row,
                      prizeCategory: v,
                      prizeTotalQty: v === "none" ? null : (row.prizeTotalQty ?? 1)
                    }
                  : row
              )
            );
          }}
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
        <label className="text-[10px] text-slate-500">รายละเอียด</label>
        <input
          value={r.prizeValueText}
          onChange={(e) => updateRule(idx, "prizeValueText", e.target.value)}
          className="mt-1 w-full rounded border px-1 py-1 text-xs"
          placeholder="เช่น 1000"
        />
      </div>
      <div className={showSetPicker ? "sm:col-span-2" : "sm:col-span-3"}>
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
}

export default function AdminCentralGamePanel() {
  const [games, setGames] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [title, setTitle] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [setCount, setSetCount] = useState(5);
  const [setSizes, setSetSizes] = useState([4, 4, 4, 4, 4]);
  const [pinkHeartCost, setPinkHeartCost] = useState(0);
  const [redHeartCost, setRedHeartCost] = useState(0);

  const [imageMap, setImageMap] = useState({});
  const [rules, setRules] = useState([emptyRule()]);

  const [newTitle, setNewTitle] = useState("เกมส่วนกลาง");
  const [newGameDescription, setNewGameDescription] = useState("");
  const [newSets, setNewSets] = useState(5);
  const [newSetSizes, setNewSetSizes] = useState([4, 4, 4, 4, 4]);
  const [newPinkHeart, setNewPinkHeart] = useState(0);
  const [newRedHeart, setNewRedHeart] = useState(0);
  /** หลังสร้างเกมใหม่ — ชวนเผยแพร่ */
  const [publishPrompt, setPublishPrompt] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  /** เผยแพร่ / ปิดใช้ / ลบ — กันซ้ำและให้เห็นสถานะ */
  const [gameActionBusy, setGameActionBusy] = useState(false);
  /** ซ่อนฟอร์มสร้างเกม — ลดความซ้ำกับโหมดแก้ไข */
  const [createExpanded, setCreateExpanded] = useState(false);

  const tileCount = useMemo(
    () => setSizes.reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0),
    [setSizes]
  );
  const newTileCount = useMemo(
    () => newSetSizes.reduce((a, b) => a + Math.max(1, parseInt(String(b), 10) || 1), 0),
    [newSetSizes]
  );

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
      setImageMap((prev) => {
        for (const v of Object.values(prev)) {
          if (v && String(v).startsWith("blob:")) URL.revokeObjectURL(v);
        }
        return map;
      });
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
              description: r.description || "",
              prizeTotalQty:
                r.prizeCategory === "none"
                  ? null
                  : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1))
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
        description: newGameDescription,
        setCount: newSets,
        setImageCounts: counts,
        tileCount: counts.reduce((a, b) => a + b, 0),
        pinkHeartCost: newPinkHeart,
        redHeartCost: newRedHeart
      });
      const gid = data.snapshot?.game?.id;
      const gtitle = data.snapshot?.game?.title || newTitle;
      setMsg("สร้างเกมแล้ว — กดเผยแพร่ด้านล่างเมื่อพร้อม หรือตั้งรูปและกติกาก่อน");
      await loadList();
      if (gid) {
        setSelectedId(gid);
        setPublishPrompt({ id: gid, title: gtitle });
        setCreateExpanded(false);
      }
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  function rulesPayload() {
    return rules.map((r, idx) => ({
      setIndex: Math.floor(Number(r.setIndex)),
      needCount: Math.floor(Number(r.needCount)),
      prizeCategory: r.prizeCategory,
      prizeTitle: r.prizeTitle,
      prizeValueText: r.prizeValueText,
      prizeUnit: r.prizeUnit,
      sortOrder: r.sortOrder != null ? Number(r.sortOrder) : idx,
      description: r.description,
      prizeTotalQty:
        r.prizeCategory === "none"
          ? null
          : Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1))
    }));
  }

  async function persistMeta() {
    if (!selectedId) throw new Error("ยังไม่ได้เลือกเกม");
    const token = getMemberToken();
    if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
    const t = String(title || "").trim();
    if (!t) throw new Error("กรุณากรอกชื่อเกม");
    const counts = setSizes
      .slice(0, setCount)
      .map((x) => Math.max(1, parseInt(String(x), 10) || 1));
    await apiAdminCentralGamePatch(token, selectedId, {
      title: t,
      description: gameDescription,
      setCount,
      setImageCounts: counts,
      tileCount: counts.reduce((a, b) => a + b, 0),
      pinkHeartCost,
      redHeartCost
    });
  }

  function imagesReadyForSave() {
    for (let s = 0; s < setCount; s += 1) {
      const url = imageMap[`${s}-0`];
      if (!url || String(url).startsWith("blob:")) return false;
    }
    return true;
  }

  async function persistImages() {
    if (!selectedId) throw new Error("ยังไม่ได้เลือกเกม");
    const token = getMemberToken();
    if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
    const images = [];
    for (let s = 0; s < setCount; s += 1) {
      const url = imageMap[`${s}-0`];
      if (!url || String(url).startsWith("blob:")) {
        throw new Error(
          `ชุด ${s + 1}: ยังไม่มีรูปหรือกำลังอัปโหลด — รอจนเห็นรูปจากระบบแล้วค่อยบันทึกรูป`
        );
      }
      images.push({ setIndex: s, imageUrl: url });
    }
    await apiAdminCentralGamePutImages(token, selectedId, images, { oneImagePerSet: true });
  }

  async function persistRules() {
    if (!selectedId) throw new Error("ยังไม่ได้เลือกเกม");
    const token = getMemberToken();
    if (!token) throw new Error("หมดเซสชัน — ล็อกอินใหม่");
    await apiAdminCentralGamePutRules(token, selectedId, rulesPayload());
  }

  /** บันทึกโครง + รูป (ถ้าครบ) + กติกา ในครั้งเดียว — ลดปัญหากดบันทึกไม่ครบขั้น */
  async function saveAllGameData() {
    if (!selectedId || savingAll) return;
    setSavingAll(true);
    setErr("");
    setMsg("");
    const parts = [];
    try {
      await persistMeta();
      parts.push("โครง");
      if (imagesReadyForSave()) {
        await persistImages();
        parts.push("รูป");
      } else {
        parts.push("รูปยังไม่ครบ (ข้าม)");
      }
      await persistRules();
      parts.push("กติกา");
      await loadList();
      await loadDetail(selectedId);
      setMsg(`บันทึกข้อมูลแล้ว — ${parts.join(" · ")}`);
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setSavingAll(false);
    }
  }

  async function publishGameById(id) {
    if (!id) {
      setMsg("ไม่พบรหัสเกม — รีเฟรชรายการแล้วลองใหม่");
      return;
    }
    const token = getMemberToken();
    if (!token) {
      setMsg("หมดเซสชัน — ล็อกอินใหม่แล้วลองกดเผยแพร่อีกครั้ง");
      return;
    }
    setGameActionBusy(true);
    setMsg("");
    try {
      await apiAdminCentralGameActivate(token, id);
      setSelectedId(id);
      setPublishPrompt((p) => (p?.id === id ? null : p));
      setMsg("เผยแพร่แล้ว — เกมนี้แสดงที่หน้าแรก (ทางลัด) และหน้าเกม");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setGameActionBusy(false);
    }
  }

  async function activate() {
    if (!selectedId) {
      setMsg("ยังไม่ได้เลือกเกม — คลิกแถวในตาราง「รายการเกม」ก่อน แล้วค่อยกดเผยแพร่");
      return;
    }
    const token = getMemberToken();
    if (!token) {
      setMsg("หมดเซสชัน — ล็อกอินใหม่แล้วลองอีกครั้ง");
      return;
    }
    setGameActionBusy(true);
    setMsg("");
    try {
      await apiAdminCentralGameActivate(token, selectedId);
      setPublishPrompt((p) => (p?.id === selectedId ? null : p));
      setMsg("เผยแพร่แล้ว — เกมนี้แสดงที่หน้าแรกและหน้าเกม");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setGameActionBusy(false);
    }
  }

  async function deactivate() {
    if (!selectedId) {
      setMsg("ยังไม่ได้เลือกเกม — คลิกแถวในตารางก่อน");
      return;
    }
    const token = getMemberToken();
    if (!token) {
      setMsg("หมดเซสชัน — ล็อกอินใหม่");
      return;
    }
    setGameActionBusy(true);
    setMsg("");
    try {
      await apiAdminCentralGameDeactivate(token, selectedId);
      setMsg("ปิดใช้เกมนี้แล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setGameActionBusy(false);
    }
  }

  async function removeGame() {
    if (!selectedId || !window.confirm("ลบเกมนี้ถาวร?")) return;
    const token = getMemberToken();
    if (!token) {
      setMsg("หมดเซสชัน — ล็อกอินใหม่");
      return;
    }
    setGameActionBusy(true);
    setMsg("");
    try {
      await apiAdminCentralGameDelete(token, selectedId);
      setSelectedId("");
      setMsg("ลบแล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setGameActionBusy(false);
    }
  }

  function scrollToEditor() {
    window.setTimeout(() => {
      document.getElementById("central-game-editor")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 150);
  }

  function openEditGame(id) {
    if (!id) return;
    setErr("");
    setMsg("");
    setSelectedId(id);
    scrollToEditor();
  }

  async function deleteGameById(id, title) {
    if (!id || !window.confirm(`ลบเกม「${title}」ถาวร?`)) return;
    const token = getMemberToken();
    if (!token) return;
    setMsg("");
    setErr("");
    try {
      await apiAdminCentralGameDelete(token, id);
      if (selectedId === id) setSelectedId("");
      setMsg("ลบแล้ว");
      await loadList();
    } catch (e) {
      setMsg(e.message || String(e));
    }
  }

  async function onPickImage(setIndex, imageIndex, file) {
    if (!file) return;
    const slot = `${setIndex}-${imageIndex}`;
    setImageMap((m) => {
      const prev = m[slot];
      if (prev && String(prev).startsWith("blob:")) URL.revokeObjectURL(prev);
      return { ...m, [slot]: URL.createObjectURL(file) };
    });
    setMsg("กำลังอัปโหลด…");
    try {
      const url = await uploadImageFile(file);
      setImageMap((m) => {
        const cur = m[slot];
        if (cur && String(cur).startsWith("blob:")) URL.revokeObjectURL(cur);
        return { ...m, [slot]: url };
      });
      setMsg("อัปโหลดรูปแล้ว — กดบันทึกรูปเมื่อครบทุกชุด");
    } catch (e) {
      setImageMap((m) => {
        const cur = m[slot];
        if (cur && String(cur).startsWith("blob:")) URL.revokeObjectURL(cur);
        const next = { ...m };
        delete next[slot];
        return next;
      });
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
      <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-800">คำอธิบายสั้น (กดเปิด)</summary>
        <p className="mt-2 border-t border-slate-100 pt-2">
          เลือกเกมจากตาราง → แต่ละชุดตั้งป้าย รูป และกติกาในแถวเดียวกัน → กด <strong>บันทึกข้อมูล</strong> แถบล่าง →{" "}
          <strong>เผยแพร่</strong> เมื่อพร้อม
        </p>
      </details>
      {err ? <p className="text-red-600">{err}</p> : null}
      {msg ? (
        <p className={msg.includes("แล้ว") ? "text-green-700" : "text-amber-800"}>{msg}</p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <button
          type="button"
          onClick={() => setCreateExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-slate-900"
          aria-expanded={createExpanded}
        >
          <span>สร้างเกมใหม่ {createExpanded ? "▼" : "▶"}</span>
          <span className="text-xs font-normal text-slate-500">แสดงเฉพาะเมื่อต้องการสร้าง — ไม่ซ้ำกับฟอร์มแก้ไขด้านล่าง</span>
        </button>
        {createExpanded ? (
          <form onSubmit={createGame} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
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
              <label className="text-xs text-slate-600">รายละเอียด</label>
              <textarea
                value={newGameDescription}
                onChange={(e) => setNewGameDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
                placeholder="อธิบายเกมให้ผู้เล่นเห็น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
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
            <p className="sm:col-span-2 text-xs text-slate-500">
              เริ่มต้นชุดละ 4 ป้าย — หลังสร้างแล้วเลือกเกมในตารางเพื่อแก้โครงและรูป
            </p>
            <div>
              <label className="text-xs text-slate-600">ป้ายรวม</label>
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
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white hover:bg-brand-900"
              >
                สร้างเกม
              </button>
              <button
                type="button"
                onClick={() => setCreateExpanded(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                ปิด
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {publishPrompt ? (
        <div
          className="rounded-2xl border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-white p-5 shadow-md"
          role="status"
        >
          <p className="font-semibold text-slate-900">สร้างเกม「{publishPrompt.title}」แล้ว</p>
          <p className="mt-2 text-sm text-slate-600">
            กด <strong>เผยแพร่บนเว็บ</strong> เพื่อให้โผล่ในเมนูหลักและการ์ด「เกม」ที่หน้าแรก — แนะนำให้บันทึกรูปและกติกาก่อนถ้ายังไม่ครบ
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={gameActionBusy}
              aria-busy={gameActionBusy}
              onClick={() => publishGameById(publishPrompt.id)}
              className="rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              เผยแพร่บนเว็บ
            </button>
            <button
              type="button"
              onClick={() => setPublishPrompt(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              ภายหลัง
            </button>
          </div>
        </div>
      ) : null}

      {games.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <h3 className="text-sm font-semibold text-slate-800">รายการเกม — คลิกแถวเพื่อเลือกแก้ไข</h3>
            <button
              type="button"
              onClick={() => loadList()}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              รีเฟรชรายการ
            </button>
          </div>
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
                <tr
                  key={g.id}
                  className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${
                    g.id === selectedId ? "bg-brand-50/80" : ""
                  }`}
                  onClick={() => {
                    setErr("");
                    setMsg("");
                    setSelectedId(g.id);
                    scrollToEditor();
                  }}
                >
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
                  <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
        <div id="central-game-editor" className="relative space-y-4 scroll-mt-24 pb-6">
          {loading ? <p className="text-slate-500">กำลังโหลด…</p> : null}

          <p className="text-xs text-slate-600">
            แต่ละชุด = <strong>จำนวนป้าย + รูป + กติกาของชุดนั้น</strong> ในแถวเดียว · ชุดละรูปเดียวใช้ทุกป้ายในชุด · กด{" "}
            <strong>บันทึกข้อมูล</strong> แถบล่าง (โครง + กติกา + รูปเมื่อครบ)
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            noValidate
            className="rounded-xl border border-slate-200 p-4 space-y-4"
          >
            <div>
              <h3 className="font-semibold text-slate-900">โครงชุดและรูปภาพ</h3>
              <p className="mt-1 text-xs text-slate-500">
                รวม <span className="font-mono text-slate-700">{tileCount}</span> ป้าย · ตั้งกติกาในแต่ละแถวชุดด้านขวา
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">ชื่อเกม</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="ชื่อเกม"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">รายละเอียด</label>
                <textarea
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="อธิบายเกมให้ผู้เล่นเห็น (แสดงในหน้าเล่นเมื่อเผยแพร่ — ไม่บังคับ)"
                />
              </div>
              <div>
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
              <div>
                <label className="text-xs text-slate-600">ป้ายรวม (คำนวณอัตโนมัติ)</label>
                <p className="mt-2 font-mono text-sm text-slate-800">{tileCount}</p>
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

            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-700">
                แต่ละชุด — ซ้าย: ป้ายและรูป · ขวา: กติกาและรางวัลของชุดนี้ (เลื่อนแนวนอนได้ถ้าจอแคบ)
              </p>
              {Array.from({ length: setCount }, (_, s) => {
                const cap = Math.max(1, parseInt(String(setSizes[s]), 10) || 1);
                const preview = imageMap[`${s}-0`];
                const ruleEntries = rules
                  .map((r, idx) => ({ r, idx }))
                  .filter(
                    ({ r }) => (Math.max(0, Math.floor(Number(r.setIndex)) || 0)) === s
                  )
                  .sort(
                    (a, b) => (Number(a.r.sortOrder) || 0) - (Number(b.r.sortOrder) || 0)
                  );

                function addRuleForThisSet() {
                  const maxSo = ruleEntries.reduce(
                    (m, x) => Math.max(m, Number(x.r.sortOrder) || 0),
                    -1
                  );
                  setRules((prev) => [
                    ...prev,
                    { ...emptyRuleForSet(s), sortOrder: maxSo + 1 }
                  ]);
                }

                return (
                  <div
                    key={s}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 xl:flex-row xl:items-stretch"
                  >
                    <div className="flex flex-shrink-0 flex-wrap items-end gap-4 border-b border-slate-200 pb-4 xl:w-[min(100%,320px)] xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">ชุดที่ {s + 1}</span>
                        <label className="mt-1 text-[10px] text-slate-500">จำนวนป้ายในชุดนี้</label>
                        <input
                          type="number"
                          min={1}
                          value={cap}
                          onChange={(e) => {
                            const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setSetSizes((prev) => {
                              const next = [...prev];
                              next[s] = v;
                              return next;
                            });
                          }}
                          className="mt-0.5 w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="w-28 shrink-0 sm:w-32">
                        <p className="mb-1 text-[10px] text-slate-500">ตัวอย่าง</p>
                        <div className="aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center p-1 text-center text-[10px] leading-tight text-slate-400">
                              เลือกรูป
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <label className="text-[10px] font-medium text-slate-600">
                          อัปโหลดรูปชุดนี้ (1 ไฟล์)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-brand-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand-900"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            void onPickImage(s, 0, f);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          กติกาและรางวัล — ชุดที่ {s + 1}
                        </span>
                        <button
                          type="button"
                          onClick={addRuleForThisSet}
                          className="text-xs font-medium text-brand-800 underline hover:text-brand-950"
                        >
                          + เพิ่มแถวกติกา
                        </button>
                      </div>
                      {ruleEntries.length === 0 ? (
                        <p className="text-[11px] text-slate-500">
                          ยังไม่มีแถว — กดเพิ่มถ้าต้องการเงื่อนไขในชุดนี้
                        </p>
                      ) : null}
                      <div className="space-y-3 pb-1">
                        {ruleEntries.map(({ r, idx }) => (
                          <RuleEditorRow
                            key={idx}
                            r={r}
                            idx={idx}
                            needCap={cap}
                            showSetPicker={false}
                            setCount={setCount}
                            setSizes={setSizes}
                            updateRule={updateRule}
                            setRules={setRules}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {(() => {
                const orphans = rules
                  .map((r, idx) => ({ r, idx }))
                  .filter(({ r }) => {
                    const si = Math.floor(Number(r.setIndex));
                    if (Number.isNaN(si)) return true;
                    return si < 0 || si >= setCount;
                  });
                if (orphans.length === 0) return null;
                return (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4">
                    <p className="text-sm font-semibold text-amber-950">
                      กติกาที่อ้างอิงชุดไม่ถูกต้อง
                    </p>
                    <p className="mt-1 text-xs text-amber-900">
                      มักเกิดหลังลดจำนวนชุด — แก้เลขชุดหรือลบแถว
                    </p>
                    <div className="mt-3 space-y-3">
                      {orphans.map(({ r, idx }) => {
                        const siClamp = Math.min(
                          setCount - 1,
                          Math.max(0, Math.floor(Number(r.setIndex)) || 0)
                        );
                        const capOr = Math.max(
                          1,
                          parseInt(String(setSizes[siClamp] ?? setSizes[0]), 10) || 1
                        );
                        return (
                          <RuleEditorRow
                            key={idx}
                            r={r}
                            idx={idx}
                            needCap={capOr}
                            showSetPicker
                            setCount={setCount}
                            setSizes={setSizes}
                            updateRule={updateRule}
                            setRules={setRules}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <p className="text-[10px] text-amber-800">
              ลดจำนวนชุดแล้วมีกล่องสีเหลือง — แก้ให้หมดแล้วกดบันทึกข้อมูลด้านล่าง
            </p>
          </form>

          <div
            className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            role="region"
            aria-label="บันทึกและเผยแพร่เกม"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">บันทึกข้อมูล</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  บันทึกโครง + กติกาเสมอ · รูปทุกชุดครบแล้วจึงบันทึกรูปด้วย (ไม่ครบจะข้ามรูป) · กดเผยแพร่หลังเลือกเกมในตาราง
                </p>
              </div>
              <button
                type="button"
                disabled={savingAll || loading || gameActionBusy || !selectedId}
                onClick={() => saveAllGameData()}
                className="shrink-0 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAll ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                disabled={gameActionBusy || savingAll || !selectedId}
                aria-busy={gameActionBusy}
                onClick={() => activate()}
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                เผยแพร่บนเว็บ
              </button>
              <button
                type="button"
                disabled={gameActionBusy || savingAll || !selectedId}
                onClick={() => deactivate()}
                className="rounded-lg border border-slate-400 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ปิดใช้เกมนี้
              </button>
              <button
                type="button"
                disabled={gameActionBusy || savingAll || !selectedId}
                onClick={() => removeGame()}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ลบเกม
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
