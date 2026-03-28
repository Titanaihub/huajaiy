"use client";

import { useCallback, useEffect, useState } from "react";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminApproveNameChange,
  apiAdminListMembers,
  apiAdminMember,
  apiAdminNameChangeRequests,
  apiAdminRejectNameChange
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
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");

  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqBusyId, setReqBusyId] = useState(null);

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

  async function openDetail(id) {
    setSelectedId(id);
    setDetail(null);
    setDetailErr("");
    const token = getMemberToken();
    if (!token) return;
    setDetailLoading(true);
    try {
      const data = await apiAdminMember(token, id);
      setDetail(data.user);
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

  const maxOffset = Math.max(0, total - PAGE_SIZE);
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
            พบ {total} รายการ · หน้าละ {PAGE_SIZE} รายการ
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
                    <th className="px-3 py-2">บทบาท</th>
                    <th className="px-3 py-2">สมัคร</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
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
                            ดูรายละเอียด
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                รายละเอียดสมาชิก
              </h3>
              {detailLoading ? (
                <p className="mt-2 text-sm text-slate-500">กำลังโหลด…</p>
              ) : detailErr ? (
                <p className="mt-2 text-sm text-red-600">{detailErr}</p>
              ) : detail ? (
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">id</dt>
                    <dd className="font-mono text-xs break-all">{detail.id}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">ยูสเซอร์</dt>
                    <dd className="font-medium">{detail.username}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">ชื่อ–นามสกุล</dt>
                    <dd>
                      {detail.firstName} {detail.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">เบอร์</dt>
                    <dd>{detail.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">ประเทศชื่อ</dt>
                    <dd>{detail.countryCode === "TH" ? "ไทย" : detail.countryCode}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">บทบาท</dt>
                    <dd>{roleLabel(detail.role)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">เพศ</dt>
                    <dd>{detail.gender || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">วันเกิด</dt>
                    <dd>{detail.birthDate || "—"}</dd>
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
              ) : null}
            </div>
          ) : null}
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
                    <span className="font-medium text-slate-800">เหตุผล:</span>{" "}
                    {r.reason}
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
