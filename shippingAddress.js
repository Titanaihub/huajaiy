const MAX_FIELD = 200;
const MAX_POSTAL = 10;

const KEYS = [
  "houseNo",
  "moo",
  "road",
  "subdistrict",
  "district",
  "province",
  "postalCode"
];

function emptyParts() {
  return {
    houseNo: "",
    moo: "",
    road: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: ""
  };
}

/** รวมเป็นบรรทัดเดียวสำหรับคอลัมน์ shipping_address (ออเดอร์ / ตะกร้า) */
function formatShippingLines(parts) {
  if (!parts) return null;
  const segs = [];
  if (parts.houseNo) segs.push(`บ้านเลขที่ ${parts.houseNo}`);
  if (parts.moo) segs.push(`หมู่ ${parts.moo}`);
  if (parts.road) segs.push(`ถนน ${parts.road}`);
  if (parts.subdistrict) segs.push(`ตำบล/แขวง ${parts.subdistrict}`);
  if (parts.district) segs.push(`อำเภอ/เขต ${parts.district}`);
  if (parts.province) segs.push(`จังหวัด ${parts.province}`);
  if (parts.postalCode) segs.push(`รหัสไปรษณีย์ ${parts.postalCode}`);
  return segs.length ? segs.join(" ") : null;
}

/**
 * จากแถว DB: ถ้ายังไม่มีช่องแยก แต่มี shipping_address เดิม → โชว์ในช่องบ้านเลขที่
 */
function partsFromRow(row) {
  const p = {
    houseNo: String(row.shipping_house_no || "").trim(),
    moo: String(row.shipping_moo || "").trim(),
    road: String(row.shipping_road || "").trim(),
    subdistrict: String(row.shipping_subdistrict || "").trim(),
    district: String(row.shipping_district || "").trim(),
    province: String(row.shipping_province || "").trim(),
    postalCode: String(row.shipping_postal_code || "").trim()
  };
  const anyStructured = KEYS.some((k) => p[k].length > 0);
  if (anyStructured) return p;
  const leg = String(row.shipping_address || "").trim();
  if (leg) return { ...emptyParts(), houseNo: leg };
  return emptyParts();
}

function dbValuesFromParts(parts) {
  const clip = (s, max) => {
    const t = String(s || "").trim();
    if (!t) return null;
    return t.slice(0, max);
  };
  return {
    shipping_address: formatShippingLines(parts),
    shipping_house_no: clip(parts.houseNo, MAX_FIELD),
    shipping_moo: clip(parts.moo, MAX_FIELD),
    shipping_road: clip(parts.road, MAX_FIELD),
    shipping_subdistrict: clip(parts.subdistrict, MAX_FIELD),
    shipping_district: clip(parts.district, MAX_FIELD),
    shipping_province: clip(parts.province, MAX_FIELD),
    shipping_postal_code: clip(parts.postalCode, MAX_POSTAL)
  };
}

module.exports = {
  KEYS,
  MAX_FIELD,
  MAX_POSTAL,
  emptyParts,
  formatShippingLines,
  partsFromRow,
  dbValuesFromParts
};
