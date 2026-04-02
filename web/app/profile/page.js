import TailAdminEmbedPage from "../../components/TailAdminEmbedPage";

export const metadata = {
  title: "โปรไฟล์ (เทมเพลต) | HUAJAIY Workspace",
  description: "หน้าโปรไฟล์ TailAdmin — คนละหน้ากับโปรไฟล์สมาชิกที่ /account/profile"
};

export default function WorkspaceProfilePage() {
  return <TailAdminEmbedPage tailPath="/profile" />;
}
