"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function InboundDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, localizeName, errorLabel } = useI18n();
  const state = useWmsStore();
  const inbound = state.inbounds.find((i) => i.id === params.id);
  const [qtys, setQtys] = useState<Record<string, string>>({});

  const tasks = useMemo(
    () => state.putawayTasks.filter((p) => p.inboundId === params.id),
    [state.putawayTasks, params.id]
  );

  if (!inbound) {
    return <div className="text-sm text-teal-900/60">{t.common.empty}</div>;
  }

  const wh = state.warehouses.find((w) => w.id === inbound.warehouseId);
  const owner = state.owners.find((o) => o.id === inbound.ownerId);
  const role = state.users.find((u) => u.id === state.currentUserId)?.role;
  const canReceive = ["admin", "warehouse_manager", "receiver"].includes(role ?? "");
  const canWrite = role !== "owner_readonly";

  return (
    <div className="space-y-4">
      <PageHeader
        title={inbound.number}
        subtitle={`${t.inbound.title} · ${wh?.code ?? ""} · ${owner ? localizeName(owner.name) : ""}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/inbound">{t.common.back}</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge code={inbound.status} />
        <StatusBadge code={inbound.creationMode} />
        <span className="rounded-md bg-white/80 px-2 py-1 text-xs text-teal-900/60">
          {inbound.sourceSystem}
          {inbound.upstreamNumber ? ` · ${inbound.upstreamNumber}` : ""}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-teal-900/10 bg-white/80 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t.common.lines}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-teal-900/60">{t.inbound.receiveHint}</p>
            {inbound.lines.map((line) => {
              const sku = state.skus.find((s) => s.id === line.skuId);
              return (
                <div
                  key={line.id}
                  className="grid gap-2 rounded-xl border border-teal-900/10 p-3 sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <div className="font-medium">
                      {sku?.sku} · {sku ? localizeName(sku.name) : line.skuId}
                    </div>
                    <div className="text-xs text-teal-900/55">
                      {t.inbound.expected} {line.expectedQty} · {t.inbound.received}{" "}
                      {line.receivedQty} · {t.inbound.putawayQty} {line.putawayQty} ·{" "}
                      {t.inbound.short} {line.closedShortQty}
                    </div>
                  </div>
                  {canReceive && canWrite ? (
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      placeholder={t.common.qty}
                      value={qtys[line.id] ?? ""}
                      onChange={(e) =>
                        setQtys((prev) => ({ ...prev, [line.id]: e.target.value }))
                      }
                    />
                  ) : null}
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2 pt-2">
              {inbound.status === "DRAFT" && canWrite ? (
                <Button
                  onClick={() => {
                    const res = state.submitInboundDraft(inbound.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.inbound.submit}
                </Button>
              ) : null}
              {canReceive && canWrite ? (
                <Button
                  className="bg-teal-800 hover:bg-teal-900"
                  onClick={() => {
                    const receipts = inbound.lines
                      .map((l) => ({
                        lineId: l.id,
                        qty: Number(qtys[l.id] || 0),
                      }))
                      .filter((r) => r.qty > 0);
                    if (!receipts.length) {
                      toast.error(t.common.qty);
                      return;
                    }
                    const res = state.receiveInbound(inbound.id, receipts);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                    if (res.ok) setQtys({});
                  }}
                >
                  {t.inbound.receive}
                </Button>
              ) : null}
              {canWrite ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    const res = state.closeShort(inbound.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.inbound.closeShort}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">{t.common.summary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t.common.warehouse} value={wh?.code ?? ""} />
            <Row
              label={t.common.owner}
              value={owner ? localizeName(owner.name) : ""}
            />
            <Row label={t.inbound.upstream} value={inbound.upstreamNumber ?? "—"} />
            <Row label={t.common.reason} value={inbound.reason ?? "—"} />
            <Row label={t.common.source} value={inbound.createdBy} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.inbound.putaway}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-sm text-teal-900/50">{t.common.empty}</div>
          ) : (
            tasks.map((task) => {
              const from = state.locations.find((l) => l.id === task.fromLocationId);
              const to = state.locations.find((l) => l.id === task.toLocationId);
              const sku = state.skus.find((s) => s.id === task.skuId);
              return (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-50/70 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {sku?.sku} × {task.qty}
                    </div>
                    <div className="text-xs text-teal-900/55">
                      {from?.code} → {to?.code}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge code={task.status} />
                    {task.status === "OPEN" && canWrite ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          const res = state.confirmPutaway(task.id);
                          toast[res.ok ? "success" : "error"](errorLabel(res.message));
                        }}
                      >
                        {t.inbound.putaway}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.audit}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {inbound.audit.map((a, idx) => (
            <div key={idx} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="font-medium">
                {a.action} · {a.actor}
              </div>
              <div className="text-xs text-teal-900/55">
                {a.detail} · {new Date(a.at).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-teal-900/5 py-1.5">
      <span className="text-teal-900/55">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
