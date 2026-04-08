"use strict";

const sharp = require("sharp");

const MAX_DIMENSION = 4096;
/** กันภาพขนาดมหาศาล (decompression bomb) */
const MAX_PIXELS = 16_777_216;
/** หลัง re-encode ไม่ให้เกิน (ใกล้เคียงขีด multer) */
const MAX_OUTPUT_BYTES = 7 * 1024 * 1024;

function sharpInputOptions() {
  return {
    failOnError: true,
    limitInputPixels: MAX_PIXELS,
    sequentialRead: true,
    /** GIF / animated WebP: ใช้เฟรมแรกเท่านั้น */
    pages: 1
  };
}

/**
 * ตรวจขนาด + re-encode เพื่อตัด EXIF/เมตาดาต้า และ payload แฝงในรูป
 * @param {Buffer} input
 * @returns {Promise<{ buffer: Buffer, mime: string }>}
 */
async function normalizeUploadImageBuffer(input) {
  if (!Buffer.isBuffer(input) || input.length < 12) {
    const e = new Error("ไฟล์รูปไม่ถูกต้อง");
    e.code = "INVALID_IMAGE";
    throw e;
  }

  const meta = await sharp(input, sharpInputOptions()).metadata();

  if (!meta.width || !meta.height || meta.width < 1 || meta.height < 1) {
    const e = new Error("ไม่สามารถอ่านขนาดรูปได้");
    e.code = "INVALID_IMAGE";
    throw e;
  }

  if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
    const e = new Error(`รูปต้องไม่เกิน ${MAX_DIMENSION}×${MAX_DIMENSION} พิกเซล`);
    e.code = "IMAGE_TOO_LARGE";
    throw e;
  }

  const pixels = meta.width * meta.height;
  if (pixels > MAX_PIXELS) {
    const e = new Error("รูปมีจำนวนพิกเซลมากเกินกำหนด");
    e.code = "IMAGE_TOO_LARGE";
    throw e;
  }

  const pipeline = sharp(input, sharpInputOptions()).rotate();

  const fmt = meta.format;
  const usePng =
    fmt === "gif" ||
    fmt === "png" ||
    (fmt === "webp" && meta.hasAlpha) ||
    Boolean(meta.hasAlpha);

  let outBuf;
  if (usePng) {
    outBuf = await pipeline.png({ compressionLevel: 9, effort: 6 }).toBuffer();
  } else {
    outBuf = await pipeline
      .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();
  }

  if (outBuf.length > MAX_OUTPUT_BYTES) {
    const e = new Error(
      "หลังประมวลผลไฟล์ยังใหญ่เกินไป กรุณาลดความละเอียดหรือบีบอัดรูป"
    );
    e.code = "IMAGE_TOO_LARGE";
    throw e;
  }

  const mime = usePng ? "image/png" : "image/jpeg";
  return { buffer: outBuf, mime };
}

/**
 * @param {Error} err
 * @returns {string|null} ข้อความไทยสำหรับ 400 หรือ null ถ้าไม่ใช่ข้อผิดพลาดจากรูป
 */
function clientMessageForImageError(err) {
  if (!err) return null;
  if (err.code === "INVALID_IMAGE" || err.code === "IMAGE_TOO_LARGE") {
    return err.message;
  }
  const m = String(err.message || "");
  if (
    /Input file|unsupported image|unsupported format|corrupt|Vips|extract_area|bad seek|load_buffer/i.test(
      m
    )
  ) {
    return "ไฟล์รูปเสียหรือไม่รองรับ";
  }
  return null;
}

module.exports = {
  normalizeUploadImageBuffer,
  clientMessageForImageError
};
