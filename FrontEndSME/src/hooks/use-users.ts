"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDanhSachNhanVien, fetchMeById } from "@/app/actions/users";

/** ================= Types =================
 * Backend của bạn đang trả:
 * - danh sách NV: { _id, ho_ten, chuc_vu: "Trưởng phòng", phong_ban: "Phòng Kế Toán" }
 * - me: có thể là object { chuc_vu: {ten,...}, phong_ban: {ten,...} } hoặc string
 */

export type NhanVienLite = {
  _id: string;
  ma_nv?: string;
  ho_ten: string;

  chuc_vu?: string;
  phong_ban?: string;

  chuc_vu_ten?: string;
  phong_ban_ten?: string;

  [key: string]: any;
};

export type MeUser = {
  _id?: string;
  ho_ten?: string;

  // có thể string hoặc object
  chuc_vu?: any;
  phong_ban?: any;

  chuc_vu_ten?: string;
  phong_ban_ten?: string;

  [key: string]: any;
};

/** ================= Helpers ================= */
function safeStr(v: any) {
  return String(v ?? "").trim();
}

// bóc "ten" từ object/string/array
function pickTenDeep(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return pickTenDeep(v[0]);
  if (typeof v === "object") {
    const direct = v.ten ?? v.name ?? v.title ?? v.label ?? v.value ?? v.text;
    if (direct != null) return String(direct).trim();
    if (v.data) return pickTenDeep(v.data);
    if (v.item) return pickTenDeep(v.item);
    return "";
  }
  return String(v).trim();
}

/** ================= Normalize ================= */
function normalizeMe(raw: any): MeUser | null {
  // backend có thể trả:
  // - user
  // - { data: user }
  // - { data: { data: user } }
  const u = raw?.data?.data ?? raw?.data ?? raw;
  if (!u || typeof u !== "object") return null;

  const chuc_vu_ten =
    safeStr(u?.chuc_vu_ten) || pickTenDeep(u?.chuc_vu) || safeStr(u?.chuc_vu);

  const phong_ban_ten =
    safeStr(u?.phong_ban_ten) ||
    pickTenDeep(u?.phong_ban) ||
    safeStr(u?.phong_ban);

  return {
    ...u,
    _id: u?._id ? String(u._id) : undefined,
    ho_ten: u?.ho_ten,
    chuc_vu: u?.chuc_vu,
    phong_ban: u?.phong_ban,
    chuc_vu_ten,
    phong_ban_ten,
  };
}

function normalizeNhanVienList(raw: any): NhanVienLite[] {
  // raw có thể là:
  // - { items: [...] }
  // - { data: { items: [...] } }
  // - { data: [...] }
  // - [...]
  const root = raw?.data ?? raw;

  const items =
    root?.items ??
    root?.data?.items ??
    root?.data ??
    (Array.isArray(root) ? root : []);

  if (!Array.isArray(items)) return [];

  return items
    .map((x: any) => {
      const _id = safeStr(x?._id ?? x?.id);
      const ma_nv = x?.ma_nv != null ? safeStr(x.ma_nv) : undefined;
      const ho_ten = safeStr(x?.ho_ten ?? x?.name);

      //  theo log backend của bạn: string luôn
      const chuc_vu = safeStr(x?.chuc_vu ?? x?.chucVu ?? x?.position);
      const phong_ban = safeStr(x?.phong_ban ?? x?.phongBan ?? x?.department);

      return {
        ...x,
        _id,
        ma_nv,
        ho_ten,
        chuc_vu,
        phong_ban,
        chuc_vu_ten: safeStr(x?.chuc_vu_ten) || chuc_vu,
        phong_ban_ten: safeStr(x?.phong_ban_ten) || phong_ban,
      };
    })
    .filter((x: NhanVienLite) => x._id && x.ho_ten);
}

/** ================= Hooks ================= */
export function useMeById(userId?: string) {
  return useQuery({
    queryKey: ["me-by-id", userId ?? ""],
    enabled: !!userId,
    retry: 0,
    staleTime: 30_000,
    queryFn: async () => {
      const raw = await fetchMeById(String(userId));
      const me = normalizeMe(raw);
      return me;
    },
  });
}

export function useDanhSachNhanVien(params?: {
  q?: string;
  phong_ban?: string;
}) {
  return useQuery({
    queryKey: ["danh-sach-nhan-vien", params?.q ?? "", params?.phong_ban ?? ""],
    retry: 0,
    staleTime: 30_000,
    queryFn: async () => {
      const raw = await fetchDanhSachNhanVien(params);

      const normalized = normalizeNhanVienList(raw);
      console.log(" useDanhSachNhanVien normalized:", {
        params,
        count: normalized.length,
        sample: normalized[0],
      });

      return { items: normalized };
    },
  });
}
