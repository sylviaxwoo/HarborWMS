"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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

export default function InboundPage() {
  const { t, localizeName, errorLabel } = useI18n();
  const state = useWmsStore();
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("all");
  const [mode, setMode] = useState("all");

  const rows = useMemo(() => {
    return visibleByOwner(state.inbounds, state).filter((i) => {
      if (warehouseId !== "all" && i.warehouseId !== warehouseId) return false;
      if (mode !== "all" && i.creationMode !== mode) return false;
      if (!q) return true;
      const hay = `${i.number} ${i.upstreamNumber ?? ""} ${i.createdBy}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [state, q, warehouseId, mode]);

  return (
    <div>
      <PageHeader
        title={t.inbound.title}
        subtitle={t.inbound.subtitle}
        actions={
          <>
            <Button
              className="bg-teal-800 hover:bg-teal-900"
              onClick={() => {
                const res = state.syncErpInbound("PO-ERP-8891");
                toast[res.ok ? "success" : "error"](errorLabel(res.message));
              }}
            >
              {t.inbound.syncAgain}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const n = `PO-ERP-${Math.floor(Math.random() * 9000 + 1000)}`;
                const res = state.syncErpInbound(n);
                toast.success(`${errorLabel(res.message)} · ${n}`);
              }}
            >
              {t.inbound.syncErp}
            </Button>
            <Button asChild variant="outline">
              <Link href="/inbound/new">{t.inbound.createManual}</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="max-w-xs bg-white/80"
          placeholder={t.common.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-[160px] bg-white/80">
            <SelectValue placeholder={t.common.warehouse} />
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
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-[180px] bg-white/80">
            <SelectValue placeholder={t.common.source} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="SYSTEM_SYNC">{t.status.SYSTEM_SYNC}</SelectItem>
            <SelectItem value="MANUAL">{t.status.MANUAL}</SelectItem>
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
        rows={rows.map((i) => {
          const wh = state.warehouses.find((w) => w.id === i.warehouseId);
          const owner = state.owners.find((o) => o.id === i.ownerId);
          return [
            <Link key="n" href={`/inbound/${i.id}`} className="font-medium text-teal-800 hover:underline">
              {i.number}
            </Link>,
            wh?.code ?? i.warehouseId,
            owner ? localizeName(owner.name) : i.ownerId,
            <StatusBadge key="s" code={i.status} />,
            <div key="src" className="space-y-1">
              <StatusBadge code={i.creationMode} />
              <div className="text-xs text-teal-900/50">{i.sourceSystem}</div>
            </div>,
            i.upstreamNumber ?? "—",
            <Button key="a" asChild size="sm" variant="outline">
              <Link href={`/inbound/${i.id}`}>{t.common.details}</Link>
            </Button>,
          ];
        })}
      />
    </div>
  );
}
