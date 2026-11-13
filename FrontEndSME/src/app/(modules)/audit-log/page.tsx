"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search, ShieldAlert, ShieldCheck, Info } from "lucide-react";
import { fetchAuditLog } from "@/app/actions/audit-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DiffField {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditLogEntry {
  _id?: string;
  created_at?: string;
  module?: string;
  action?: string;
  description?: string;
  severity?: "info" | "warning" | "critical";
  target_id?: string | null;
  ip_address?: string | null;
  user?: { ho_ten?: string; tai_khoan?: string } | null;
  user_id?: string;
  changes?: {
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    fields?: DiffField[];
  } | null;
}

function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function SeverityBadge({ severity }: { severity?: string }) {
  if (severity === "critical") {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <ShieldAlert className="h-3 w-3" />
        Nghiêm trọng
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 bg-amber-50 text-[10px]">
        <ShieldCheck className="h-3 w-3" />
        Cảnh báo
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <Info className="h-3 w-3" />
      Thông thường
    </Badge>
  );
}

export default function AuditLogPage() {
  const [searchText, setSearchText] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("ALL");
  const [selectedDiffLog, setSelectedDiffLog] = React.useState<AuditLogEntry | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log", debouncedSearch, severityFilter],
    queryFn: () =>
      fetchAuditLog({
        limit: 50,
        q: debouncedSearch || undefined,
        severity: severityFilter,
      }),
  });

  const logs = (data?.data ?? []) as AuditLogEntry[];

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nhật ký hệ thống (Audit Log)</h1>
          <p className="text-xs text-muted-foreground">
            Theo dõi lịch sử thao tác, phân loại mức độ rủi ro và đối chiếu dữ liệu trước / sau khi thay đổi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mô tả, module, người thực hiện..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Mức độ rủi ro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả mức độ</SelectItem>
              <SelectItem value="critical">Nghiêm trọng</SelectItem>
              <SelectItem value="warning">Cảnh báo</SelectItem>
              <SelectItem value="info">Thông thường</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                <TableHead>Mức độ</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-center">Dữ liệu Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Không có dữ liệu phù hợp
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => {
                  const hasDiff =
                    Boolean(log.changes?.fields?.length) ||
                    Boolean(log.changes?.before) ||
                    Boolean(log.changes?.after);

                  return (
                    <TableRow key={log._id ?? idx}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("vi-VN")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={log.severity} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.module ?? "—"}</TableCell>
                      <TableCell className="text-xs font-medium">{log.action ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-md">{log.description ?? "—"}</TableCell>
                      <TableCell className="text-xs">{log.user?.ho_ten ?? log.user_id ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{log.ip_address ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {hasDiff ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setSelectedDiffLog(log)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Xem thay đổi
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Visual Diff Modal */}
      <Dialog open={Boolean(selectedDiffLog)} onOpenChange={(open) => !open && setSelectedDiffLog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Đối chiếu thay đổi dữ liệu (Before ↔ After)
            </DialogTitle>
            <DialogDescription>
              {selectedDiffLog?.module} · {selectedDiffLog?.action} ·{" "}
              {selectedDiffLog?.user?.ho_ten || "Hệ thống"}
            </DialogDescription>
          </DialogHeader>

          {selectedDiffLog?.changes?.fields && selectedDiffLog.changes.fields.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px]">Trường dữ liệu</TableHead>
                    <TableHead className="text-red-700 bg-red-50/60">Giá trị cũ (Before)</TableHead>
                    <TableHead className="text-emerald-700 bg-emerald-50/60">Giá trị mới (After)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDiffLog.changes.fields.map((f) => (
                    <TableRow key={f.field}>
                      <TableCell className="font-mono text-xs font-semibold">{f.field}</TableCell>
                      <TableCell className="bg-red-50/40 text-red-700 font-mono text-xs whitespace-pre-wrap break-all">
                        {formatDiffValue(f.before)}
                      </TableCell>
                      <TableCell className="bg-emerald-50/40 text-emerald-700 font-mono text-xs whitespace-pre-wrap break-all">
                        {formatDiffValue(f.after)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border border-red-200 bg-red-50/50 p-3">
                <div className="text-xs font-semibold text-red-700 mb-2">Giá trị cũ (Before)</div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-red-900">
                  {formatDiffValue(selectedDiffLog?.changes?.before)}
                </pre>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="text-xs font-semibold text-emerald-700 mb-2">Giá trị mới (After)</div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-emerald-900">
                  {formatDiffValue(selectedDiffLog?.changes?.after)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
