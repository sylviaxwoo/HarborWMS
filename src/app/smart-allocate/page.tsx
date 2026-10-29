"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore, visibleByOwner } from "@/lib/store";

export default function SmartAllocatePage() {
  const { t, localizeName } = useI18n();
  const state = useWmsStore();
  const candidates = visibleByOwner(state.outbounds, state).filter(
    (o) => o.status === "AWAITING_ALLOCATION" && !o.parentId
  );
  const [orderId, setOrderId] = useState(candidates[0]?.id ?? "");
  const scores = orderId ? state.scoreOrder(orderId) : [];
  const order = state.outbounds.find((o) => o.id === orderId);

  return (
    <div className="space-y-4">
      <PageHeader title={t.smart.title} subtitle={t.smart.subtitle} />
      <p className="text-sm text-teal-900/65">{t.smart.weights}</p>

      <Select value={orderId} onValueChange={setOrderId}>
        <SelectTrigger className="w-full max-w-md bg-white/80">
          <SelectValue placeholder="Order" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.number} · {o.shipState}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {order ? (
        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">
              {order.number} → {order.shipTo}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {scores
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((s) => {
                const wh = state.warehouses.find((w) => w.id === s.warehouseId);
                return (
                  <div
                    key={s.warehouseId}
                    className={`rounded-2xl border p-4 ${
                      s.eliminatedReason
                        ? "border-rose-200 bg-rose-50/60"
                        : "border-teal-900/10 bg-teal-50/50"
                    }`}
                  >
                    <div className="font-[family-name:var(--font-display)] text-xl font-semibold">
                      {wh ? localizeName(wh.name) : s.code}
                    </div>
                    <div className="mt-1 text-sm">score {s.score}</div>
                    <div className="mt-2 space-y-1 text-xs text-teal-900/65">
                      <div>
                        inv {s.breakdown.inventory} · speed {s.breakdown.speed} · cost{" "}
                        {s.breakdown.cost}
                      </div>
                      <div>
                        avail {s.available} / req {s.requested}
                      </div>
                      <div>
                        {s.eliminatedReason
                          ? s.eliminatedReason
                          : s.reasons.join(" · ")}
                      </div>
                      <div className="text-amber-800">
                        {t.common.simulated} cost estimate only
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ) : null}

      {orderId ? (
        <Button asChild variant="outline">
          <Link href={`/outbound/${orderId}`}>{t.common.details}</Link>
        </Button>
      ) : null}
    </div>
  );
}
