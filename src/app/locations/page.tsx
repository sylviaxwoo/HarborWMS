"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function LocationsPage() {
  const { t } = useI18n();
  const state = useWmsStore();
  const [warehouseId, setWarehouseId] = useState("wh_nj");
  const rows = state.locations.filter((l) => l.warehouseId === warehouseId);

  return (
    <div>
      <PageHeader title={t.locations.title} />
      <div className="mb-4">
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-[180px] bg-white/80">
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
      </div>
      <DataTable
        headers={["Code", t.locations.type, t.locations.capacity, "Allocatable", t.locations.active]}
        rows={rows.map((l) => [
          l.code,
          l.type,
          l.capacityUnits,
          l.allocatable ? "Y" : "N",
          l.active ? <StatusBadge key="a" code="AVAILABLE" /> : "N",
        ])}
      />
    </div>
  );
}
