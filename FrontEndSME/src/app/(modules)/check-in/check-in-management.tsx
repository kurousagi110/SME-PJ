"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDanhSachNhanVien } from "@/hooks/use-users";
import { useMyProfile } from "@/hooks/use-account";
import { myProfile } from "@/app/actions/auth";
import { useChamCongByDate, useUpsertChamCong } from "@/hooks/check-in";

// ===================== Types =====================
type NhanVienLite = {
  _id: string;
  ma_nv?: string;
  ho_ten: string;

  chuc_vu?: any;
  phong_ban?: any;

  chuc_vu_ten?: string;
  phong_ban_ten?: string;
};

type MeUser = {
  _id: string;
  ho_ten?: string;
  chuc_vu?: any;
  phong_ban?: any;
};

type ChamCongRecord = {
  _id?: string;
  ma_nv?: string;
  user_id?: string;
  ngay_thang?: any;

  gio_check_in?: string | null;
  gio_check_out?: string | null;
  so_gio_lam?: number;
  ghi_chu?: string;
};

type RowUI = {
  key_nv: string; // ma_nv hoặc _id fallback
  user_id: string;

  ho_ten: string;
  chuc_vu: string;
  phong_ban: string;

  ngay_thang: string;
  gio_check_in: string;
  gio_check_out: string;
  so_gio_lam: number;
  ghi_chu: string;
  dirty: boolean;
};

const EMPTY_CC: ChamCongRecord[] = [];

// ===================== Helpers =====================
function safeStr(v: any) {
  return String(v ?? "").trim();
}

function nowHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function calcHours(ci: string, co: string) {
  if (!ci || !co) return 0;
  const [h1, m1] = ci.split(":").map(Number);
  const [h2, m2] = co.split(":").map(Number);
  const t1 = h1 * 60 + m1;
  const t2 = h2 * 60 + m2;
  const diff = t2 - t1;
  return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0;
}

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

function getPhongBanTen(nv: any) {
  return (
    safeStr(nv?.phong_ban_ten) ||
    pickTenDeep(nv?.phong_ban) ||
    safeStr(nv?.phong_ban?.ten) ||
    safeStr(nv?.phongBan_ten) ||
    pickTenDeep(nv?.phongBan) ||
    "-"
  );
}

function getChucVuTen(nv: any) {
  return (
    safeStr(nv?.chuc_vu_ten) ||
    pickTenDeep(nv?.chuc_vu) ||
    safeStr(nv?.chuc_vu?.ten) ||
    safeStr(nv?.chucVu_ten) ||
    pickTenDeep(nv?.chucVu) ||
    "-"
  );
}

function getNvKey(nv: NhanVienLite) {
  const ma = safeStr(nv.ma_nv);
  if (ma) return ma;
  return safeStr(nv._id);
}

function normalizeMe(raw: any): MeUser | null {
  const r = raw?.data ?? raw;
  const user = r?.data?.data ?? r?.data ?? r;
  if (!user?._id) return null;
  return {
    _id: String(user._id),
    ho_ten: user.ho_ten,
    chuc_vu: user.chuc_vu,
    phong_ban: user.phong_ban,
  };
}

