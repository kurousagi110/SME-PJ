"use server";

export async function lookupPortalAction(code: string, phone: string) {
  const baseUrl = (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000/api/v1"
  ).replace(/\/+$/, "");

  try {
    const url = `${baseUrl}/portal/lookup?code=${encodeURIComponent(code.trim())}&phone=${encodeURIComponent(phone.trim())}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      return { success: false, error: json.message || "Không tìm thấy thông tin phù hợp" };
    }
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi kết nối máy chủ tra cứu" };
  }
}
