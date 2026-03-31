"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemberToken } from "../lib/memberApi";
import {
  apiAdminCentralGameActivate,
  apiAdminCentralGameDeactivate,
  apiAdminCentralGamesList
} from "../lib/rolesApi";
import { useMemberAuth } from "./MemberAuthProvider";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function gameStatusBadge(g) {
  if (g.isPublished) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900">
        เผยแพร่แล้ว
      </span>
    );
  }
  if (g.isActive) {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
        กำลังเปิดใช้
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      ร่าง
    </span>
  );
}

export default function AccountMyGamesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useMemberAuth();
  const [games, setGames] = useState([]);
  const [listErr, setListErr] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [publishSuccessBanner, setPublishSuccessBanner] = useState(false);

  async function loadGames() {
    setListLoading(true);
    setListErr("");
    const token = getMemberToken();
    if (!token) {
      setListLoading(false);
      return;
    }
    try {
      const data = await apiAdminCentralGamesList(token);
      setGames(data.games || []);
    } catch (e) {
      setListErr(e?.message || "โหลดรายการไม่สำเร็จ");
      setGames([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("published") !== "1") return;
    setPublishSuccessBanner(true);
    router.replace("/account/my-games", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/my-games");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadGames();
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function togglePublish(game, nextPublish) {
    const id = String(game?.id || "");
    if (!id || !UUID_RE.test(id)) return;
    const token = getMemberToken();
    if (!token) {
      setListErr("หมดเซสชัน — กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    setBusyId(id);
    setListErr("");
    try {
      if (nextPublish) {
        await apiAdminCentralGameActivate(token, id);
      } else {
        await apiAdminCentralGameDeactivate(token, id);
      }
      await loadGames();
    } catch (e) {
      setListErr(e?.message || "อัปเดตสถานะเกมไม่สำเร็จ");
    } finally {
      setBusyId("");
    }
  }

  if (loading || !user) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">เกมของฉัน</h2>
        <p className="mt-1 text-sm text-slate-600">
          เกมที่คุณสร้างจะเก็บไว้ในบัญชีนี้ — ล็อกเอาต์แล้วล็อกอินใหม่เกมยังอยู่ที่นี่
        </p>
      </div>

      <p className="text-sm">
        <Link
          href="/account/create-game"
          className="font-semibold text-brand-800 underline hover:text-brand-950"
        >
          + เปิดห้องเกมใหม่
        </Link>
      </p>

      {publishSuccessBanner ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold">เผยแพร่สำเร็จ</p>
          <p className="mt-1 text-emerald-900/90">
            เกมของคุณแสดงในรายการด้านล่างแล้ว — กด「ดูหน้าเล่น」หรือ「จัดการเกม」ได้ตามต้องการ
          </p>
        </div>
      ) : null}

      {listErr ? (
        <p className="text-sm text-red-600" role="alert">
          {listErr}
        </p>
      ) : null}

      {listLoading ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายการเกม…</p>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-600">
          <p>ยังไม่มีเกมที่สร้างจากบัญชีนี้</p>
          <p className="mt-2">
            <Link href="/account/create-game" className="font-semibold text-brand-800 underline">
              ไปหน้าเปิดห้องเกม
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {games.map((g) => {
            const id = g.id;
            const canPreview = Boolean(g.isPublished || g.isActive) && id && UUID_RE.test(id);
            return (
              <li
                key={id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{g.title || "ไม่มีชื่อ"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {gameStatusBadge(g)}
                    {g.gameCode ? (
                      <span className="text-xs text-slate-500">รหัส {g.gameCode}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPreview ? (
                    <Link
                      href={`/game/${encodeURIComponent(id)}`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      ดูหน้าเล่น
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === id || !id || !UUID_RE.test(id)}
                    onClick={() => togglePublish(g, !Boolean(g.isPublished || g.isActive))}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                      g.isPublished || g.isActive
                        ? "border border-slate-400 text-slate-800 hover:bg-slate-50"
                        : "bg-green-700 text-white hover:bg-green-800"
                    }`}
                  >
                    {busyId === id
                      ? "กำลังบันทึก…"
                      : g.isPublished || g.isActive
                        ? "หยุดเผยแพร่"
                        : "เผยแพร่"}
                  </button>
                  <Link
                    href={`/account/create-game?game=${encodeURIComponent(id)}#game-studio`}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    title="เพิ่มรางวัลใหม่ได้ แต่ไม่ควรแก้ไขรางวัลเดิม"
                  >
                    เพิ่มรางวัล
                  </Link>
                  <Link
                    href={`/account/create-game?game=${encodeURIComponent(id)}`}
                    className="rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-900"
                  >
                    จัดการเกม
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-slate-600">
        <Link href="/account" className="text-brand-800 underline hover:text-brand-950">
          ← ภาพรวมบัญชี
        </Link>
      </p>
    </div>
  );
}
