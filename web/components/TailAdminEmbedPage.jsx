"use client";

/**
 * แสดงแอป TailAdmin (Vue) ที่ build ไว้ใต้ /tailadmin-template/
 * @param {string} tailPath เช่น "" | "/calendar" | "/profile"
 */
export default function TailAdminEmbedPage({ tailPath = "" }) {
  const base = "/tailadmin-template";
  const path = String(tailPath || "").replace(/\/+$/, "");
  const src = path === "" || path === "/" ? `${base}/` : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  return (
    <main className="h-dvh min-h-0 w-full overflow-hidden bg-slate-100">
      <iframe title="HUAJAIY Workspace (TailAdmin)" src={src} className="h-full w-full border-0" />
    </main>
  );
}
