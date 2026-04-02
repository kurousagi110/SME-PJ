"use server";

import { http } from "@/lib/http";

/** Helper: lấy data thuần, tương thích cả http wrapper trả data hoặc AxiosResponse */
function pickData(res: any) {
  return res?.data ?? res;
}

function extractErrorMessage(err: any) {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.data?.message ||
    err?.message;

  if (typeof msg === "string" && msg.trim()) return msg;
  try {
    return JSON.stringify(err?.response?.data ?? err);
  } catch {
    return "API error";
  }
}

/**  Chuẩn hoá: luôn trả { items: [] } */
function normalizeNhanVienList(raw: any): { items: any[] } {
  const root = pickData(raw);

  // Có thể là:
  // 1) { items: [...] }
  // 2) { data: { items: [...] } }
  // 3) { data: [...] }
  // 4) [...]  (hiếm)
  const items =
    root?.items ??
    root?.data?.items ??
    root?.data ??
    (Array.isArray(root) ? root : []);

  const arr = Array.isArray(items) ? items : [];

  //  flatten để FE chắc chắn có field tên
  const normalized = arr.map((x: any) => ({
    ...x,
    chuc_vu_ten: x?.chuc_vu_ten ?? x?.chuc_vu ?? x?.chucVu ?? "",
    phong_ban_ten: x?.phong_ban_ten ?? x?.phong_ban ?? x?.phongBan ?? "",
  }));

  return { items: normalized };
}

/**  Chuẩn hoá me: luôn trả object user */
function normalizeMe(raw: any) {
  const root = pickData(raw);

  // Có thể là:
  // 1) { data: user }
  // 2) { user: user }
  // 3) user
  const user = root?.data ?? root?.user ?? root;

  if (!user?._id) return null;

  return {
    ...user,
    chuc_vu_ten: user?.chuc_vu_ten ?? user?.chuc_vu ?? "",
    phong_ban_ten: user?.phong_ban_ten ?? user?.phong_ban ?? "",
  };
}

export async function fetchMeById(userId: string) {
  try {
    if (!userId) throw new Error("Thiếu userId");

    const res: any = await http.get(`/users/me/${userId}`);
    const me = normalizeMe(res);

    if (!me) throw new Error("Không lấy được thông tin user");

    return me;
  } catch (err: any) {
    throw new Error(
      extractErrorMessage(err) || "Lấy thông tin người dùng không thành công"
    );
  }
}

/**
 * Trả về chuẩn: { items: [...] }
 */
export async function fetchDanhSachNhanVien(params?: {
  q?: string;
  phong_ban?: string;
}) {
  try {
    const query = new URLSearchParams({
      ...(params?.q ? { q: params.q } : {}),
      ...(params?.phong_ban ? { phong_ban: params.phong_ban } : {}),
    });

    const qs = query.toString();
    const url = qs
      ? `/users/danh-sach-nhan-vien?${qs}`
      : "/users/danh-sach-nhan-vien";

    const res: any = await http.get(url);

    //  normalize cho FE dùng chắc chắn
    const data = normalizeNhanVienList(res);

    console.log(" fetchDanhSachNhanVien normalized:", {
      count: data.items.length,
      sample: data.items[0],
    });

    return data; // { items: [...] }
  } catch (err: any) {
    throw new Error(
      extractErrorMessage(err) || "Lấy danh sách nhân viên không thành công"
    );
  }
}

/**  NEW: /users/me không cần userId */
export async function fetchMe() {
  try {
    const res: any = await http.get("/users/me");
    const me = normalizeMe(res);

    if (!me) throw new Error("Không lấy được thông tin me");

    return me;
  } catch (err: any) {
    throw new Error(extractErrorMessage(err) || "Lấy thông tin me thất bại");
  }
}
