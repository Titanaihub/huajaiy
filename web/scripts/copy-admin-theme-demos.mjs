/**
 * คัดลอกผล build ของเทมเพลตหลังบ้านไปที่ web/public/
 * รันจากโฟลเดอร์ web หลัง build แทมเพลตแล้ว:
 *   node scripts/copy-admin-theme-demos.mjs
 *   node scripts/copy-admin-theme-demos.mjs tailadmin
 *   node scripts/copy-admin-theme-demos.mjs dashui
 */
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const repoRoot = path.join(webRoot, "..");

function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.error(`ไม่พบโฟลเดอร์: ${src}`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`คัดลอกแล้ว: ${src} → ${dest}`);
}

const tailadminSrc = path.join(repoRoot, "tailadmin-vuejs-1.0.0", "dist");
const tailadminDest = path.join(webRoot, "public", "tailadmin-template");

const dashOut = path.join(repoRoot, "DashUI-1.0.0", "out");
const dashNested = path.join(dashOut, "dashui-template");
const dashuiDest = path.join(webRoot, "public", "dashui-template");

function copyDashui() {
  if (existsSync(dashNested) && statSync(dashNested).isDirectory()) {
    copyDir(dashNested, dashuiDest);
    return;
  }
  if (existsSync(dashOut) && statSync(dashOut).isDirectory()) {
    copyDir(dashOut, dashuiDest);
    return;
  }
  console.error(`ไม่พบผล export ของ DashUI ที่ ${dashNested} หรือ ${dashOut}`);
  process.exit(1);
}

const arg = process.argv[2];
if (arg === "tailadmin") {
  copyDir(tailadminSrc, tailadminDest);
} else if (arg === "dashui") {
  copyDashui();
} else {
  copyDir(tailadminSrc, tailadminDest);
  copyDashui();
}