// ===================== Component =====================
export function ChamCongManagement() {
  const [ngay, setNgay] = useState(format(new Date(), "yyyy-MM-dd"));

  // ===== me =====
  // const meQuery = useQuery({
  //   queryKey: ["me-profile"],
  //   queryFn: async () => {
  //     const res = await myProfile();
  //     if (!res?.success) throw new Error("Không lấy được thông tin tài khoản");
  //     const me = normalizeMe(res?.data);
  //     if (!me) throw new Error("Thông tin tài khoản không hợp lệ");
  //     return me;
  //   },
  //   staleTime: 30_000,
  //   retry: 0,
  // });

  const meQuery = useMyProfile();
  console.log("Data meQuery", meQuery);
  const me = meQuery.data;

  const myPhongBan = useMemo(() => pickTenDeep(me?.phong_ban), [me]);
  const myChucVu = useMemo(() => pickTenDeep(me?.chuc_vu), [me]);

  const isDirectorDepartment = useMemo(
    () => safeStr(myPhongBan) === "Phòng giám đốc",
    [myPhongBan]
  );

  const canEdit = useMemo(() => {
    if (isDirectorDepartment) return true;
    return safeStr(myChucVu) === "Trưởng phòng";
  }, [isDirectorDepartment, myChucVu]);

  // ===== Filter (chỉ giám đốc) =====
  const [filterPhongBan, setFilterPhongBan] = useState("");
  const [filterChucVu, setFilterChucVu] = useState("");

  useEffect(() => {
    if (!isDirectorDepartment) {
      setFilterPhongBan("");
      setFilterChucVu("");
    }
  }, [isDirectorDepartment]);

  // ===== NV list =====
  const nvParams = useMemo(() => {
    if (isDirectorDepartment) return {};
    return myPhongBan ? { phong_ban: myPhongBan } : {};
  }, [isDirectorDepartment, myPhongBan]);

  const { data: nvData, isLoading: nvLoading } = useDanhSachNhanVien(nvParams);

  const nhanVienList: NhanVienLite[] = useMemo(() => {
    const items = nvData?.items ?? [];
    if (!Array.isArray(items)) return [];

    return items
      .map((x: any) => {
        const _id = String(x?._id ?? "");
        const ma_nv = x?.ma_nv != null ? String(x.ma_nv) : undefined;
        const ho_ten = String(x?.ho_ten ?? x?.name ?? "").trim();

        const chuc_vu = x?.chuc_vu ?? x?.chucVu ?? x?.position;
        const phong_ban = x?.phong_ban ?? x?.phongBan ?? x?.department;

        return {
          _id,
          ma_nv,
          ho_ten,
          chuc_vu,
          phong_ban,
          chuc_vu_ten: x?.chuc_vu_ten,
          phong_ban_ten: x?.phong_ban_ten,
        };
      })
      .filter((x) => x._id && x.ho_ten);
  }, [nvData]);

  useEffect(() => {
    const items = (nvData?.items ?? []) as any[];
    if (Array.isArray(items) && items[0]) {
      console.log(" DEBUG NV RAW item[0] =", items[0]);
      console.log(" DEBUG NV fields =", {
        ma_nv: items[0]?.ma_nv,
        chuc_vu: items[0]?.chuc_vu,
        chuc_vu_ten: items[0]?.chuc_vu_ten,
        phong_ban: items[0]?.phong_ban,
        phong_ban_ten: items[0]?.phong_ban_ten,
      });
    } else {
      console.log(" DEBUG NV RAW items is not array:", items);
    }
  }, [nvData]);

  const phongBanOptions = useMemo(() => {
    const set = new Set<string>();
    for (const nv of nhanVienList) {
      const pb = getPhongBanTen(nv);
      if (pb && pb !== "-") set.add(pb);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [nhanVienList]);

  const chucVuOptions = useMemo(() => {
    const set = new Set<string>();
    for (const nv of nhanVienList) {
      const cv = getChucVuTen(nv);
      if (cv && cv !== "-") set.add(cv);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [nhanVienList]);

  const filteredNhanVien = useMemo(() => {
    if (!isDirectorDepartment) return nhanVienList;

    return nhanVienList.filter((nv) => {
      const pb = getPhongBanTen(nv);
      const cv = getChucVuTen(nv);

      if (filterPhongBan && pb !== filterPhongBan) return false;
      if (filterChucVu && cv !== filterChucVu) return false;
      return true;
    });
  }, [isDirectorDepartment, nhanVienList, filterPhongBan, filterChucVu]);

  // ===== chấm công theo NGÀY =====
  const ccQuery = useChamCongByDate(ngay);

  const chamCongItems: ChamCongRecord[] = useMemo(() => {
    return (ccQuery.data?.items as ChamCongRecord[] | undefined) ?? EMPTY_CC;
  }, [ccQuery.data?.items]);

  const ccByKeyNv = useMemo(() => {
    const m = new Map<string, ChamCongRecord>();
    for (const r of chamCongItems) {
      const key =
        safeStr(r?.ma_nv) || safeStr(r?.user_id) || safeStr((r as any)?._id);
      if (key) m.set(key, r);
    }
    return m;
  }, [chamCongItems]);

  // ===== rows =====
  const [rows, setRows] = useState<RowUI[]>([]);

  useEffect(() => {
    if (!filteredNhanVien.length) {
      setRows([]);
      return;
    }

    const next: RowUI[] = filteredNhanVien.map((nv) => {
      const key_nv = getNvKey(nv);
      const rec = ccByKeyNv.get(key_nv);

      const ci = String(rec?.gio_check_in ?? "");
      const co = String(rec?.gio_check_out ?? "");
      const soGio =
        rec?.so_gio_lam !== undefined
          ? Number(rec.so_gio_lam) || 0
          : calcHours(ci, co);

      return {
        key_nv,
        user_id: String(nv._id),

        ho_ten: nv.ho_ten,
        chuc_vu: getChucVuTen(nv),
        phong_ban: getPhongBanTen(nv),

        ngay_thang: ngay,
        gio_check_in: ci,
        gio_check_out: co,
        so_gio_lam: soGio,
        ghi_chu: String(rec?.ghi_chu ?? ""),
        dirty: false,
      };
    });

    setRows(next);
  }, [filteredNhanVien, ccByKeyNv, ngay]);

  useEffect(() => {
    if (me) console.log(" DEBUG ME =", me, { myChucVu, myPhongBan });
  }, [me, myChucVu, myPhongBan]);

  useEffect(() => {
    if (rows.length) console.log(" DEBUG ROWS sample =", rows[0]);
  }, [rows]);

  const upsertMut = useUpsertChamCong(ngay);

  const patchRow = (key_nv: string, patch: Partial<RowUI>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key_nv === key_nv ? { ...r, ...patch, dirty: true } : r
      )
    );
  };

  // ===== actions =====
  const handleCheckIn = (r: RowUI) => {
    if (!canEdit) return toast.error("Bạn không có quyền chấm công");
    const t = nowHHmm();
    const late = t > "08:00" ? `Đi trễ (${t})` : "";
    patchRow(r.key_nv, { gio_check_in: t, ghi_chu: r.ghi_chu || late });
  };

  const handleCheckOut = (r: RowUI) => {
    if (!canEdit) return toast.error("Bạn không có quyền chấm công");
    const t = nowHHmm();
    patchRow(r.key_nv, {
      gio_check_out: t,
      so_gio_lam: calcHours(r.gio_check_in, t),
    });
  };

  const handleSaveRow = async (r: RowUI) => {
    if (!canEdit) return toast.error("Bạn không có quyền chấm công");

    try {
      await upsertMut.mutateAsync({
        ma_nv: r.key_nv,
        ngay_thang: r.ngay_thang,
        gio_check_in: r.gio_check_in || undefined,
        gio_check_out: r.gio_check_out || undefined,
        so_gio_lam: Number(r.so_gio_lam) || 0,
        ghi_chu: r.ghi_chu || "",
      });

      toast.success("Đã lưu");
      setRows((prev) =>
        prev.map((x) => (x.key_nv === r.key_nv ? { ...x, dirty: false } : x))
      );
    } catch (e: any) {
      toast.error(e?.message || "Lưu thất bại");
      console.error("❌ upsert error:", e);
    }
  };

  const loading = meQuery.isLoading || nvLoading || ccQuery.isLoading;

  return (
    <div className="p-6 space-y-4">
      {/* ===== header ===== */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="date"
            className="w-[180px]"
            value={ngay}
            onChange={(e) => setNgay(e.target.value)}
          />

          {/*  filter chỉ giám đốc */}
          {isDirectorDepartment ? (
            <>
              <select
                value={filterPhongBan}
                onChange={(e) => setFilterPhongBan(e.target.value)}
                className="h-10 rounded-md border px-3 text-sm"
                title="Lọc theo phòng ban"
              >
                <option value="">Tất cả phòng ban</option>
                {phongBanOptions.map((pb) => (
                  <option key={pb} value={pb}>
                    {pb}
                  </option>
                ))}
              </select>

              <select
                value={filterChucVu}
                onChange={(e) => setFilterChucVu(e.target.value)}
                className="h-10 rounded-md border px-3 text-sm"
                title="Lọc theo chức vụ"
              >
                <option value="">Tất cả chức vụ</option>
                {chucVuOptions.map((cv) => (
                  <option key={cv} value={cv}>
                    {cv}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  setFilterPhongBan("");
                  setFilterChucVu("");
                }}
              >
                Xoá lọc
              </Button>
            </>
          ) : null}

          <Button variant="outline" onClick={() => ccQuery.refetch()}>
            Tải lại
          </Button>
        </div>

        <div className="text-sm">
          Phòng ban: <b>{myPhongBan || "Chưa có"}</b> — Quyền:{" "}
          <b className={canEdit ? "text-green-600" : "text-red-600"}>
            {canEdit ? "Được chấm công" : "Không được chấm công"}
          </b>
          {isDirectorDepartment ? (
            <span className="ml-2 text-xs text-muted-foreground">
              (Phòng giám đốc: xem tất cả + lọc)
            </span>
          ) : null}
        </div>
      </div>

      {/* ===== table ===== */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Số giờ</TableHead>
              <TableHead>Nhận xét / Lý do</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center p-6">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center p-6">
                  Không có nhân viên phù hợp
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${r.key_nv}-${r.ngay_thang}`}>
                  <TableCell className="max-w-[260px] truncate">
                    {r.ho_ten}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {r.chuc_vu}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {r.phong_ban}
                  </TableCell>

                  <TableCell>
                    {format(new Date(`${r.ngay_thang}T00:00:00`), "dd/MM/yyyy")}
                  </TableCell>

                  <TableCell className="w-[120px]">
                    <Input
                      type="time"
                      step={60}
                      value={r.gio_check_in || ""}
                      onChange={(e) =>
                        patchRow(r.key_nv, { gio_check_in: e.target.value })
                      }
                      disabled={!canEdit}
                    />
                  </TableCell>

                  <TableCell className="w-[120px]">
                    <Input
                      type="time"
                      step={60}
                      value={r.gio_check_out || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        patchRow(r.key_nv, {
                          gio_check_out: v,
                          so_gio_lam: calcHours(r.gio_check_in, v),
                        });
                      }}
                      disabled={!canEdit}
                    />
                  </TableCell>

                  <TableCell className="w-[90px]">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={String(r.so_gio_lam ?? 0)}
                      onChange={(e) =>
                        patchRow(r.key_nv, {
                          so_gio_lam: Number(e.target.value),
                        })
                      }
                      disabled={!canEdit}
                    />
                  </TableCell>

                  <TableCell className="min-w-[280px]">
                    <Textarea
                      value={r.ghi_chu || ""}
                      onChange={(e) =>
                        patchRow(r.key_nv, { ghi_chu: e.target.value })
                      }
                      placeholder="Ví dụ: Đi trễ vì kẹt xe / Nhận xét cuối ngày..."
                      className="min-h-[60px]"
                      disabled={!canEdit}
                    />
                  </TableCell>

                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckIn(r)}
                      disabled={!canEdit}
                    >
                      Check-in
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(r)}
                      disabled={!canEdit || !r.gio_check_in}
                      title={!r.gio_check_in ? "Cần check-in trước" : ""}
                    >
                      Check-out
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleSaveRow(r)}
                      disabled={!canEdit || !r.dirty || upsertMut.isPending}
                      title={!r.dirty ? "Chưa có thay đổi" : ""}
                    >
                      Lưu
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground"></div>
    </div>
  );
}
