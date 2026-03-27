export function getApiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com"
  );
}
