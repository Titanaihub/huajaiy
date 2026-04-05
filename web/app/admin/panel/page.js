import { redirect } from "next/navigation";

/** เข้าแอดมินหลักที่ /admin — URL นี้เหลือไว้รองรับลิงก์เก่าเท่านั้น */
export default function AdminPanelRedirectPage() {
  redirect("/admin");
}
