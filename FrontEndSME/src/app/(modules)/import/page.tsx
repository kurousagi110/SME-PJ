"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  IconFileSpreadsheet,
  IconUpload,
  IconDownload,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconDatabaseImport,
  IconPackage,
  IconBox,
  IconUsers,
  IconRefresh,
  IconArrowRight,
  IconFilter,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ImportCategory,
  IMPORT_SCHEMAS,
  parseCSV,
  mapAndValidateRows,
  downloadCsvTemplate,
  ValidatedRow,
} from "@/lib/csv-import";
import { bulkImportAction } from "@/app/actions/import";

export default function BulkImportPage() {
  const [category, setCategory] = useState<ImportCategory>("san_pham");
  const [file, setFile] = useState<File | null>(null);
  const [validatedData, setValidatedData] = useState<{
    headers: string[];
    rows: ValidatedRow[];
    validCount: number;
    invalidCount: number;
  } | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "invalid">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultModal, setResultModal] = useState<{
    open: boolean;
    successCount: number;
    errorCount: number;
    insertedCount: number;
    updatedCount: number;
    errors: { row: number; ma: string; error: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat as ImportCategory);
    setFile(null);
    setValidatedData(null);
    setFilterMode("all");
  };

  const handleFileUpload = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".txt")) {
      toast.error("Vui lòng tải lên file định dạng .csv hoặc .txt có hỗ trợ UTF-8");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("File trống, vui lòng chọn file có dữ liệu");
        return;
      }
      try {
        const rawRows = parseCSV(text);
        if (rawRows.length <= 1) {
          toast.error("File chỉ chứa dòng tiêu đề hoặc không có dòng dữ liệu nào");
          return;
        }
        const validated = mapAndValidateRows(category, rawRows);
        setValidatedData(validated);
        toast.success(`Đã phân tích ${validated.rows.length} dòng dữ liệu`);
      } catch (err: any) {
        toast.error(`Lỗi đọc file: ${err.message}`);
      }
    };
    reader.readAsText(selectedFile, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidatedData(null);
    setFilterMode("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExecuteImport = async () => {
    if (!validatedData || validatedData.validCount === 0) {
      toast.error("Không có dòng dữ liệu hợp lệ nào để nhập");
      return;
    }

    const validItems = validatedData.rows
      .filter((r) => r.isValid)
      .map((r) => r.data);

    setIsProcessing(true);
    try {
      const res = await bulkImportAction({
        type: category,
        items: validItems,
        mode: "upsert",
      });

      if (res.success && res.data) {
        setResultModal({
          open: true,
          successCount: res.data.successCount,
          errorCount: res.data.errorCount,
          insertedCount: res.data.inserted.length,
          updatedCount: res.data.updated.length,
          errors: res.data.errors,
        });
        toast.success(res.message || "Nhập dữ liệu thành công!");
      } else {
        toast.error(res.error || "Không thể thực hiện nhập dữ liệu");
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSchema = IMPORT_SCHEMAS[category];

  const filteredRows = (validatedData?.rows || []).filter((r) => {
    if (filterMode === "valid") return r.isValid;
    if (filterMode === "invalid") return !r.isValid;
    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <IconFileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Nhập Dữ Liệu Hàng Loạt (Bulk Import)</h1>
              <p className="text-sm text-muted-foreground">
                Tải lên file Excel/CSV để thêm hoặc cập nhật hàng trăm sản phẩm, nguyên vật liệu hoặc đối tác cùng lúc
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="gap-2 border-dashed"
          onClick={() => downloadCsvTemplate(category)}
        >
          <IconDownload className="h-4 w-4 text-emerald-600" />
          Tải File Mẫu Excel ({currentSchema.title})
        </Button>
      </div>

      {/* Tabs Phân Hệ */}
      <Tabs value={category} onValueChange={handleCategoryChange} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-xl">
          <TabsTrigger value="san_pham" className="gap-2">
            <IconPackage className="h-4 w-4" />
            Sản phẩm
          </TabsTrigger>
          <TabsTrigger value="nguyen_lieu" className="gap-2">
            <IconBox className="h-4 w-4" />
            Nguyên vật liệu
          </TabsTrigger>
          <TabsTrigger value="doi_tac" className="gap-2">
            <IconUsers className="h-4 w-4" />
            Khách hàng & NCC
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Upload Zone & Instructions */}
      {!validatedData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-2 border-dashed hover:border-primary/50 transition-colors">
            <CardContent
              className="flex flex-col items-center justify-center p-10 cursor-pointer min-h-[300px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="p-4 bg-primary/10 rounded-full mb-4 text-primary">
                <IconUpload className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Kéo và thả file CSV / Excel vào đây</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Hỗ trợ định dạng .csv chuẩn UTF-8 (mở trực tiếp từ Microsoft Excel, Google Sheets)
              </p>
              <Button variant="secondary" className="gap-2 pointer-events-none">
                <IconFileSpreadsheet className="h-4 w-4" />
                Chọn file từ máy tính
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconAlertCircle className="h-5 w-5 text-amber-500" />
                Quy Định Nhập Dữ Liệu
              </CardTitle>
              <CardDescription>
                Các cột dữ liệu cho phân hệ <strong>{currentSchema.title}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2">
                {currentSchema.fields.map((f) => (
                  <li key={f.key} className="flex items-start justify-between gap-2 border-b pb-1.5 last:border-0">
                    <span className="font-medium text-foreground">
                      {f.label}
                      {f.required && <span className="text-rose-500 ml-1">*</span>}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                      {f.sample}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-md">
                  💡 <strong>Gợi ý:</strong> Tải file mẫu bên trên, mở bằng Excel, điền dữ liệu và lưu lại để đảm bảo không bị sai lệch cấu trúc cột.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Preview & Validation Table */
        <div className="space-y-4">
          {/* Summary KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tệp đang chọn</p>
                <p className="text-sm font-semibold truncate max-w-[160px]">{file?.name}</p>
              </div>
              <IconFileSpreadsheet className="h-8 w-8 text-muted-foreground/40" />
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tổng số dòng</p>
                <p className="text-xl font-bold">{validatedData.rows.length}</p>
              </div>
              <Badge variant="outline" className="text-xs">Dữ liệu</Badge>
            </Card>

            <Card className="p-4 flex items-center justify-between bg-emerald-500/5 border-emerald-500/20">
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Hợp lệ để nhập</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{validatedData.validCount}</p>
              </div>
              <IconCheck className="h-6 w-6 text-emerald-500" />
            </Card>

            <Card className="p-4 flex items-center justify-between bg-rose-500/5 border-rose-500/20">
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Dòng có lỗi</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{validatedData.invalidCount}</p>
              </div>
              <IconAlertCircle className="h-6 w-6 text-rose-500" />
            </Card>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <IconFilter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Hiển thị:</span>
              <Button
                size="sm"
                variant={filterMode === "all" ? "default" : "outline"}
                onClick={() => setFilterMode("all")}
                className="h-8 text-xs"
              >
                Tất cả ({validatedData.rows.length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "valid" ? "default" : "outline"}
                onClick={() => setFilterMode("valid")}
                className="h-8 text-xs text-emerald-600 border-emerald-500/30"
              >
                Hợp lệ ({validatedData.validCount})
              </Button>
              {validatedData.invalidCount > 0 && (
                <Button
                  size="sm"
                  variant={filterMode === "invalid" ? "destructive" : "outline"}
                  onClick={() => setFilterMode("invalid")}
                  className="h-8 text-xs text-rose-600 border-rose-500/30"
                >
                  Có lỗi ({validatedData.invalidCount})
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs gap-1.5">
                <IconTrash className="h-3.5 w-3.5 text-muted-foreground" />
                Chọn file khác
              </Button>
              <Button
                size="sm"
                disabled={validatedData.validCount === 0 || isProcessing}
                onClick={handleExecuteImport}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <IconRefresh className="h-3.5 w-3.5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <IconDatabaseImport className="h-3.5 w-3.5" />
                    Tiến hành nhập {validatedData.validCount} dòng
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-14 text-center">#</TableHead>
                    <TableHead className="w-28 text-center">Trạng thái</TableHead>
                    {currentSchema.fields.map((f) => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                    <TableHead className="w-64">Ghi chú kiểm tra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={currentSchema.fields.length + 3} className="text-center py-8 text-muted-foreground">
                        Không có dòng dữ liệu nào phù hợp với bộ lọc
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={!row.isValid ? "bg-rose-500/5 hover:bg-rose-500/10" : ""}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.isValid ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                              <IconCheck className="h-3 w-3 mr-1" /> Hợp lệ
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <IconAlertCircle className="h-3 w-3 mr-1" /> Lỗi
                            </Badge>
                          )}
                        </TableCell>
                        {currentSchema.fields.map((f) => {
                          const val = row.data[f.key];
                          const formattedVal =
                            f.type === "number" && typeof val === "number"
                              ? val.toLocaleString("vi-VN")
                              : String(val ?? "");
                          return (
                            <TableCell key={f.key} className="text-xs font-medium">
                              {formattedVal || <span className="text-muted-foreground italic">—</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-xs">
                          {row.isValid ? (
                            <span className="text-muted-foreground text-xs">Sẵn sàng lưu</span>
                          ) : (
                            <ul className="list-disc list-inside text-rose-600 dark:text-rose-400 space-y-0.5">
                              {row.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Result Dialog */}
      {resultModal && (
        <Dialog open={resultModal.open} onOpenChange={(open) => setResultModal((prev) => prev ? { ...prev, open } : null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconCheck className="h-6 w-6 text-emerald-500" />
                Kết Quả Nhập Dữ Liệu
              </DialogTitle>
              <DialogDescription>
                Hệ thống đã hoàn tất xử lý hàng loạt dữ liệu phân hệ {currentSchema.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Thành công</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {resultModal.successCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ({resultModal.insertedCount} mới, {resultModal.updatedCount} cập nhật)
                  </p>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  <p className="text-xs text-rose-600 dark:text-rose-400">Thất bại</p>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {resultModal.errorCount}
                  </p>
                </div>
              </div>

              {resultModal.errors.length > 0 && (
                <div className="border rounded-md p-3 max-h-36 overflow-y-auto space-y-1">
                  <p className="text-xs font-semibold text-rose-600">Chi tiết lỗi:</p>
                  {resultModal.errors.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      • Dòng {e.row} [{e.ma}]: {e.error}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResultModal(null);
                  handleReset();
                }}
              >
                Nhập tiếp file khác
              </Button>
              <Button asChild className="gap-1.5">
                <Link
                  href={
                    category === "san_pham"
                      ? "/product/catalog"
                      : category === "nguyen_lieu"
                      ? "/material/catalog"
                      : "/partners"
                  }
                >
                  Đến xem danh mục
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
