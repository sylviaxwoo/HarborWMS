"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function NewInboundPage() {
  const { t, localizeName, errorLabel } = useI18n();
  const state = useWmsStore();
  const router = useRouter();
  const user = state.users.find((u) => u.id === state.currentUserId);
  const [warehouseId, setWarehouseId] = useState(user?.warehouseIds[0] ?? "wh_nj");
  const [ownerId, setOwnerId] = useState(user?.ownerIds[0] ?? "own_aurora");
  const ownerSkus = state.skus.filter((s) => s.ownerId === ownerId);
  const [skuId, setSkuId] = useState(ownerSkus[0]?.id ?? "");
  const [qty, setQty] = useState("20");
  const [reason, setReason] = useState("");

  return (
    <div>
      <PageHeader title={t.inbound.createManual} subtitle={t.inbound.subtitle} />
      <Card className="max-w-xl border-teal-900/10 bg-white/80">
        <CardContent className="space-y-4 pt-6">
          <Field label={t.common.warehouse}>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.code} · {localizeName(w.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.common.owner}>
            <Select
              value={ownerId}
              onValueChange={(v) => {
                setOwnerId(v);
                const first = state.skus.find((s) => s.ownerId === v);
                setSkuId(first?.id ?? "");
              }}
            >
              <SelectTrigger>
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
          </Field>
          <Field label={t.common.sku}>
            <Select value={skuId} onValueChange={setSkuId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ownerSkus.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sku} · {localizeName(s.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.common.qty}>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label={t.common.reason}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button
            className="bg-teal-800 hover:bg-teal-900"
            onClick={() => {
              const res = state.createManualInbound({
                warehouseId,
                ownerId,
                skuId,
                qty: Number(qty),
                reason: reason || "Manual intake",
              });
              if (!res.ok) {
                toast.error(errorLabel(res.message));
                return;
              }
              toast.success(t.common.success);
              router.push(`/inbound/${res.id}`);
            }}
          >
            {t.common.create}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
