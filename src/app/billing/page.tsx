"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

const DEMO_CSV = `tracking,service,amount
PLACEHOLDER_A,FREIGHT,12.00
PLACEHOLDER_B,FREIGHT,21.00
NO-EVIDENCE-999,FREIGHT,15.50`;

export default function BillingPage() {
  const { t, errorLabel } = useI18n();
  const state = useWmsStore();
  const [csv, setCsv] = useState("");
  const [selectedStatement, setSelectedStatement] = useState<string>("");

  const freightCharges = state.chargeEvents.filter((c) => c.category === "FREIGHT");

  const sampleCsv = useMemo(() => {
    const a = freightCharges[0];
    const b = freightCharges[1];
    const lineA = a
      ? `${a.inputs.trackingNumber},FREIGHT,${(a.amountCents / 100).toFixed(2)}`
      : "TRACK-DEMO-A,FREIGHT,12.00";
    const lineB = b
      ? `${b.inputs.trackingNumber},FREIGHT,${((b.amountCents + 300) / 100).toFixed(2)}`
      : "TRACK-DEMO-B,FREIGHT,21.00";
    return `tracking,service,amount\n${lineA}\n${lineB}\nNO-EVIDENCE-999,FREIGHT,15.50`;
  }, [freightCharges]);

  const matches = state.matches.filter((m) =>
    selectedStatement ? m.statementId === selectedStatement : true
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t.billing.title} subtitle={t.billing.subtitle} />

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.billing.expected}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Tracking", "Zone", "Billable lb", t.billing.expected, "Inputs"]}
            rows={freightCharges.map((c) => [
              String(c.inputs.trackingNumber ?? "—"),
              c.zone,
              c.billableWeightLb,
              formatMoney(c.amountCents),
              <span key="i" className="text-xs text-teal-900/55">
                dimDiv={c.inputs.dimDivisor} fuel={c.inputs.fuelSurchargePct}% v=
                {c.inputs.contractVersion}
              </span>,
            ])}
          />
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.billing.importCsv}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="min-h-28 font-mono text-xs"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={DEMO_CSV}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCsv(sampleCsv)}>
              {t.billing.sampleCsv}
            </Button>
            <Button
              className="bg-teal-800 hover:bg-teal-900"
              onClick={() => {
                const fileName = `carrier-${Date.now()}.csv`;
                const res = state.importFreightStatement(csv || sampleCsv, fileName);
                toast[res.ok ? "success" : "error"](errorLabel(res.message));
                if (res.statementId) setSelectedStatement(res.statementId);
              }}
            >
              {t.billing.importCsv}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">Statements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.statements.map((s) => (
            <div
              key={s.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${
                selectedStatement === s.id ? "bg-teal-100" : "bg-teal-50/70"
              }`}
            >
              <button type="button" className="text-left" onClick={() => setSelectedStatement(s.id)}>
                <div className="font-medium">
                  {s.number} · {s.fileName}
                </div>
                <div className="text-xs text-teal-900/55">{s.lines.length} lines</div>
              </button>
              <div className="flex items-center gap-2">
                <StatusBadge code={s.status} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStatement(s.id);
                    const res = state.runMatch(s.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.billing.runMatch}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const res = state.approveSettlements(s.id);
                    toast[res.ok ? "success" : "error"](errorLabel(res.message));
                  }}
                >
                  {t.billing.approve}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.billing.variance}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {matches.length === 0 ? (
            <div className="text-sm text-teal-900/50">{t.common.empty}</div>
          ) : (
            matches.map((m) => {
              const line = state.statements
                .flatMap((s) => s.lines.map((l) => ({ ...l, statementId: s.id })))
                .find((l) => l.id === m.statementLineId);
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-900/10 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {line?.trackingOrKey} · {line?.service}
                    </div>
                    <div className="text-xs text-teal-900/55">
                      {t.billing.expected} {formatMoney(m.expectedCents)} ·{" "}
                      {t.billing.billed} {formatMoney(m.billedCents)} ·{" "}
                      {t.billing.variance} {formatMoney(m.varianceCents)}
                      {m.reason ? ` · ${m.reason}` : ""}
                      {m.resolution ? ` · ${m.resolution}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge code={m.status} />
                    {["VARIANCE", "UNMATCHED", "DISPUTED"].includes(m.status) ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const res = state.resolveDispute(
                              m.id,
                              "Accept vendor amount with reason",
                              true
                            );
                            toast.success(errorLabel(res.message));
                          }}
                        >
                          {t.billing.acceptVendor}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const res = state.resolveDispute(
                              m.id,
                              "Dispute open — await carrier correction",
                              false
                            );
                            toast.success(errorLabel(res.message));
                          }}
                        >
                          {t.billing.dispute}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/80">
        <CardContent className="pt-6 text-sm text-amber-900">
          {t.billing.rentNote}
          <div className="mt-2 text-xs">
            Seed statement RENT-2026-10: BASE_RENT USD 8,000 + CAM USD 300 (separate lines).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
