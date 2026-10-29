"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inventoryMetrics } from "@/lib/domain/inventory";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore, visibleByOwner } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

export default function WorkbenchPage() {
  const { t, localizeName } = useI18n();
  const state = useWmsStore();
  const inbounds = visibleByOwner(state.inbounds, state);
  const outbounds = visibleByOwner(state.outbounds, state);
  const metrics = inventoryMetrics(state);

  const awaitingReceipt = inbounds.filter((i) =>
    ["AWAITING_RECEIPT", "RECEIVING"].includes(i.status)
  ).length;
  const openPutaway = state.putawayTasks.filter((p) => p.status === "OPEN").length;
  const awaitingShip = outbounds.filter((o) =>
    ["AWAITING_SHIP", "AWAITING_PACK", "ALLOCATED", "PICKING"].includes(o.status)
  ).length;
  const failed = state.integrationEvents.filter((e) => e.status === "FAILED").length;
  const overdueAssets = state.assets.filter(
    (a) => a.status === "ISSUED" && a.dueAt && new Date(a.dueAt) < new Date()
  ).length;
  const varianceCents = state.matches
    .filter((m) => ["VARIANCE", "UNMATCHED", "DISPUTED"].includes(m.status))
    .reduce((s, m) => s + Math.abs(m.varianceCents), 0);

  const cards = [
    { label: t.workbench.awaitingReceipt, value: awaitingReceipt, href: "/inbound" },
    { label: t.workbench.openPutaway, value: openPutaway, href: "/inbound" },
    { label: t.workbench.awaitingShip, value: awaitingShip, href: "/outbound" },
    { label: t.workbench.exceptions, value: failed, href: "/integration" },
    { label: t.workbench.assetOverdue, value: overdueAssets, href: "/assets" },
    {
      label: t.workbench.disputeAmount,
      value: formatMoney(varianceCents),
      href: "/billing",
      raw: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.workbench.title}
        subtitle={t.workbench.subtitle}
        actions={
          <>
            <Button asChild className="bg-teal-800 hover:bg-teal-900">
              <Link href="/inbound">{t.workbench.quickInbound}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/outbound">{t.workbench.quickOutbound}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/billing">{t.workbench.quickBilling}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <Link key={c.label} href={c.href} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
            <Card className="border-teal-900/10 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-teal-900/60">
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-[family-name:var(--font-display)] text-3xl font-semibold text-teal-950">
                  {c.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">{t.common.available}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-teal-900/65">{t.common.allocatableHint}</p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Metric label={t.common.onHand} value={metrics.onHand} />
              <Metric label={t.common.reserved} value={metrics.reserved} />
              <Metric label={t.common.available} value={metrics.available} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">{t.common.warehouse}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.warehouses.map((w) => {
              const m = inventoryMetrics(state, w.id);
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-xl bg-teal-50/70 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{localizeName(w.name)}</div>
                    <div className="text-xs text-teal-900/55">
                      {w.code} · {w.timezone}
                    </div>
                  </div>
                  <div className="text-right text-xs text-teal-900/70">
                    <div>
                      {t.common.available}: {m.available}
                    </div>
                    <div>
                      {t.common.onHand}: {m.onHand}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-teal-50/80 p-3">
      <div className="text-xs text-teal-900/55">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
