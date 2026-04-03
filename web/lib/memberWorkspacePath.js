/** ระบบสมาชิกหลัก (iframe TailAdmin) — หลังล็อกอิน LINE */
export const MEMBER_WORKSPACE_PATH = "/member";

/** แดชบอร์ดร้านค้าในเทมเพลต TailAdmin (Vue path `/` = Ecommerce) */
export const TAILADMIN_SHOP_DASHBOARD_START = "/";

/** หน้าโปรไฟล์ใน iframe */
export const TAILADMIN_PROFILE_START = "/profile";

/**
 * URL หน้าเชลล์สมาชิก/แอดมิน + query ให้ iframe เปิดเส้นทาง TailAdmin
 * @param {string} tailPath เช่น "/" หรือ "/profile"
 * @param {"admin"|"member"|"owner"|string} [role]
 */
export function workspaceShellUrl(tailPath, role) {
  const path =
    tailPath === "/" || tailPath === ""
      ? "/"
      : tailPath.startsWith("/")
        ? tailPath
        : `/${tailPath}`;
  const q = `huajaiy_start=${encodeURIComponent(path)}`;
  if (role === "admin") return `/admin?${q}`;
  return `/member?${q}`;
}
