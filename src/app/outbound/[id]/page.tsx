"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function OutboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, localizeName, errorLabel } = useI18n();
  const state = useWmsStore();
  const order = state.outbounds.find((o) => o.id === params.id);
  const [pickQtys, setPickQtys] = useState<Record<string, string>>({});

  const picks = useMemo(
    () => state.pickTasks.filter((p) => p.outboundId === params.id),
    [state.pickTasks, params.id]
  );
  const scores = useMemo(
    () => (order ? state.scoreOrder(order.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order?.id, state.stock, state.outbounds]
  );
  const pkgs = state.packages.filter((p) => p.outboundId === params.id);

  if (!order) {
    return <div className="text-sm text-teal-900/60">{t.common.empty}</div>;
  }

  const wh = state.warehouses.find((w) => w.id === order.warehouseId);
  const owner = state.owners.find((o) => o.id === order.ownerId);
  const role = state.users.find((u) => u.id === state.currentUserId)?.role;
  const canWrite = role !== "owner_readonly";
  const forbidden =
    !state.users
      .find((u) => u.id === state.currentUserId)
      ?.ownerIds.includes(order.ownerId);

  if (forbidden) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="pt-6 text-sm text-rose-800">
          {t.errors.OWNER_FORBIDDEN}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.number}
        subtitle={`${order.shipTo} · ${wh?.code ?? ""}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/outbound">{t.common.back}</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge code={order.status} />
        <StatusBadge code={order.creationMode} />
        {order.splitReason ? (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
            {order.splitReason}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-teal-900/10 bg-white/80 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t.common.lines}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.lines.map((line) => {
              const sku = state.skus.find((s) => s.id === line.skuId);
              return (
                <div key={line.id} className="rounded-xl border border-teal-900/10 p-3 text-sm">
                  <div className="font-medium">
                    {sku?.sku} · {sku ? localizeName(sku.name) : line.skuId}
                  </div>
                  <div className="mt-1 text-xs text-teal-900/55">
                    req {line.requestedQty} · alloc {line.allocatedQty} · pick{" "}
                    {line.pickedQty} · ship {line.shippedQty}
                  </div>
                </div>
              );
            })}

            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-teal-800 hover:bg-teal-900"
                  onClick={() => {
                    const res = state.allocateOutbound(order.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.outbound.allocate}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const res = state.splitAllocate(order.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                    if (res.ok) router.push("/outbound");
                  }}
                >
                  {t.outbound.split}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const res = state.packAndReadyShip(order.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.outbound.pack}
                </Button>
                <Button
                  onClick={() => {
                    const res = state.shipOutbound(order.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.outbound.ship}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const res = state.cancelOutbound(order.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.outbound.cancelOrder}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">{t.outbound.scores}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-xs text-teal-900/55">{t.smart.weights}</p>
            {scores
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((s) => (
                <div key={s.warehouseId} className="rounded-lg bg-teal-50/80 p-2">
                  <div className="flex justify-between font-medium">
                    <span>{s.code}</span>
                    <span>{s.score}</span>
                  </div>
                  <div className="text-xs text-teal-900/55">
                    avail {s.available}/{s.requested}
                    {s.eliminatedReason
                      ? ` · ${s.eliminatedReason}`
                      : ` · ${s.reasons.join(", ")}`}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.outbound.pick}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {picks.length === 0 ? (
            <div className="text-sm text-teal-900/50">{t.common.empty}</div>
          ) : (
            picks.map((task) => {
              const from = state.locations.find((l) => l.id === task.fromLocationId);
              const sku = state.skus.find((s) => s.id === task.skuId);
              return (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-teal-50/70 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {sku?.sku} × {task.qty} · {from?.code}
                    </div>
                    <StatusBadge code={task.status} />
                  </div>
                  {task.status === "OPEN" && canWrite ? (
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-20"
                        type="number"
                        placeholder={String(task.qty)}
                        value={pickQtys[task.id] ?? ""}
                        onChange={(e) =>
                          setPickQtys((p) => ({ ...p, [task.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const qty = Number(pickQtys[task.id] || task.qty);
                          const res = state.confirmPick(task.id, qty);
                          toast[res.ok ? "success" : "error"](errorLabel(res.message));
                        }}
                      >
                        {t.outbound.pick}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.related}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pkgs.length === 0 ? (
            <div className="text-teal-900/50">{t.common.empty}</div>
          ) : (
            pkgs.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-900/10 px-3 py-2"
              >
                <div>
                  <div className="font-medium">{p.trackingNumber}</div>
                  <div className="text-xs text-teal-900/55">
                    {p.weightLb} lb · {p.status}
                  </div>
                </div>
                {canWrite && !p.tripId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const res = state.createTripFromPackage(p.id);
                      toast[res.ok ? "success" : "error"](errorLabel(res.message));
                      if (res.ok && res.tripId) router.push(`/fleet/${res.tripId}`);
                    }}
                  >
                    {t.outbound.createTrip}
                  </Button>
                ) : p.tripId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/fleet/${p.tripId}`}>{t.nav.fleet}</Link>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.audit}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.audit.map((a, idx) => (
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
