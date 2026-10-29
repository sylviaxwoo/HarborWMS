"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, errorLabel } = useI18n();
  const state = useWmsStore();
  const trip = state.trips.find((x) => x.id === params.id);
  const [vehicleId, setVehicleId] = useState(
    state.vehicles.find((v) => v.status === "AVAILABLE")?.id ?? ""
  );
  const [driverId, setDriverId] = useState(
    state.drivers.find((d) => d.status === "AVAILABLE")?.id ?? ""
  );
  const [pod, setPod] = useState("Front desk");
  const availableAssets = state.assets.filter(
    (a) => a.status === "AVAILABLE" && a.warehouseId === trip?.warehouseId
  );
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  if (!trip) return <div>{t.common.empty}</div>;

  const pkgs = state.packages.filter((p) => trip.packageIds.includes(p.id));
  const handovers = state.handovers.filter((h) =>
    trip.assetHandoverIds.includes(h.id)
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={trip.number}
        subtitle={trip.destination}
        actions={
          <Button asChild variant="outline">
            <Link href="/fleet">{t.common.back}</Link>
          </Button>
        }
      />
      <StatusBadge code={trip.status} />

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.actions}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Vehicle" />
            </SelectTrigger>
            <SelectContent>
              {state.vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.code} ({v.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
              {state.drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} ({d.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              const res = state.assignTrip(trip.id, vehicleId, driverId);
              toast[res.ok ? "success" : "error"](errorLabel(res.message));
            }}
          >
            {t.fleet.assign}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const res = state.departTrip(trip.id);
              toast[res.ok ? "success" : "error"](errorLabel(res.message));
            }}
          >
            {t.fleet.depart}
          </Button>
          <Input className="w-40" value={pod} onChange={(e) => setPod(e.target.value)} />
          <Button
            className="bg-teal-800 hover:bg-teal-900"
            onClick={() => {
              const res = state.deliverTrip(trip.id, pod);
              toast[res.ok ? "success" : "error"](errorLabel(res.message));
            }}
          >
            {t.fleet.deliver}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.assets.issue}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableAssets.slice(0, 12).map((a) => {
              const on = selectedAssets.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    setSelectedAssets((prev) =>
                      on ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                    )
                  }
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    on
                      ? "border-teal-700 bg-teal-800 text-white"
                      : "border-teal-900/15 bg-white"
                  }`}
                >
                  {a.code}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const due = new Date(Date.now() + 3 * 86400000).toISOString();
              const res = state.issueAssets({
                tripId: trip.id,
                assetIds: selectedAssets.slice(0, 10),
                issuedTo: trip.destination,
                dueAt: due,
              });
              toast[res.ok ? "success" : "error"](errorLabel(res.message));
              if (res.ok) setSelectedAssets([]);
            }}
          >
            {t.assets.issue} ({selectedAssets.length})
          </Button>
          {handovers.map((h) => (
            <div key={h.id} className="rounded-xl bg-teal-50/80 p-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge code={h.status} />
                <span>
                  {h.assetIds.length} issued · {h.returnedAssetIds.length} returned
                </span>
              </div>
              <Button asChild size="sm" variant="link" className="px-0">
                <Link href="/assets">{t.nav.assets}</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">
            Timeline ({t.common.simulated})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {trip.timeline.map((n, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-3 py-2">
              {n.label}
              <div className="text-xs text-teal-900/55">
                {new Date(n.at).toLocaleString()}
                {n.simulated ? ` · ${t.common.simulated}` : ""}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">Packages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pkgs.map((p) => (
            <div key={p.id}>
              {p.trackingNumber} · {p.weightLb} lb
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
