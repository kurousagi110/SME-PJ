"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "@/app/actions/audit-log";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AuditLogPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => fetchAuditLog({ limit: 50 }),
  });

  const logs: any[] = data?.data ?? [];

  return (
    <div className="px-4 lg:px-6">
      <h1 className="mb-4 text-xl font-semibold">Nhật ký hệ thống</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {isError && (
        <p className="text-sm text-red-500">Không thể tải dữ liệu.</p>
      )}

      {!isLoading && !isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => (
                  <TableRow key={log._id ?? idx}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString("vi-VN")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{log.module ?? "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{log.action ?? "—"}</TableCell>
                    <TableCell className="text-xs">{log.description ?? "—"}</TableCell>
                    <TableCell className="text-xs">{log.user?.ho_ten ?? log.user_id ?? "—"}</TableCell>
                    <TableCell className="text-xs">{log.ip_address ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
