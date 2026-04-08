import { redirect } from "next/navigation";

export const metadata = {
  title: "สมัครสมาชิก | HUAJAIY",
  description: "สมัครสมาชิกผ่าน LINE เท่านั้น"
};

/** สมัครผ่าน LINE เท่านั้น — ไม่มีฟอร์มสมัครด้วยยูสเซอร์ */
export default function RegisterPage() {
  redirect("/login/line");
}
