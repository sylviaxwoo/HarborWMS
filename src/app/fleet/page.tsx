"use client";

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function FleetPage() {
  const { t } = useI18n();
  const state = useWmsStore();

  return (
    <div className="space-y-4">
      <PageHeader title={t.fleet.title} subtitle={t.fleet.subtitle} />

      <DataTable
        headers={["Trip", t.common.status, "Origin", "Destination", t.common.actions]}
        rows={state.trips.map((trip) => [
          trip.number,
          <StatusBadge key="s" code={trip.status} />,
          trip.origin,
          <span key="d" className="line-clamp-1 max-w-[240px]">
            {trip.destination}
          </span>,
          <Button key="a" asChild size="sm" variant="outline">
            <Link href={`/fleet/${trip.id}`}>{t.common.details}</Link>
          </Button>,
        ])}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">{t.fleet.vehicles}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {state.vehicles.map((v) => (
              <div key={v.id} className="flex justify-between rounded-lg bg-teal-50/70 px-3 py-2">
                <span>
                  {v.code} · {v.plate}
                </span>
                <StatusBadge code={v.status === "AVAILABLE" ? "AVAILABLE" : v.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-teal-900/10 bg-white/80">
          <CardHeader>
            <CardTitle className="text-base">{t.fleet.drivers}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {state.drivers.map((d) => (
              <div key={d.id} className="flex justify-between rounded-lg bg-teal-50/70 px-3 py-2">
                <span>
                  {d.name} · {d.regions.join("/")}
                </span>
                <StatusBadge code={d.status === "AVAILABLE" ? "AVAILABLE" : d.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
