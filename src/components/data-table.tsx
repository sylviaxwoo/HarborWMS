"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/provider";

export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-teal-900/15 bg-white/50 px-6 py-16 text-center text-sm text-teal-900/50">
        {empty ?? t.common.empty}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/80 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-teal-50/60 hover:bg-teal-50/60">
            {headers.map((h) => (
              <TableHead key={h} className="text-teal-900/70">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i} className="hover:bg-teal-50/40">
              {cells.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
