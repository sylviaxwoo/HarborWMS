"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  AWAITING_RECEIPT: "bg-amber-100 text-amber-800",
  RECEIVING: "bg-amber-100 text-amber-800",
  AWAITING_PUTAWAY: "bg-sky-100 text-sky-800",
  PUTTING_AWAY: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  AWAITING_ALLOCATION: "bg-amber-100 text-amber-800",
  ALLOCATED: "bg-indigo-100 text-indigo-800",
  PICKING: "bg-indigo-100 text-indigo-800",
  AWAITING_PACK: "bg-violet-100 text-violet-800",
  AWAITING_SHIP: "bg-cyan-100 text-cyan-800",
  SHIPPED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
  SHORT: "bg-orange-100 text-orange-800",
  MATCHED: "bg-emerald-100 text-emerald-800",
  VARIANCE: "bg-orange-100 text-orange-800",
  UNMATCHED: "bg-rose-100 text-rose-800",
  SETTLED: "bg-emerald-100 text-emerald-800",
  DISPUTE: "bg-orange-100 text-orange-800",
  SYSTEM_SYNC: "bg-teal-100 text-teal-800",
  MANUAL: "bg-stone-100 text-stone-700",
  OVERDUE: "bg-rose-100 text-rose-800",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  ISSUED: "bg-sky-100 text-sky-800",
  SUCCESS: "bg-emerald-100 text-emerald-800",
  RETRY: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ code }: { code: string }) {
  const { statusLabel } = useI18n();
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-md border-0 font-medium",
        tone[code] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {statusLabel(code)}
    </Badge>
  );
}
