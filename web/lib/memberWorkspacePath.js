/** ระบบสมาชิกหลัก (iframe TailAdmin) — หลังล็อกอิน LINE */
export const MEMBER_WORKSPACE_PATH = "/member";

/** แผงแอดมิน React เดิม — หลังล็อกอินแอดมิน / ลิงก์ «แอดมิน» ในเมนูเว็บหลัก */
export const ADMIN_HOME_PATH = "/admin/panel";

/** แดชบอร์ดร้านค้าในเทมเพลต TailAdmin (Vue path `/` = Ecommerce) */
export const TAILADMIN_SHOP_DASHBOARD_START = "/";

/** หน้าโปรไฟล์ใน iframe */
export const TAILADMIN_PROFILE_START = "/profile";

/** เส้นทางสมาชิกใน iframe (Vue router) — หนึ่งเมนูหนึ่ง path */
export const TAILADMIN_MY_PRIZES_START = "/my-prizes";
export const TAILADMIN_MY_HEARTS_START = "/my-hearts";
export const TAILADMIN_MY_GAMES_START = "/my-games";
export const TAILADMIN_MY_SHOPS_START = "/my-shops";
export const TAILADMIN_MY_ORDERS_START = "/my-orders";
export const TAILADMIN_PRIZE_WITHDRAW_START = "/prize-withdraw-request";
export const TAILADMIN_HEARTS_TOP_UP_START = "/hearts-top-up";
export const TAILADMIN_GIVE_HEARTS_START = "/give-hearts";

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
