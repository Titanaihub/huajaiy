"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminHeartPackagesPanel from "./AdminHeartPackagesPanel";
import AdminHeartPurchasesPanel from "./AdminHeartPurchasesPanel";
import AdminCentralGamePanel from "./AdminCentralGamePanel";
import AdminPrizePayoutPanel from "./AdminPrizePayoutPanel";
import { getMemberToken, IMPERSONATION_RETURN_TOKEN_KEY, setMemberToken } from "../lib/memberApi";
import { formatHeartCostSummary } from "../lib/formatHeartCostLabel";
import {
  apiAdminAdjustMemberHearts,
  apiAdminApproveNameChange,
  apiAdminImpersonateMember,
  apiAdminListMembers,
  apiAdminMemberFull,
  apiAdminNameChangeRequests,
  apiAdminPatchMember,
  apiAdminRejectNameChange,
  apiAdminSetMemberPassword,
  apiAdminShops,
  apiAdminCreateShop,
  apiAdminGame
} from "../lib/rolesApi";

const PAGE_SIZE = 25;

function roleLabel(role) {
  if (role === "admin") return "แอดมิน";
  if (role === "owner") return "เจ้าของร้าน";
  return "สมาชิก";
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("members");

  const [q, setQ] = useState("");
  const [qSubmit, setQSubmit] = useState("");
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  /** @type {null | { user: object, orders: array, shops: array, stats: object, nameChangeRequestPending: boolean, heartsNote?: string, heartLedger?: array, roomRedCodes?: array, phoneHistory?: array }} */
  const [memberFull, setMemberFull] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [heartPinkDelta, setHeartPinkDelta] = useState("");
  const [heartRedDelta, setHeartRedDelta] = useState("");
  const [heartGiveawayDelta, setHeartGiveawayDelta] = useState("");
  const [heartBusy, setHeartBusy] = useState(false);
  const [admUsername, setAdmUsername] = useState("");
  const [admFirstName, setAdmFirstName] = useState("");
  const [admLastName, setAdmLastName] = useState("");
  const [admPhone, setAdmPhone] = useState("");
  const [admCountryCode, setAdmCountryCode] = useState("TH");
  const [admGender, setAdmGender] = useState("");
  const [admBirthDate, setAdmBirthDate] = useState("");
  const [admRole, setAdmRole] = useState("member");
  const [admHouseNo, setAdmHouseNo] = useState("");
  const [admMoo, setAdmMoo] = useState("");
  const [admRoad, setAdmRoad] = useState("");
  const [admSubdistrict, setAdmSubdistrict] = useState("");
  const [admDistrict, setAdmDistrict] = useState("");
  const [admProvince, setAdmProvince] = useState("");
  const [admPostalCode, setAdmPostalCode] = useState("");
  const [admProfileBusy, setAdmProfileBusy] = useState(false);
  const [admAccountDisabled, setAdmAccountDisabled] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPasswordPlain, setShowNewPasswordPlain] = useState(false);
  const [passBusy, setPassBusy] = useState(false);
  const [panelMsg, setPanelMsg] = useState("");
  const [impersonateBusy, setImpersonateBusy] = useState(false);
  const [impersonateErr, setImpersonateErr] = useState("");

  const memberDetailRef = useRef(null);

  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqBusyId, setReqBusyId] = useState(null);

  const [shopsAll, setShopsAll] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsErr, setShopsErr] = useState("");
  const [newShopName, setNewShopName] = useState("");
  const [newShopSlug, setNewShopSlug] = useState("");
  const [newShopOwnerUser, setNewShopOwnerUser] = useState("");
  const [shopCreateBusy, setShopCreateBusy] = useState(false);
  const [shopCreateMsg, setShopCreateMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "shops") setTab("shops");
    if (tabParam === "centralGame") setTab("centralGame");
  }, []);

  /** @type {null | { ok: boolean, heartCost: number, legacy: object, central: object | null, persistenceNote?: string }} */
  const [gameInfo, setGameInfo] = useState(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameErr, setGameErr] = useState("");

  const loadMembers = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setListLoading(true);
    setListErr("");
    try {
      const data = await apiAdminListMembers(token, {
        q: qSubmit,
        limit: PAGE_SIZE,
        offset
      });
      setList(data.users || []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (e) {
      setListErr(e.message || String(e));
      setList([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [qSubmit, offset]);

  useEffect(() => {
    if (tab !== "members") return;
    loadMembers();
  }, [tab, loadMembers]);

  useEffect(() => {
    const u = memberFull?.user;
    if (!u?.id) return;
    setAdmUsername(String(u.username || ""));
    setAdmFirstName(String(u.firstName || ""));
    setAdmLastName(String(u.lastName || ""));
    setAdmPhone(String(u.phone || ""));
    setAdmCountryCode(String(u.countryCode || "TH").slice(0, 8));
    setAdmGender(u.gender != null ? String(u.gender) : "");
    setAdmBirthDate(u.birthDate != null ? String(u.birthDate).slice(0, 10) : "");
    setAdmRole(String(u.role || "member"));
    const sp = u.shippingAddressParts && typeof u.shippingAddressParts === "object" ? u.shippingAddressParts : {};
    setAdmHouseNo(String(sp.houseNo || ""));
    setAdmMoo(String(sp.moo || ""));
    setAdmRoad(String(sp.road || ""));
    setAdmSubdistrict(String(sp.subdistrict || ""));
    setAdmDistrict(String(sp.district || ""));
    setAdmProvince(String(sp.province || ""));
    setAdmPostalCode(String(sp.postalCode || ""));
  }, [memberFull?.user]);

  const loadRequests = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setReqLoading(true);
    setReqErr("");
    try {
      const data = await apiAdminNameChangeRequests(token);
      setRequests(data.requests || []);
    } catch (e) {
      setReqErr(e.message || String(e));
      setRequests([]);
    } finally {
      setReqLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "nameChanges") return;
    loadRequests();
  }, [tab, loadRequests]);

  const loadShopsAll = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setShopsLoading(true);
    setShopsErr("");
    try {
      const data = await apiAdminShops(token);
      setShopsAll(data.shops || []);
    } catch (e) {
      setShopsErr(e.message || String(e));
      setShopsAll([]);
    } finally {
      setShopsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "shops") return;
    loadShopsAll();
  }, [tab, loadShopsAll]);

  const loadGameInfo = useCallback(async () => {
    const token = getMemberToken();
    if (!token) return;
    setGameLoading(true);
    setGameErr("");
    try {
      const data = await apiAdminGame(token);
      setGameInfo(data);
    } catch (e) {
      setGameErr(e.message || String(e));
      setGameInfo(null);
    } finally {
      setGameLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "game") return;
    loadGameInfo();
  }, [tab, loadGameInfo]);

  async function reloadMemberFull(id) {
    const token = getMemberToken();
    if (!token) {
      throw new Error("หมดเซสชัน — ล็อกอินใหม่แล้วลองอีกครั้ง");
    }
    const sid = id == null ? "" : String(id).trim();
    if (!sid) {
      throw new Error("ไม่พบรหัสสมาชิก — รีเฟรชรายการแล้วลองใหม่");
    }
    const data = await apiAdminMemberFull(token, sid);
    if (!data?.user) {
      throw new Error("เซิร์ฟเวอร์ไม่ส่งข้อมูลผู้ใช้ — ลองอีกครั้ง");
    }
    setMemberFull({
      user: data.user,
      orders: data.orders || [],
      shops: data.shops || [],
      stats: data.stats || {},
      nameChangeRequestPending: Boolean(data.nameChangeRequestPending),
      heartsNote: data.heartsNote,
      heartLedger: data.heartLedger || [],
      roomRedCodes: data.roomRedCodes || [],
      roomRedRedemptions: data.roomRedRedemptions || [],
      phoneHistory: data.phoneHistory || []
    });
  }

  async function openDetail(rawId) {
    const id = rawId != null && String(rawId).trim() !== "" ? String(rawId).trim() : "";
    setMemberFull(null);
    setDetailErr("");
    setPanelMsg("");
    setImpersonateErr("");
    setHeartPinkDelta("");
    setHeartRedDelta("");
    setNewPassword("");
    if (!id) {
      setSelectedId(null);
      setDetailErr("ไม่พบรหัสสมาชิกในแถวนี้ — รีเฟรชรายการแล้วลองใหม่");
      return;
    }
    setSelectedId(id);
    const token = getMemberToken();
    if (!token) {
      setDetailErr("หมดเซสชัน — ล็อกอินใหม่แล้วลองอีกครั้ง");
      return;
    }
    setDetailLoading(true);
    try {
      await reloadMemberFull(id);
    } catch (e) {
      setDetailErr(e.message || String(e));
      setMemberFull(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function startImpersonationForMember() {
    const id = selectedId;
    if (!id) return;
    const token = getMemberToken();
    if (!token) {
      setImpersonateErr("หมดเซสชัน — ล็อกอินใหม่แล้วลองอีกครั้ง");
      return;
    }
    setImpersonateBusy(true);
    setImpersonateErr("");
    try {
      try {
        window.sessionStorage.setItem(IMPERSONATION_RETURN_TOKEN_KEY, token);
      } catch {
        setImpersonateErr("เบราว์เซอร์ไม่ให้สำรองโทเค็นแอดมิน — ลองอนุญาตการเก็บข้อมูลชั่วคราว");
        return;
      }
      const data = await apiAdminImpersonateMember(token, id);
      setMemberToken(data.token);
      window.location.assign("/account");
    } catch (e) {
      try {
        window.sessionStorage.removeItem(IMPERSONATION_RETURN_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      setImpersonateErr(e.message || String(e));
    } finally {
      setImpersonateBusy(false);
    }
  }

  useEffect(() => {
    if (tab !== "members") return;
    if (!selectedId || detailLoading || !memberFull?.user) return;
    const t = window.setTimeout(() => {
      memberDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [tab, selectedId, detailLoading, memberFull?.user?.id]);

  function submitSearch(e) {
    e.preventDefault();
    setOffset(0);
    setQSubmit(q.trim());
  }

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  async function handleApprove(id) {
    const token = getMemberToken();
    if (!token) return;
    setReqBusyId(id);
    setReqErr("");
    try {
      await apiAdminApproveNameChange(token, id, reqNote.trim() || undefined);
      setReqNote("");
      await loadRequests();
    } catch (e) {
      setReqErr(e.message || String(e));
    } finally {
      setReqBusyId(null);
    }
  }

  async function handleReject(id) {
    const token = getMemberToken();
    if (!token) return;
    setReqBusyId(id);
    setReqErr("");
    try {
      await apiAdminRejectNameChange(token, id, reqNote.trim() || undefined);
      setReqNote("");
      await loadRequests();
    } catch (e) {
      setReqErr(e.message || String(e));
    } finally {
      setReqBusyId(null);
    }
  }

  async function applyHeartDeltasAndRefresh(pd, rd, gd, successMsg) {
    if (!selectedId) return;
    if (pd === 0 && rd === 0 && gd === 0) {
      setPanelMsg("ไม่มีการเปลี่ยนแปลง");
      return;
    }
    const token = getMemberToken();
    if (!token) return;
    setHeartBusy(true);
    setPanelMsg("");
    try {
      const data = await apiAdminAdjustMemberHearts(token, selectedId, {
        pinkDelta: pd,
        redDelta: rd,
        redGiveawayDelta: gd
      });
      setHeartPinkDelta("");
      setHeartRedDelta("");
      setHeartGiveawayDelta("");
      if (data?.user) {
        setMemberFull((prev) =>
          prev && prev.user ? { ...prev, user: data.user } : prev
        );
      }
      setPanelMsg(successMsg);
      void reloadMemberFull(selectedId).catch((err) => {
        setPanelMsg(
          (m) =>
            `${m || successMsg} · โหลดรายละเอียดซ้ำไม่สำเร็จ: ${err.message || String(err)}`
        );
      });
      void loadMembers();
    } catch (err) {
      setPanelMsg(err.message || String(err));
    } finally {
      setHeartBusy(false);
    }
  }

  async function submitHeartAdjust(e) {
    e.preventDefault();
    if (!selectedId) return;
    const pd = parseInt(heartPinkDelta, 10);
    const rd = parseInt(heartRedDelta, 10);
    const gd = parseInt(heartGiveawayDelta, 10);
    const pinkDelta = Number.isFinite(pd) ? pd : 0;
    const redDelta = Number.isFinite(rd) ? rd : 0;
    const redGiveawayDelta = Number.isFinite(gd) ? gd : 0;
    if (pinkDelta === 0 && redDelta === 0 && redGiveawayDelta === 0) {
      setPanelMsg(
        "ใส่ตัวเลขเต็มอย่างน้อยหนึ่งช่อง (ชมพู / แดงเล่นได้ / แดงแจก) — บวกเพิ่ม ลบลด"
      );
      return;
    }
    await applyHeartDeltasAndRefresh(
      pinkDelta,
      redDelta,
      redGiveawayDelta,
      "ปรับหัวใจในระบบแล้ว (ฟรี — ไม่ผ่านสลิป) — สมาชิกกด「รีเฟรชยอด」ที่บัญชี"
    );
  }

  async function quickZeroPlayableRed() {
    const u = memberFull?.user;
    if (!u || !selectedId) return;
    const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
    if (r === 0) {
      setPanelMsg("แดงเล่นได้คงเหลือ 0 อยู่แล้ว");
      return;
    }
    if (!window.confirm(`หักแดงเล่นได้ทั้งหมด ${r.toLocaleString("th-TH")} ดวง ให้เหลือ 0?`)) {
      return;
    }
    await applyHeartDeltasAndRefresh(
      0,
      -r,
      0,
      "หักแดงเล่นได้หมดแล้ว — ให้สมาชิกกด「รีเฟรชยอด」"
    );
  }

  async function quickZeroAllHearts() {
    const u = memberFull?.user;
    if (!u || !selectedId) return;
    const p = Math.max(0, Math.floor(Number(u.pinkHeartsBalance) || 0));
    const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
    const g = Math.max(0, Math.floor(Number(u.redGiveawayBalance) || 0));
    if (p === 0 && r === 0 && g === 0) {
      setPanelMsg("หัวใจทุกประเภทเป็น 0 อยู่แล้ว");
      return;
    }
    if (
      !window.confirm(
        `เคลียร์หัวใจเป็น 0 ทั้งหมด?\nชมพู ${p.toLocaleString("th-TH")} · แดงเล่น ${r.toLocaleString("th-TH")} · แดงแจก ${g.toLocaleString("th-TH")}`
      )
    ) {
      return;
    }
    await applyHeartDeltasAndRefresh(
      -p,
      -r,
      -g,
      "เคลียร์หัวใจเป็น 0 แล้ว — ให้สมาชิกกด「รีเฟรชยอด」"
    );
  }

  async function submitAdminProfile(e) {
    e.preventDefault();
    if (!selectedId) return;
    const token = getMemberToken();
    if (!token) return;
    setAdmProfileBusy(true);
    setPanelMsg("");
    try {
      await apiAdminPatchMember(token, selectedId, {
        username: admUsername.trim().toLowerCase(),
        firstName: admFirstName.trim(),
        lastName: admLastName.trim(),
        phone: admPhone.trim(),
        countryCode: admCountryCode.trim() || "TH",
        gender: admGender.trim() || null,
        birthDate: admBirthDate.trim() || null,
        role: admRole,
        shippingAddressParts: {
          houseNo: admHouseNo,
          moo: admMoo,
          road: admRoad,
          subdistrict: admSubdistrict,
          district: admDistrict,
          province: admProvince,
          postalCode: admPostalCode
        },
        accountDisabled: admAccountDisabled
      });
      await reloadMemberFull(selectedId);
      await loadMembers();
      setPanelMsg("บันทึกโปรไฟล์สมาชิกแล้ว");
    } catch (err) {
      setPanelMsg(err.message || String(err));
    } finally {
      setAdmProfileBusy(false);
    }
  }

  async function submitNewPassword(e) {
    e.preventDefault();
    if (!selectedId || !newPassword.trim()) return;
    const token = getMemberToken();
    if (!token) return;
    setPassBusy(true);
    setPanelMsg("");
    try {
      await apiAdminSetMemberPassword(token, selectedId, newPassword);
      setNewPassword("");
      setPanelMsg("ตั้งรหัสผ่านใหม่แล้ว — แจ้งสมาชิกให้ล็อกอินด้วยรหัสใหม่");
    } catch (err) {
      setPanelMsg(err.message || String(err));
    } finally {
      setPassBusy(false);
    }
  }

  const detail = memberFull?.user;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("members")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "members"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          สมาชิก
        </button>
        <button
          type="button"
          onClick={() => setTab("shops")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "shops"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          ร้านทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => setTab("game")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "game"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          เกมและรางวัล
        </button>
        <button
          type="button"
          onClick={() => setTab("centralGame")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "centralGame"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          เกมส่วนกลาง
        </button>
        <button
          type="button"
          onClick={() => setTab("prizePayouts")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "prizePayouts"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          จ่ายรางวัล
        </button>
        <button
          type="button"
          onClick={() => setTab("heartPackages")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "heartPackages"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          แพ็กขายหัวใจ
        </button>
        <button
          type="button"
          onClick={() => setTab("heartPurchases")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "heartPurchases"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          อนุมัติสลิป
        </button>
        <button
          type="button"
          onClick={() => setTab("nameChanges")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "nameChanges"
              ? "bg-brand-800 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          คำขอเปลี่ยนชื่อ
        </button>
      </div>

      {tab === "members" ? (
        <section className="space-y-4">
          <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
            <strong>สิทธิ์แอดมิน:</strong> ดูยูสเซอร์ทุกคนในตาราง · แก้ชื่อ–นามสกุล เบอร์ ที่อยู่ บทบาท ·{" "}
            <strong>รหัสผ่าน</strong> ในตารางเป็นเครื่องหมายปกติ (แฮชใน DB ไม่แสดงตัวจริง) — ตั้งรหัสใหม่แล้วกด「แสดง」เวลาพิมพ์ ·{" "}
            <strong>ระงับบัญชี</strong> ห้ามล็อกอินและใช้ API · แก้<strong>เกมส่วนกลาง</strong>ที่แท็บ「เกมส่วนกลาง」
          </p>
          <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="admin-q" className="block text-xs font-medium text-slate-600">
                ค้นหา (ยูสเซอร์ ชื่อ เบอร์ หรือ id)
              </label>
              <input
                id="admin-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="เว้นว่าง = แสดงทั้งหมดตามหน้า"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              ค้นหา
            </button>
          </form>

          <p className="text-xs text-slate-500">
            พบ {total} รายการ · หน้าละ {PAGE_SIZE} รายการ · ชมพู / แดงเล่นได้ / แดงแจก = ยอดบนเซิร์ฟเวอร์
          </p>

          {listErr ? <p className="text-sm text-red-600">{listErr}</p> : null}
          {listLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลด…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">ยูสเซอร์</th>
                    <th className="px-3 py-2">ชื่อ–นามสกุล</th>
                    <th className="px-3 py-2">เบอร์</th>
                    <th className="px-3 py-2 text-slate-600">รหัสผ่าน</th>
                    <th className="px-3 py-2 text-rose-600">ชมพู</th>
                    <th className="px-3 py-2 text-red-700">แดงเล่น</th>
                    <th className="px-3 py-2 text-rose-800">แดงแจก</th>
                    <th className="px-3 py-2">สถานะบัญชี</th>
                    <th className="px-3 py-2">บทบาท</th>
                    <th className="px-3 py-2">สมัคร</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  ) : (
                    list.map((u) => {
                      const rowId =
                        u.id != null && String(u.id).trim() !== "" ? String(u.id).trim() : "";
                      const redMain = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
                      const redRoom = Math.max(0, Math.floor(Number(u.roomGiftRedTotal) || 0));
                      const redDisplay = Math.max(
                        0,
                        Math.floor(Number(u.redHeartsDisplay) || redMain + redRoom)
                      );
                      return (
                      <tr
                        key={rowId || u.username}
                        className={`border-b border-slate-100 ${
                          selectedId && rowId && selectedId === rowId ? "bg-brand-50/60" : ""
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                        <td className="px-3 py-2">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-3 py-2">{u.phone}</td>
                        <td
                          className="px-3 py-2"
                          title="ระบบเก็บรหัสแบบแฮชเท่านั้น — ไม่มีข้อความจริงให้แสดง · ตั้งรหัสใหม่ได้ที่「ดูทั้งหมด」"
                        >
                          <span className="inline-block font-mono text-xs tracking-widest text-slate-500">
                            ••••••••
                          </span>
                          <span className="ml-1 text-[10px] font-normal text-slate-400">
                            (แฮช)
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-rose-600">
                          {u.pinkHeartsBalance ?? 0}
                        </td>
                        <td className="px-3 py-2 font-medium text-red-700">
                          <span className="tabular-nums">{redDisplay.toLocaleString("th-TH")}</span>
                          {redRoom > 0 ? (
                            <span className="ml-1 text-[10px] font-semibold text-amber-900/90">
                              (+ห้อง {redRoom.toLocaleString("th-TH")})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-medium text-rose-900">
                          {u.redGiveawayBalance ?? 0}
                        </td>
                        <td className="px-3 py-2">
                          {u.accountDisabled ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                              ระงับ
                            </span>
                          ) : (
                            <span className="text-slate-600">ใช้งานได้</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{roleLabel(u.role)}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString("th-TH")
                            : "—"}
                        </td>
                        <td className="relative z-[1] px-3 py-2">
                          <button
                            type="button"
                            disabled={!rowId}
                            title={!rowId ? "ไม่มีรหัสผู้ใช้ในแถวนี้ — รีเฟรชรายการ" : undefined}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (rowId) openDetail(rowId);
                            }}
                            className="cursor-pointer text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                          >
                            ดูทั้งหมด
                          </button>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canPrev || listLoading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={!canNext || listLoading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>

          {selectedId ? (
            <div
              ref={memberDetailRef}
              id="admin-member-detail"
              className="scroll-mt-28 space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                โปรไฟล์และกิจกรรม (สมาชิก)
              </h3>
              {detailLoading ? (
                <p className="text-sm text-slate-500">กำลังโหลด…</p>
              ) : detailErr ? (
                <p className="text-sm text-red-600">{detailErr}</p>
              ) : detail && memberFull ? (
                <>
                  {panelMsg ? (
                    <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      {panelMsg}
                    </p>
                  ) : null}
                  {memberFull.heartsNote ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {memberFull.heartsNote}
                    </p>
                  ) : null}

                  {detail.role !== "admin" && !detail.accountDisabled ? (
                    <div className="rounded-lg border border-violet-200 bg-violet-50/90 p-3 text-sm text-violet-950">
                      <p className="font-semibold">ตรวจเมนูฝั่งสมาชิก (ก่อนปล่อยใช้งานจริง)</p>
                      <p className="mt-1 text-xs leading-relaxed text-violet-900/95">
                        ต้องตั้งค่า{" "}
                        <code className="rounded bg-white/90 px-1 py-0.5 font-mono text-[11px]">
                          ADMIN_IMPERSONATION_ENABLED=true
                        </code>{" "}
                        ที่บริการ API — ระบบจะสลับเป็นโทเค็นของสมาชิกคนนี้ชั่วคราว (ประมาณ 4 ชั่วโมง)
                        มีแถบสีเหลืองด้านบน — กดออกเพื่อกลับแอดมิน
                      </p>
                      {impersonateErr ? (
                        <p className="mt-2 text-xs font-medium text-red-700">{impersonateErr}</p>
                      ) : null}
                      <button
                        type="button"
                        disabled={impersonateBusy || detailLoading}
                        onClick={() => void startImpersonationForMember()}
                        className="mt-2 rounded-lg border border-violet-400 bg-white px-3 py-1.5 text-xs font-semibold text-violet-950 hover:bg-violet-100 disabled:opacity-50"
                      >
                        {impersonateBusy ? "กำลังสลับ…" : "ดูหน้าสมาชิก (โหมดตรวจสอบ)"}
                      </button>
                    </div>
                  ) : null}

                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">id</dt>
                      <dd className="font-mono text-xs break-all">{detail.id}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">ยูสเซอร์ (ล็อกอิน)</dt>
                      <dd className="font-mono font-semibold text-slate-900">{detail.username}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">สถานะบัญชี</dt>
                      <dd>
                        {detail.accountDisabled ? (
                          <span className="font-semibold text-red-700">ระงับ — ห้ามเข้าสู่ระบบ</span>
                        ) : (
                          <span className="text-emerald-800">ใช้งานได้</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">ชื่อ–นามสกุล (ในระบบ)</dt>
                      <dd>
                        {detail.firstName} {detail.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">เบอร์โทร</dt>
                      <dd>{detail.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">รหัสประเทศ</dt>
                      <dd>{detail.countryCode || "TH"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">บทบาท</dt>
                      <dd>{roleLabel(detail.role)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">หัวใจชมพู (DB)</dt>
                      <dd className="text-lg font-semibold text-rose-600">
                        {detail.pinkHeartsBalance ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">หัวใจแดงเล่นได้ (DB)</dt>
                      <dd className="text-lg font-semibold text-red-700">
                        {detail.redHeartsBalance ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">หัวใจแดงแจก (DB)</dt>
                      <dd className="text-lg font-semibold text-rose-900">
                        {detail.redGiveawayBalance ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">รวม</dt>
                      <dd className="font-medium text-slate-800">
                        {(detail.pinkHeartsBalance ?? 0) +
                          (detail.redHeartsBalance ?? 0) +
                          (detail.redGiveawayBalance ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">ออเดอร์ (จาก DB)</dt>
                      <dd>
                        {memberFull.stats?.orderCount ?? 0} รายการ · หัวใจที่ออเดอร์มอบรวม{" "}
                        {memberFull.stats?.totalHeartsGrantedFromOrders ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">คำขอเปลี่ยนชื่อค้าง</dt>
                      <dd>{memberFull.nameChangeRequestPending ? "มี — ดูแท็บคำขอ" : "ไม่มี"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">รหัสผ่าน</dt>
                      <dd className="text-slate-700">
                        <p>{detail.passwordNote}</p>
                        <p className="mt-1 text-xs text-amber-900/90">
                          ระบบไม่เก็บและไม่แสดงรหัสผ่านตัวจริงของผู้ใช้ — แอดมิน<strong>ตั้งรหัสใหม่</strong>
                          ให้ได้ด้านล่างเท่านั้น (สมาชิกใช้รหัสใหม่ล็อกอิน)
                        </p>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">เพศ / วันเกิด</dt>
                      <dd>
                        {detail.gender || "—"} · {detail.birthDate || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">IP ตอนสมัคร</dt>
                      <dd className="font-mono text-xs">{detail.registrationIp || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">สมัครเมื่อ</dt>
                      <dd>
                        {detail.createdAt
                          ? new Date(detail.createdAt).toLocaleString("th-TH")
                          : "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">ที่อยู่จัดส่ง</dt>
                      <dd className="whitespace-pre-wrap text-slate-800">
                        {detail.shippingAddress || "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
                    <h4 className="text-xs font-semibold uppercase text-brand-900">
                      แก้ไขโปรไฟล์สมาชิก (บันทึกตรงฐานข้อมูล)
                    </h4>
                    <p className="mt-2 rounded-md border border-sky-200 bg-sky-50/90 px-2 py-1.5 text-[11px] text-sky-950">
                      <strong>รหัสผ่าน:</strong> ของเดิมไม่มีแบบตัวอักษรในระบบ (แฮชเท่านั้น) —{" "}
                      <strong>ดูตัวที่พิมพ์ได้</strong>เฉพาะตอนตั้งรหัสใหม่ด้านล่าง (กด「แสดง」) · แก้
                      <strong>ยูสเซอร์</strong>ได้ในช่องแรก (a–z ตัวเลข _ 3–32 ตัว) — ล็อกอินหลังเปลี่ยนต้องใช้ยูสใหม่
                    </p>
                    <form onSubmit={submitAdminProfile} className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-slate-600">
                          ยูสเซอร์ (ล็อกอิน) — a–z ตัวเลข _ ความยาว 3–32
                        </label>
                        <input
                          required
                          value={admUsername}
                          onChange={(e) => setAdmUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          className="mt-0.5 w-full max-w-md rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-sm"
                          minLength={3}
                          maxLength={32}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600">ชื่อ</label>
                        <input
                          required
                          value={admFirstName}
                          onChange={(e) => setAdmFirstName(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600">นามสกุล</label>
                        <input
                          required
                          value={admLastName}
                          onChange={(e) => setAdmLastName(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600">เบอร์โทร</label>
                        <input
                          required
                          value={admPhone}
                          onChange={(e) => setAdmPhone(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600">รหัสประเทศ</label>
                        <input
                          value={admCountryCode}
                          onChange={(e) => setAdmCountryCode(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs"
                          placeholder="TH"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600">เพศ</label>
                        <input
                          value={admGender}
                          onChange={(e) => setAdmGender(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                          placeholder="เว้นว่างได้"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-600">วันเกิด (YYYY-MM-DD)</label>
                        <input
                          type="date"
                          value={admBirthDate}
                          onChange={(e) => setAdmBirthDate(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-slate-600">บทบาท</label>
                        <select
                          value={admRole}
                          onChange={(e) => setAdmRole(e.target.value)}
                          className="mt-0.5 w-full max-w-xs rounded-lg border border-slate-300 px-2 py-1.5"
                        >
                          <option value="member">สมาชิก</option>
                          <option value="owner">เจ้าของร้าน</option>
                          <option value="admin">แอดมิน</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2">
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-red-950">
                          <input
                            type="checkbox"
                            checked={admAccountDisabled}
                            onChange={(e) => setAdmAccountDisabled(e.target.checked)}
                            className="mt-1"
                          />
                          <span>
                            <strong>ระงับบัญชี</strong> — ห้ามล็อกอินและห้ามใช้งาน API ด้วยโทเค็นเดิม
                            (สมาชิกจะได้ข้อความว่าบัญชีถูกระงับ)
                          </span>
                        </label>
                      </div>
                      <div className="sm:col-span-2 border-t border-slate-200 pt-2 text-[10px] font-semibold uppercase text-slate-500">
                        ที่อยู่จัดส่ง (แยกช่อง)
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">บ้านเลขที่</label>
                        <input
                          value={admHouseNo}
                          onChange={(e) => setAdmHouseNo(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">หมู่</label>
                        <input
                          value={admMoo}
                          onChange={(e) => setAdmMoo(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-600">ถนน</label>
                        <input
                          value={admRoad}
                          onChange={(e) => setAdmRoad(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">ตำบล/แขวง</label>
                        <input
                          value={admSubdistrict}
                          onChange={(e) => setAdmSubdistrict(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">อำเภอ/เขต</label>
                        <input
                          value={admDistrict}
                          onChange={(e) => setAdmDistrict(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">จังหวัด</label>
                        <input
                          value={admProvince}
                          onChange={(e) => setAdmProvince(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">รหัสไปรษณีย์</label>
                        <input
                          value={admPostalCode}
                          onChange={(e) => setAdmPostalCode(e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={admProfileBusy}
                          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
                        >
                          {admProfileBusy ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <h4 className="text-xs font-semibold uppercase text-slate-600">
                      เติมหัวใจให้สมาชิก (ฟรี — ไม่ผ่านสลิป)
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-600">
                      ชมพู / แดงเล่นได้ / แดงแจกผู้เล่น — ใส่ตัวเลขเต็ม บวกเพิ่ม ลบลด (ห้ามติดลบเกินยอดคงเหลือ)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={heartBusy || !memberFull?.user}
                        onClick={() => void quickZeroPlayableRed()}
                        className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
                      >
                        หักแดงเล่นหมด (ครั้งเดียว)
                      </button>
                      <button
                        type="button"
                        disabled={heartBusy || !memberFull?.user}
                        onClick={() => void quickZeroAllHearts()}
                        className="rounded-lg border border-slate-400 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        เคลียร์หัวใจเป็น 0 ทั้งหมด
                      </button>
                    </div>
                    <form onSubmit={submitHeartAdjust} className="mt-2 flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-rose-600">ชมพู Δ</label>
                        <input
                          type="number"
                          value={heartPinkDelta}
                          onChange={(e) => setHeartPinkDelta(e.target.value)}
                          placeholder="0"
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-red-700">แดงเล่น Δ</label>
                        <input
                          type="number"
                          value={heartRedDelta}
                          onChange={(e) => setHeartRedDelta(e.target.value)}
                          placeholder="0"
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-rose-900">แดงแจก Δ</label>
                        <input
                          type="number"
                          value={heartGiveawayDelta}
                          onChange={(e) => setHeartGiveawayDelta(e.target.value)}
                          placeholder="0"
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={heartBusy}
                        className="rounded-lg bg-pink-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-pink-800 disabled:opacity-50"
                      >
                        {heartBusy ? "…" : "บันทึก"}
                      </button>
                    </form>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <h4 className="text-xs font-semibold uppercase text-slate-600">
                      ตั้งรหัสผ่านใหม่ให้สมาชิก
                    </h4>
                    <form onSubmit={submitNewPassword} className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="flex min-w-[200px] flex-1 items-stretch gap-1 rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-brand-300">
                        <input
                          type={showNewPasswordPlain ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="รหัสใหม่ (อย่างน้อย 6 ตัว)"
                          className="min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-2 py-1.5 text-sm outline-none"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPasswordPlain((v) => !v)}
                          className="shrink-0 rounded-r-lg border-l border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          title={showNewPasswordPlain ? "ซ่อนรหัส" : "แสดงรหัสที่พิมพ์"}
                        >
                          {showNewPasswordPlain ? "ซ่อน" : "แสดง"}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={passBusy}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                      >
                        {passBusy ? "…" : "ตั้งรหัส"}
                      </button>
                    </form>
                    <p className="mt-1 text-[11px] text-slate-500">
                      กด「แสดง」เพื่อเห็นตัวอักษรขณะพิมพ์รหัสใหม่ — รหัสเดิมของสมาชิกดูไม่ได้เพราะเก็บแฮชใน DB
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-600">
                      ร้านที่เป็นของสมาชิกนี้
                    </h4>
                    {memberFull.shops.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-500">ยังไม่มีร้านในฐานข้อมูล</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm">
                        {memberFull.shops.map((s) => (
                          <li key={s.id} className="rounded border border-slate-100 px-2 py-1">
                            <span className="font-medium">{s.name}</span>{" "}
                            <code className="text-xs text-slate-600">{s.slug}</code>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-slate-600">
                      ออเดอร์ล่าสุด (สูงสุด 100 รายการ)
                    </h4>
                    {memberFull.orders.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-500">ไม่มีออเดอร์ในฐานข้อมูล</p>
                    ) : (
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="py-1 pr-2">เมื่อ</th>
                              <th className="py-1 pr-2">ราคา</th>
                              <th className="py-1 pr-2">หัวใจมอบ</th>
                              <th className="py-1">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberFull.orders.map((o) => (
                              <tr key={o.id} className="border-b border-slate-100">
                                <td className="py-1 pr-2 whitespace-nowrap">
                                  {o.createdAt
                                    ? new Date(o.createdAt).toLocaleString("th-TH")
                                    : "—"}
                                </td>
                                <td className="py-1 pr-2">{o.totalPrice}</td>
                                <td className="py-1 pr-2">{o.heartsGranted}</td>
                                <td className="py-1">{o.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                      ประวัติหัวใจ (ledger) ล่าสุด
                    </summary>
                    <div className="mt-3 max-h-80 overflow-auto text-xs">
                      {(memberFull.heartLedger || []).length === 0 ? (
                        <p className="text-slate-500">ไม่มีรายการหรือฐานข้อมูลไม่พร้อม</p>
                      ) : (
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b text-slate-500">
                              <th className="py-1 pr-2 text-left">เมื่อ</th>
                              <th className="py-1 pr-2">ชนิด</th>
                              <th className="py-1 pr-2">Δชมพู</th>
                              <th className="py-1 pr-2">Δแดงเล่น</th>
                              <th className="py-1 text-left">รายละเอียด</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(memberFull.heartLedger || []).map((row) => (
                              <tr key={row.id} className="border-b border-slate-100 align-top">
                                <td className="py-1 pr-2 whitespace-nowrap">
                                  {row.createdAt
                                    ? new Date(row.createdAt).toLocaleString("th-TH")
                                    : "—"}
                                </td>
                                <td className="py-1 pr-2 font-mono">{row.kind}</td>
                                <td className="py-1 pr-2 tabular-nums">{row.pinkDelta}</td>
                                <td className="py-1 pr-2 tabular-nums">{row.redDelta}</td>
                                <td className="max-w-[14rem] py-1 text-slate-700 sm:max-w-md">
                                  <span className="line-clamp-2">{row.label || "—"}</span>
                                  {row.meta &&
                                  typeof row.meta === "object" &&
                                  row.meta.redGiveawayDelta != null &&
                                  Number(row.meta.redGiveawayDelta) !== 0 ? (
                                    <span className="mt-0.5 block text-[10px] text-rose-900">
                                      แดงแจก Δ {String(row.meta.redGiveawayDelta)} · คงเหลือแจก{" "}
                                      {row.meta.redGiveawayBalanceAfter ?? "—"}
                                    </span>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </details>

                  <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                      หัวใจแดงที่ได้
                    </summary>
                    <div className="mt-3 max-h-64 overflow-auto text-xs">
                      {(memberFull.roomRedRedemptions || []).length === 0 ? (
                        <p className="text-slate-500">ไม่มีประวัติการแลกรหัสหรือฐานข้อมูลไม่พร้อม</p>
                      ) : (
                        <ul className="space-y-2">
                          {(memberFull.roomRedRedemptions || []).map((x) => (
                            <li
                              key={x.id}
                              className="rounded border border-slate-200 bg-white px-2 py-1.5"
                            >
                              <div className="font-mono">
                                <span className="font-semibold text-slate-900">
                                  {x.code || "(ไม่มีรหัส)"}
                                </span>
                                <span className="ml-2 text-red-700">
                                  +
                                  {Math.max(
                                    0,
                                    Math.floor(Number(x.redAmount) || 0)
                                  ).toLocaleString("th-TH")}{" "}
                                  แดง
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-600">
                                จาก @{x.creatorUsername || "ไม่ทราบผู้สร้าง"} ·{" "}
                                {x.redeemedAt
                                  ? new Date(x.redeemedAt).toLocaleString("th-TH")
                                  : "—"}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>

                  <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                      ประวัติเปลี่ยนเบอร์โทร
                    </summary>
                    <div className="mt-3 max-h-48 overflow-auto text-xs">
                      {(memberFull.phoneHistory || []).length === 0 ? (
                        <p className="text-slate-500">ไม่มีประวัติหรือฐานข้อมูลไม่พร้อม</p>
                      ) : (
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b text-slate-500">
                              <th className="py-1 pr-2 text-left">เมื่อ</th>
                              <th className="py-1 pr-2">จาก</th>
                              <th className="py-1 pr-2">เป็น</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(memberFull.phoneHistory || []).map((ph) => (
                              <tr key={ph.id} className="border-b border-slate-100">
                                <td className="py-1 pr-2 whitespace-nowrap">
                                  {ph.changedAt
                                    ? new Date(ph.changedAt).toLocaleString("th-TH")
                                    : "—"}
                                </td>
                                <td className="py-1 pr-2">{ph.oldPhone}</td>
                                <td className="py-1 pr-2">{ph.newPhone}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </details>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : tab === "shops" ? (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">
            ร้านที่ลงทะเบียนในฐานข้อมูล — สร้างร้านด้านล่างได้เลย จากนั้นให้เจ้าของร้านไป{" "}
            <Link href="/account/shops" className="font-medium text-brand-800 underline">
              ร้านของฉัน → จัดการสินค้า
            </Link>
          </p>

          <form
            className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const token = getMemberToken();
              if (!token) return;
              setShopCreateMsg("");
              setShopCreateBusy(true);
              try {
                const body = {
                  name: newShopName.trim(),
                  ownerUsername: newShopOwnerUser.trim() || undefined
                };
                const slugTrim = newShopSlug.trim().toLowerCase();
                if (slugTrim) body.slug = slugTrim;
                await apiAdminCreateShop(token, body);
                setShopCreateMsg("สร้างร้านแล้ว — แจ้งเจ้าของให้ล็อกอินแล้วเพิ่มสินค้า");
                setNewShopName("");
                setNewShopSlug("");
                setNewShopOwnerUser("");
                await loadShopsAll();
              } catch (err) {
                setShopCreateMsg(err.message || String(err));
              } finally {
                setShopCreateBusy(false);
              }
            }}
          >
            <h3 className="text-sm font-semibold text-slate-900">สร้างร้านใหม่</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">ชื่อร้าน (แสดงบนเว็บ)</label>
                <input
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="เช่น ร้านดอกไม้บ้านสวน"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  slug (ไม่บังคับ — เว้นว่างระบบสร้างให้อัตโนมัติ)
                </label>
                <input
                  value={newShopSlug}
                  onChange={(e) => setNewShopSlug(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  placeholder="เช่น garden-shop"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  ยูสเซอร์เจ้าของร้าน (ไม่บังคับ)
                </label>
                <input
                  value={newShopOwnerUser}
                  onChange={(e) => setNewShopOwnerUser(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  placeholder="ตรงกับล็อกอินสมาชิก"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={shopCreateBusy}
              className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50"
            >
              {shopCreateBusy ? "กำลังสร้าง…" : "สร้างร้าน"}
            </button>
            {shopCreateMsg ? (
              <p
                className={`text-sm ${
                  shopCreateMsg.startsWith("สร้างร้านแล้ว")
                    ? "text-green-800"
                    : "text-red-600"
                }`}
              >
                {shopCreateMsg}
              </p>
            ) : null}
          </form>

          {shopsErr ? <p className="text-sm text-red-600">{shopsErr}</p> : null}
          {shopsLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลด…</p>
          ) : shopsAll.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีร้านในฐานข้อมูล — กรอกฟอร์มด้านบน</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">ชื่อร้าน</th>
                    <th className="px-3 py-2">slug</th>
                    <th className="px-3 py-2">เจ้าของ (ยูสเซอร์)</th>
                    <th className="px-3 py-2">ลงสินค้า</th>
                    <th className="px-3 py-2">สร้างเมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {shopsAll.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.slug}</td>
                      <td className="px-3 py-2">{s.ownerUsername || "—"}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/account/shops/${s.id}/products`}
                          className="text-brand-800 underline hover:text-brand-950"
                        >
                          จัดการสินค้า
                        </Link>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          (เจ้าของร้านต้องล็อกอิน)
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleString("th-TH")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : tab === "game" ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-slate-800">
            <p className="font-semibold text-slate-900">แก้ไขเกมที่ผู้เล่นเห็นจริง</p>
            <p className="mt-1 text-slate-700">
              ไปที่แท็บ <strong>เกมส่วนกลาง</strong> — สร้างเกม อัปโหลดรูป ตั้งกติการางวัล แล้วกดเผยแพร่
            </p>
            <button
              type="button"
              onClick={() => setTab("centralGame")}
              className="mt-3 rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
            >
              ไปตั้งค่าเกมส่วนกลาง
            </button>
          </div>
          <p className="text-sm text-slate-600">
            หน้าเกมใช้<strong>เกมส่วนกลาง</strong>เมื่อมีเกมที่เปิดใช้งาน — หากยังไม่ตั้งค่า ระบบจะใช้<strong>กติกาเริ่มต้น</strong>ของเซิร์ฟเวอร์ (อ่านอย่างเดียวด้านล่าง)
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadGameInfo()}
              disabled={gameLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              รีเฟรชสถานะ
            </button>
          </div>
          {gameErr ? <p className="text-sm text-red-600">{gameErr}</p> : null}
          {gameLoading && !gameInfo ? (
            <p className="text-sm text-slate-500">กำลังโหลด…</p>
          ) : gameInfo?.ok ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {gameInfo.persistenceNote}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">หัวใจต่อรอบ (กติกาเริ่มต้น / สำรอง)</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{gameInfo.heartCost}</p>
                <p className="mt-2 text-xs text-slate-500">
                  เกมส่วนกลางตั้งค่าหักหัวใจต่อรอบในแต่ละเกม (ไม่ใช่ค่านี้)
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">เกมส่วนกลาง (กำลังใช้งานบน /game)</h3>
                {gameInfo.central ? (
                  <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4 text-sm">
                    <p className="font-medium text-slate-900">{gameInfo.central.game?.title || "—"}</p>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-600">ป้าย / ชุด / ภาพต่อชุด</dt>
                        <dd className="font-semibold">
                          {gameInfo.central.tileCount} = {gameInfo.central.setCount}×{gameInfo.central.imagesPerSet}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-600">อัปโหลดภาพ</dt>
                        <dd className="font-semibold">
                          {gameInfo.central.imagesFilled}/{gameInfo.central.expectedImages}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-600">รอบเกมที่เซิร์ฟเวอร์กำลังจดจำ</dt>
                        <dd className="font-semibold">
                          ทั้งหมด {gameInfo.central.activeSessions} · เล่นอยู่ {gameInfo.central.sessionsPlaying} · จบแล้ว{" "}
                          {gameInfo.central.sessionsFinished}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-600">กติกา (แถว)</dt>
                        <dd className="font-semibold">{gameInfo.central.rulesCount}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-600">หักหัวใจต่อรอบ (ชมพู / แดง)</dt>
                        <dd className="font-semibold text-slate-900">
                          {formatHeartCostSummary(
                            gameInfo.central.game?.pinkHeartCost,
                            gameInfo.central.game?.redHeartCost
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    ยังไม่มีเกมส่วนกลางที่เปิดใช้งาน — ผู้เล่นจะได้กติกาเริ่มต้น
                  </p>
                )}
              </div>

              <details className="group rounded-xl border border-slate-200 bg-slate-50/80">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
                  กติกาเริ่มต้นของเซิร์ฟเวอร์ (สำรอง — ไม่ใช่ที่แก้ในเกมส่วนกลาง)
                </summary>
                <div className="space-y-2 border-t border-slate-200 px-4 pb-4 pt-2">
                <h3 className="text-base font-semibold text-slate-900 sr-only">กติกาเริ่มต้น</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <dt className="text-xs font-semibold uppercase text-slate-500">จำนวนการ์ดบนกระดาน</dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-900">{gameInfo.legacy?.cardCount ?? "—"}</dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <dt className="text-xs font-semibold uppercase text-slate-500">รอบเกมที่เซิร์ฟเวอร์กำลังจดจำ (กติกาเริ่มต้น)</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      ทั้งหมด {gameInfo.legacy?.activeSessions ?? 0} · กำลังเล่น {gameInfo.legacy?.sessionsPlaying ?? 0} · จบแล้วยังไม่หมดอายุ{" "}
                      {gameInfo.legacy?.sessionsFinished ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase text-slate-500">ล้างรอบที่จบแล้วหลังครบกำหนด</dt>
                    <dd className="mt-1 text-slate-800">
                      {Math.round((gameInfo.legacy?.pruneAfterMs || 0) / 60000)} นาที (ไม่ได้ใช้งาน)
                    </dd>
                  </div>
                </dl>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">รางวัล (กติกาเริ่มต้น — โค้ดเดิม)</h4>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2">รหัส</th>
                          <th className="px-3 py-2">รางวัล</th>
                          <th className="px-3 py-2">ต้องครบ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(gameInfo.legacy?.prizes || []).map((p) => (
                          <tr key={p.key} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-mono text-xs">{p.key}</td>
                            <td className="px-3 py-2">
                              <span className="mr-1" aria-hidden>
                                {p.emoji}
                              </span>
                              {p.label}
                            </td>
                            <td className="px-3 py-2">{p.need}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>
              </details>
            </div>
          ) : (
            <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>
          )}
        </section>
      ) : tab === "centralGame" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">ตั้งค่าเกมส่วนกลาง</h2>
          <p className="text-sm text-slate-600">
            สร้างเกม อัปโหลดภาพแต่ละชุด กำหนดเงื่อนไขรางวัล แล้วเปิดใช้งาน — ผู้เล่นที่หน้า /game จะได้เกมนี้ทันที
          </p>
          <AdminCentralGamePanel />
        </section>
      ) : tab === "prizePayouts" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">จ่ายรางวัล</h2>
          <p className="text-sm text-slate-600">
            รายการผู้เล่นที่ชนะรางวัลจากเกมส่วนกลาง — ใช้ตรวจสอบว่าต้องโอน/ส่งมอบรางวัลให้ใคร (ข้อมูลจากระบบบันทึกการชนะ)
          </p>
          <AdminPrizePayoutPanel />
        </section>
      ) : tab === "heartPackages" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">แพ็กเกจขายหัวใจ</h2>
          <AdminHeartPackagesPanel />
        </section>
      ) : tab === "heartPurchases" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">อนุมัติสลิปซื้อหัวใจ</h2>
          <AdminHeartPurchasesPanel />
        </section>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">
            คำขอที่รอแอดมิน — อนุมัติแล้วระบบจะอัปเดตชื่อ–นามสกุลในบัญชีทันที
          </p>
          <div>
            <label htmlFor="req-note" className="text-xs font-medium text-slate-600">
              หมายเหตุถึงสมาชิก (ไม่บังคับ — ใช้ร่วมกับปุ่มด้านล่าง)
            </label>
            <textarea
              id="req-note"
              value={reqNote}
              onChange={(e) => setReqNote(e.target.value)}
              rows={2}
              className="mt-1 w-full max-w-lg rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="เช่น ตรวจเอกสารแล้วถูกต้อง"
            />
          </div>
          {reqErr ? <p className="text-sm text-red-600">{reqErr}</p> : null}
          {reqLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลด…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่มีคำขอที่รอดำเนินการ</p>
          ) : (
            <ul className="space-y-4">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    @{r.username || r.userId?.slice(0, 8) || "?"}{" "}
                    <span className="font-normal text-slate-600">
                      ปัจจุบัน: {r.currentFirstName} {r.currentLastName} → ขอเป็น{" "}
                      {r.requestedFirstName} {r.requestedLastName}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString("th-TH")} · ประเทศชื่อ{" "}
                    {r.countryCode === "TH" ? "ไทย" : r.countryCode}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-800">เหตุผล:</span> {r.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={reqBusyId === r.id}
                      onClick={() => handleApprove(r.id)}
                      className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                    >
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      disabled={reqBusyId === r.id}
                      onClick={() => handleReject(r.id)}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
