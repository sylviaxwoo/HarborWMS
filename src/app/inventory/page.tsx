"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { availableQty } from "@/lib/domain/inventory";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function InventoryPage() {
  const { t, localizeName, errorLabel } = useI18n();
  const state = useWmsStore();
  const user = state.users.find((u) => u.id === state.currentUserId);
  const [warehouseId, setWarehouseId] = useState("all");
  const [ownerId, setOwnerId] = useState("all");

  const stockRows = useMemo(() => {
    return state.stock.filter((s) => {
      if (!user?.ownerIds.includes(s.ownerId)) return false;
      if (warehouseId !== "all" && s.warehouseId !== warehouseId) return false;
      if (ownerId !== "all" && s.ownerId !== ownerId) return false;
      return true;
    });
  }, [state.stock, user, warehouseId, ownerId]);

  const [fromLocationId, setFrom] = useState("");
  const [toLocationId, setTo] = useState("");
  const [skuId, setSku] = useState("");
  const [qty, setQty] = useState("1");
  const [xferWh, setXferWh] = useState("wh_nj");
  const [xferOwner, setXferOwner] = useState(user?.ownerIds[0] ?? "own_aurora");

  const locs = state.locations.filter((l) => l.warehouseId === xferWh);

  return (
    <div className="space-y-4">
      <PageHeader title={t.inventory.title} subtitle={t.inventory.subtitle} />

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.inventory.glossary}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-teal-900/70">
          {t.common.allocatableHint}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-[160px] bg-white/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {state.warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger className="w-[180px] bg-white/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {state.owners
              .filter((o) => user?.ownerIds.includes(o.id))
              .map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {localizeName(o.name)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        headers={[
          t.common.warehouse,
          t.common.owner,
          t.common.sku,
          "Loc",
          t.common.onHand,
          t.common.reserved,
          t.common.available,
          "Quality",
        ]}
        rows={stockRows.map((s) => {
          const wh = state.warehouses.find((w) => w.id === s.warehouseId);
          const owner = state.owners.find((o) => o.id === s.ownerId);
          const sku = state.skus.find((x) => x.id === s.skuId);
          const loc = state.locations.find((l) => l.id === s.locationId);
          return [
            wh?.code ?? "",
            owner ? localizeName(owner.name) : "",
            sku?.sku ?? s.skuId,
            loc?.code ?? "",
            s.onHand,
            s.reserved,
            availableQty(s),
            s.quality,
          ];
        })}
      />

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.inventory.transfer}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Select value={xferWh} onValueChange={setXferWh}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={xferOwner} onValueChange={setXferOwner}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.owners
                .filter((o) => user?.ownerIds.includes(o.id))
                .map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {localizeName(o.name)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={skuId} onValueChange={setSku}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="SKU" />
            </SelectTrigger>
            <SelectContent>
              {state.skus
                .filter((s) => s.ownerId === xferOwner)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sku}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={fromLocationId} onValueChange={setFrom}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="From" />
            </SelectTrigger>
            <SelectContent>
              {locs.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toLocationId} onValueChange={setTo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="To" />
            </SelectTrigger>
            <SelectContent>
              {locs.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-20" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Button
            onClick={() => {
              const res = state.transferStock({
                warehouseId: xferWh,
                ownerId: xferOwner,
                skuId,
                fromLocationId,
                toLocationId,
                qty: Number(qty),
              });
              toast[res.ok ? "success" : "error"](errorLabel(res.message));
            }}
          >
            {t.inventory.transfer}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.inventory.movements}</CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 space-y-2 overflow-auto text-sm">
          {state.movements.length === 0 ? (
            <div className="text-teal-900/50">{t.common.empty}</div>
          ) : (
            state.movements.slice(0, 50).map((m) => {
              const sku = state.skus.find((s) => s.id === m.skuId);
              return (
                <div key={m.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="font-medium">
                    {m.docType} · {sku?.sku} · {m.qtyDelta > 0 ? "+" : ""}
                    {m.qtyDelta}
                  </div>
                  <div className="text-xs text-teal-900/55">
                    {m.reason} · {m.actor} · {new Date(m.at).toLocaleString()} · txn{" "}
                    {m.txnId}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
