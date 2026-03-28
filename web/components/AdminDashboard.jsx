"use client";

import { useCallback, useEffect, useState } from "react";
import AdminHeartPackagesPanel from "./AdminHeartPackagesPanel";
import AdminHeartPurchasesPanel from "./AdminHeartPurchasesPanel";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminAdjustMemberHearts,
  apiAdminApproveNameChange,
  apiAdminListMembers,
  apiAdminMemberFull,
  apiAdminNameChangeRequests,
  apiAdminRejectNameChange,
  apiAdminSetMemberPassword,
  apiAdminShops,
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
  /** @type {null | { user: object, orders: array, shops: array, stats: object, nameChangeRequestPending: boolean, heartsNote?: string }} */
  const [memberFull, setMemberFull] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [heartPinkDelta, setHeartPinkDelta] = useState("");
  const [heartRedDelta, setHeartRedDelta] = useState("");
  const [heartBusy, setHeartBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [panelMsg, setPanelMsg] = useState("");

  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqBusyId, setReqBusyId] = useState(null);

  const [shopsAll, setShopsAll] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsErr, setShopsErr] = useState("");

  /** @type {null | { heartCost: number, cardCount: number, prizes: array, activeSessions: number, sessionsPlaying: number, sessionsFinished: number, pruneAfterMs: number, persistenceNote?: string }} */
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

  async function reloadMemberFull(id) {
    const token = getMemberToken();
    if (!token || !id) return;
    const data = await apiAdminMemberFull(token, id);
    setMemberFull({
      user: data.user,
      orders: data.orders || [],
      shops: data.shops || [],
      stats: data.stats || {},
      nameChangeRequestPending: Boolean(data.nameChangeRequestPending),
      heartsNote: data.heartsNote
    });
  }

  async function openDetail(id) {
    setSelectedId(id);
    setMemberFull(null);
    setDetailErr("");
    setPanelMsg("");
    setHeartPinkDelta("");
    setHeartRedDelta("");
    setNewPassword("");
    const token = getMemberToken();
    if (!token) return;
    setDetailLoading(true);
    try {
      await reloadMemberFull(id);
    } catch (e) {
      setDetailErr(e.message || String(e));
    } finally {
      setDetailLoading(false);
    }
  }

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

  async function submitHeartAdjust(e) {
    e.preventDefault();
    if (!selectedId) return;
    const pd = parseInt(heartPinkDelta, 10);
    const rd = parseInt(heartRedDelta, 10);
    const pinkDelta = Number.isFinite(pd) ? pd : 0;
    const redDelta = Number.isFinite(rd) ? rd : 0;
    if (pinkDelta === 0 && redDelta === 0) {
      setPanelMsg("ใส่ตัวเลขเต็มอย่างน้อยหนึ่งช่อง (ชมพูหรือแดง) — บวกเพิ่ม ลบลด");
      return;
    }
    const token = getMemberToken();
    if (!token) return;
    setHeartBusy(true);
    setPanelMsg("");
    try {
      await apiAdminAdjustMemberHearts(token, selectedId, { pinkDelta, redDelta });
      setHeartPinkDelta("");
      setHeartRedDelta("");
      await reloadMemberFull(selectedId);
      await loadMembers();
      setPanelMsg("ปรับหัวใจในระบบแล้ว (ฟรี — ไม่ผ่านสลิป)");
    } catch (err) {
      setPanelMsg(err.message || String(err));
    } finally {
      setHeartBusy(false);
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
            พบ {total} รายการ · หน้าละ {PAGE_SIZE} รายการ · หัวใจชมพู/แดง = ยอดบนเซิร์ฟเวอร์
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
                    <th className="px-3 py-2 text-rose-600">ชมพู</th>
                    <th className="px-3 py-2 text-red-700">แดง</th>
                    <th className="px-3 py-2">บทบาท</th>
                    <th className="px-3 py-2">สมัคร</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  ) : (
                    list.map((u) => (
                      <tr
                        key={u.id}
                        className={`border-b border-slate-100 ${
                          selectedId === u.id ? "bg-brand-50/60" : ""
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                        <td className="px-3 py-2">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-3 py-2">{u.phone}</td>
                        <td className="px-3 py-2 font-medium text-rose-600">
                          {u.pinkHeartsBalance ?? 0}
                        </td>
                        <td className="px-3 py-2 font-medium text-red-700">
                          {u.redHeartsBalance ?? 0}
                        </td>
                        <td className="px-3 py-2">{roleLabel(u.role)}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString("th-TH")
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => openDetail(u.id)}
                            className="text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                          >
                            ดูทั้งหมด
                          </button>
                        </td>
                      </tr>
                    ))
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
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">id</dt>
                      <dd className="font-mono text-xs break-all">{detail.id}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">ยูสเซอร์</dt>
                      <dd className="font-medium">{detail.username}</dd>
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
                      <dt className="text-slate-500">หัวใจแดง (DB)</dt>
                      <dd className="text-lg font-semibold text-red-700">
                        {detail.redHeartsBalance ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">รวม</dt>
                      <dd className="font-medium text-slate-800">
                        {(detail.pinkHeartsBalance ?? 0) + (detail.redHeartsBalance ?? 0)}
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
                    <div>
                      <dt className="text-slate-500">รหัสผ่าน</dt>
                      <dd className="text-slate-700">{detail.passwordNote}</dd>
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <h4 className="text-xs font-semibold uppercase text-slate-600">
                      เติมหัวใจให้สมาชิก (ฟรี — ไม่ผ่านสลิป)
                    </h4>
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
                        <label className="block text-[10px] font-medium text-red-700">แดง Δ</label>
                        <input
                          type="number"
                          value={heartRedDelta}
                          onChange={(e) => setHeartRedDelta(e.target.value)}
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
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="รหัสใหม่ (อย่างน้อย 6 ตัว)"
                        className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        autoComplete="new-password"
                      />
                      <button
                        type="submit"
                        disabled={passBusy}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                      >
                        {passBusy ? "…" : "ตั้งรหัส"}
                      </button>
                    </form>
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
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : tab === "shops" ? (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">
            ร้านในตาราง <code className="rounded bg-slate-100 px-1">shops</code> — เชื่อมเจ้าของด้วย{" "}
            <code className="rounded bg-slate-100 px-1">owner_user_id</code>
          </p>
          {shopsErr ? <p className="text-sm text-red-600">{shopsErr}</p> : null}
          {shopsLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลด…</p>
          ) : shopsAll.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีร้านในฐานข้อมูล</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">ชื่อร้าน</th>
                    <th className="px-3 py-2">slug</th>
                    <th className="px-3 py-2">เจ้าของ (ยูสเซอร์)</th>
                    <th className="px-3 py-2">สร้างเมื่อ</th>
                  </tr>
                </thead>
                <tbody>
                  {shopsAll.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.slug}</td>
                      <td className="px-3 py-2">{s.ownerUsername || "—"}</td>
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
          <p className="text-sm text-slate-600">
            เกมพลิกการ์ดที่หน้า <code className="rounded bg-slate-100 px-1">/game</code> — รางวัลและจำนวนการ์ดต่อประเภทกำหนดในไฟล์{" "}
            <code className="rounded bg-slate-100 px-1">gameSession.js</code> (ค่า <code className="rounded bg-slate-100 px-1">PRIZES</code>)
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
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <dt className="text-xs font-semibold uppercase text-slate-500">หัวใจต่อรอบ (GAME_HEART_COST)</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">{gameInfo.heartCost}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <dt className="text-xs font-semibold uppercase text-slate-500">จำนวนการ์ดบนกระดาน</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">{gameInfo.cardCount}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Session ที่ยังอยู่ในหน่วยความจำ</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    ทั้งหมด {gameInfo.activeSessions} · กำลังเล่น {gameInfo.sessionsPlaying} · จบแล้วยังไม่หมดอายุ{" "}
                    {gameInfo.sessionsFinished}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <dt className="text-xs font-semibold uppercase text-slate-500">ลบ session เก่าหลัง</dt>
                  <dd className="mt-1 text-slate-800">
                    {Math.round((gameInfo.pruneAfterMs || 0) / 60000)} นาที (ไม่ได้ใช้งาน)
                  </dd>
                </div>
              </dl>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">รางวัล — เปิดครบตามจำนวนใต้คอลัมน์ &quot;ต้องครบ&quot; ถึงชนะ</h3>
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2">key</th>
                        <th className="px-3 py-2">รางวัล</th>
                        <th className="px-3 py-2">ต้องครบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gameInfo.prizes || []).map((p) => (
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
          ) : (
            <p className="text-sm text-slate-500">ไม่มีข้อมูล</p>
          )}
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
