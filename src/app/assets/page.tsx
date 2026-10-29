"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function AssetsPage() {
  const { t, errorLabel } = useI18n();
  const state = useWmsStore();
  const [filter, setFilter] = useState<"all" | "ISSUED" | "AVAILABLE" | "OVERDUE">(
    "all"
  );

  const rows = useMemo(() => {
    return state.assets.filter((a) => {
      if (filter === "all") return true;
      if (filter === "OVERDUE") {
        return (
          a.status === "ISSUED" && !!a.dueAt && new Date(a.dueAt) < new Date()
        );
      }
      return a.status === filter;
    });
  }, [state.assets, filter]);

  return (
    <div className="space-y-4">
      <PageHeader title={t.assets.title} subtitle={t.assets.subtitle} />

      <div className="flex flex-wrap gap-2">
        {(["all", "AVAILABLE", "ISSUED", "OVERDUE"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className={filter === f ? "bg-teal-800 hover:bg-teal-900" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? t.common.all : t.status[f]}
          </Button>
        ))}
      </div>

      <DataTable
        headers={["Code", "Type", t.assets.holder, "Location", t.assets.due, t.common.status]}
        rows={rows.slice(0, 40).map((a) => [
          a.code,
          a.type,
          a.holder,
          a.locationLabel,
          a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "—",
          <StatusBadge
            key="s"
            code={
              a.status === "ISSUED" && a.dueAt && new Date(a.dueAt) < new Date()
                ? "OVERDUE"
                : a.status === "AVAILABLE" || a.status === "ISSUED"
                  ? a.status
                  : a.status
            }
          />,
        ])}
      />

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.assets.return}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.handovers.length === 0 ? (
            <div className="text-sm text-teal-900/50">{t.common.empty}</div>
          ) : (
            state.handovers.map((h) => {
              const remaining = h.assetIds.filter(
                (id) => !h.returnedAssetIds.includes(id)
              );
              return (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-50/70 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {h.issuedTo} · {h.assetIds.length} issued /{" "}
                      {h.returnedAssetIds.length} returned
                    </div>
                    <div className="text-xs text-teal-900/55">
                      due {new Date(h.dueAt).toLocaleDateString()} · remaining{" "}
                      {remaining.length}
                    </div>
                    <StatusBadge code={h.status} />
                  </div>
                  {remaining.length > 0 ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const partial = remaining.slice(0, Math.min(2, remaining.length));
                          const res = state.returnAssets(h.id, partial);
                          toast[res.ok ? "success" : "error"](errorLabel(res.message));
                        }}
                      >
                        {t.assets.return} 2
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const res = state.returnAssets(h.id, remaining);
                          toast[res.ok ? "success" : "error"](errorLabel(res.message));
                        }}
                      >
                        {t.assets.return} all
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
