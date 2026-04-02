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
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200/80">
        เผยแพร่แล้ว
      </span>
    );
  }
  if (g.isActive) {
    return (
      <span className="rounded-full bg-hui-pageTop px-2.5 py-0.5 text-sm font-medium text-hui-section ring-1 ring-hui-border">
        กำลังเปิดใช้
      </span>
    );
  }
  return (
    <span className="rounded-full bg-hui-pageTop px-2 py-0.5 text-sm font-medium text-hui-body">
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
      router.replace("/hui/login?next=/account/my-games");
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
      <p className="text-sm text-hui-muted" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hui-section sm:text-2xl">เกมของฉัน</h2>
        <p className="mt-1 text-sm text-hui-body">
          เกมที่คุณสร้างจะเก็บไว้ในบัญชีนี้ — ล็อกเอาต์แล้วล็อกอินใหม่เกมยังอยู่ที่นี่
        </p>
      </div>

      <p className="text-sm">
        <Link
          href="/account/create-game"
          className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
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
        <p className="text-sm text-hui-muted">กำลังโหลดรายการเกม…</p>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hui-border bg-hui-surface/90 p-6 text-center text-sm text-hui-muted shadow-soft">
          <p>ยังไม่มีเกมที่สร้างจากบัญชีนี้</p>
          <p className="mt-2">
            <Link
              href="/account/create-game"
              className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
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
                className="flex flex-col gap-3 rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="hui-card-title">{g.title || "ไม่มีชื่อ"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {gameStatusBadge(g)}
                    {g.gameCode ? (
                      <span className="hui-card-meta">รหัส {g.gameCode}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPreview ? (
                    <Link
                      href={`/game/${encodeURIComponent(id)}`}
                      className="rounded-2xl border border-hui-border bg-white px-3 py-2 text-sm font-medium text-hui-body shadow-soft hover:bg-hui-pageTop"
                    >
                      ดูหน้าเล่น
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === id || !id || !UUID_RE.test(id)}
                    onClick={() => togglePublish(g, !Boolean(g.isPublished || g.isActive))}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                      g.isPublished || g.isActive
                        ? "border border-hui-border bg-white text-hui-body shadow-soft hover:bg-hui-pageTop"
                        : "bg-emerald-600 text-white shadow-soft hover:bg-emerald-700"
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
                    className="rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
                    title="เพิ่มรางวัลใหม่ได้ แต่ไม่ควรแก้ไขรางวัลเดิม"
                  >
                    เพิ่มรางวัล
                  </Link>
                  <Link
                    href={`/account/create-game?game=${encodeURIComponent(id)}`}
                    className="hui-btn-primary px-3 py-2 text-sm"
                  >
                    จัดการเกม
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-hui-body">
        <Link
          href="/account"
          className="text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta hover:brightness-95"
        >
          ← ภาพรวมบัญชี
        </Link>
      </p>
    </div>
  );
}
