import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import ThemeLabOrganic from "../../components/ThemeLabOrganic";

export const metadata = {
  title: "Theme Lab | HUAJAIY",
  description: "หน้าทดลองตกแต่ง UI โดยอิง template ภายนอกและปรับให้เข้ากับ HUAJAIY"
};

export default function ThemeLabPage() {
  return (
    <>
      <SiteHeader />
      <ThemeLabOrganic />
      <SiteFooter />
    </>
  );
}
