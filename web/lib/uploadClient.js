import { uploadUrl } from "./config";
import { getMemberToken } from "./memberApi";

/**
 * อัปโหลดรูปไป `/upload` (rewrite → API) พร้อม Bearer สมาชิก/แอดมิน
 * ห้ามตั้ง Content-Type เอง — เบราว์เซอร์ใส่ boundary ของ multipart
 *
 * @param {FormData} formData ต้องมี field ชื่อ `image`
 * @param {{ token?: string | null }} [opts] ระบุ token เองได้ ไม่ระบุจะใช้จาก localStorage
 * @returns {Promise<{ ok: true, publicUrl: string, fileName?: string }>}
 */
export async function postUploadFormData(formData, opts = {}) {
  const token = opts.token !== undefined ? opts.token : getMemberToken();
  /** @type {Record<string, string>} */
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(uploadUrl(), { method: "POST", body: formData, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || "อัปโหลดไม่สำเร็จ");
    err.status = res.status;
    throw err;
  }
  if (!data.publicUrl) {
    throw new Error("อัปโหลดไม่สำเร็จ — ไม่ได้รับ URL รูป");
  }
  return data;
}
