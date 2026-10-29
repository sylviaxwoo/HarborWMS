"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore, visibleByOwner } from "@/lib/store";

export default function OutboundPage() {
  const { t, localizeName } = useI18n();
  const state = useWmsStore();
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");

  const rows = useMemo(() => {
    return visibleByOwner(state.outbounds, state).filter((o) => {
      if (warehouseId !== "all" && o.warehouseId !== warehouseId) return false;
      if (!q) return true;
      return `${o.number} ${o.upstreamNumber ?? ""} ${o.shipTo}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
  }, [state, q, warehouseId]);

  return (
    <div>
      <PageHeader title={t.outbound.title} subtitle={t.outbound.subtitle} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="max-w-xs bg-white/80"
          placeholder={t.common.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
      </div>
      <DataTable
        headers={[
          t.common.details,
          t.common.warehouse,
          t.common.owner,
          t.common.status,
          t.common.source,
          t.inbound.upstream,
          t.common.actions,
        ]}
        rows={rows.map((o) => {
          const wh = state.warehouses.find((w) => w.id === o.warehouseId);
          const owner = state.owners.find((x) => x.id === o.ownerId);
          return [
            <div key="n">
              <Link href={`/outbound/${o.id}`} className="font-medium text-teal-800 hover:underline">
                {o.number}
              </Link>
              {o.parentId ? (
                <div className="text-xs text-teal-900/50">split</div>
              ) : null}
            </div>,
            wh?.code ?? o.warehouseId,
            owner ? localizeName(owner.name) : o.ownerId,
            <StatusBadge key="s" code={o.status} />,
            <StatusBadge key="m" code={o.creationMode} />,
            o.upstreamNumber ?? "—",
            <Button key="a" asChild size="sm" variant="outline">
              <Link href={`/outbound/${o.id}`}>{t.common.details}</Link>
            </Button>,
          ];
        })}
      />
    </div>
  );
}
