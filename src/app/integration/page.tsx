"use client";

import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function IntegrationPage() {
  const { t, errorLabel } = useI18n();
  const state = useWmsStore();

  return (
    <div>
      <PageHeader title={t.integration.title} subtitle={t.integration.subtitle} />
      <DataTable
        headers={["Type", "Dir", "Source", "Key", t.common.status, "Retries", t.common.actions]}
        rows={state.integrationEvents.map((e) => [
          e.type,
          e.direction,
          e.sourceSystem,
          <span key="k" className="font-mono text-xs">
            {e.idempotencyKey}
          </span>,
          <div key="s" className="space-y-1">
            <StatusBadge code={e.status} />
            {e.lastError ? (
              <div className="text-xs text-rose-700">{e.lastError}</div>
            ) : (
              <div className="text-xs text-teal-900/50">{e.payloadSummary}</div>
            )}
          </div>,
          e.retries,
          e.status === "FAILED" ? (
            <Button
              key="r"
              size="sm"
              onClick={() => {
                const res = state.retryIntegration(e.id);
                toast.success(errorLabel(res.message));
              }}
            >
              {t.integration.retry}
            </Button>
          ) : (
            "—"
          ),
        ])}
      />
    </div>
  );
}
