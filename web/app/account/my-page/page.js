import MemberMyPublicPageForm from "../../../components/MemberMyPublicPageForm";
import MemberStylePageShell from "../../../components/MemberStylePageShell";

export const metadata = {
  title: "ปรับแต่งเพจของฉัน | HUAJAIY",
  description: "แก้ไขรูปปก รูปโปรไฟล์ คำแนะนำ และลิงก์บนเพจสาธารณะ"
};

export default function MemberMyPublicPage() {
  return (
    <MemberStylePageShell>
      <MemberMyPublicPageForm />
    </MemberStylePageShell>
  );
}
