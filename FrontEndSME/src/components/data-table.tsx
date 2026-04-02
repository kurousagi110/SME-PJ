"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DashboardRow = {
  id: string;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
};

export function DataTable({
  data,
  loading,
}: {
  data: DashboardRow[];
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Header</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Limit</TableHead>
            <TableHead>Reviewer</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Đang tải...
              </TableCell>
            </TableRow>
          ) : data?.length ? (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.header}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>
                  <span
                    className={[
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                      row.status === "Done"
                        ? "bg-emerald-100 text-emerald-700"
                        : row.status === "Cancelled"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800",
                    ].join(" ")}
                  >
                    {row.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">{row.target}</TableCell>
                <TableCell className="text-right">{row.limit}</TableCell>
                <TableCell>{row.reviewer}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
