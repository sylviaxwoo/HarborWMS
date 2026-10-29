import type { AppState, ChargeEvent, Package, RateContract } from "../types";
import { uid } from "../utils";

export function dimensionalWeightLb(
  pkg: Package,
  divisor: number
): number {
  return (pkg.lengthIn * pkg.widthIn * pkg.heightIn) / divisor;
}

export function billableWeightLb(pkg: Package, contract: RateContract): number {
  const dim = dimensionalWeightLb(pkg, contract.dimDivisor);
  // Contract rounding: ceil to next 1 lb
  return Math.ceil(Math.max(pkg.weightLb, dim));
}

export function computeFreightCharge(
  state: AppState,
  pkg: Package,
  zone: string,
  carrierId = "car_fastlane"
): ChargeEvent {
  const contract = state.contracts.find((c) => c.carrierId === carrierId);
  if (!contract) throw new Error("NO_CONTRACT");

  const billable = billableWeightLb(pkg, contract);
  const rate = contract.zones[zone] ?? contract.zones.DEFAULT;
  const baseCents = Math.round(rate * billable * 100);
  const fuelCents = Math.round((baseCents * contract.fuelSurchargePct) / 100);
  const amountCents = baseCents + fuelCents;

  return {
    id: uid("chg"),
    category: "FREIGHT",
    packageId: pkg.id,
    warehouseId: pkg.warehouseId,
    currency: "USD",
    amountCents,
    billableWeightLb: billable,
    zone,
    inputs: {
      actualWeightLb: pkg.weightLb,
      dimDivisor: contract.dimDivisor,
      dimensionalWeightLb: Math.round(dimensionalWeightLb(pkg, contract.dimDivisor) * 100) / 100,
      zoneRate: rate,
      fuelSurchargePct: contract.fuelSurchargePct,
      contractVersion: contract.version,
      trackingNumber: pkg.trackingNumber,
    },
    createdAt: new Date().toISOString(),
    matchedQty: 0,
  };
}

export interface ImportLine {
  trackingOrKey: string;
  service: string;
  amountCents: number;
  qty: number;
  raw: string;
}

/** Demo freight CSV: tracking,service,amount */
export function parseFreightCsv(text: string): ImportLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const start = lines[0]?.toLowerCase().includes("tracking") ? 1 : 0;
  const out: ImportLine[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 3) continue;
    const amount = Math.round(parseFloat(cols[2]) * 100);
    out.push({
      trackingOrKey: cols[0],
      service: cols[1] || "FREIGHT",
      amountCents: amount,
      qty: 1,
      raw: lines[i],
    });
  }
  return out;
}

export function matchStatement(
  state: AppState,
  statementId: string
): AppState["matches"] {
  const statement = state.statements.find((s) => s.id === statementId);
  if (!statement) return [];

  return statement.lines.map((line) => {
    const charge = state.chargeEvents.find(
      (c) =>
        c.category === "FREIGHT" &&
        String(c.inputs.trackingNumber) === line.trackingOrKey
    );

    if (!charge) {
      return {
        id: uid("match"),
        statementId,
        statementLineId: line.id,
        status: "UNMATCHED" as const,
        expectedCents: 0,
        billedCents: line.amountCents,
        varianceCents: line.amountCents,
        reason: "NO_EVIDENCE",
      };
    }

    const variance = line.amountCents - charge.amountCents;
    if (variance === 0) {
      return {
        id: uid("match"),
        statementId,
        statementLineId: line.id,
        chargeEventId: charge.id,
        status: "MATCHED" as const,
        expectedCents: charge.amountCents,
        billedCents: line.amountCents,
        varianceCents: 0,
      };
    }

    return {
      id: uid("match"),
      statementId,
      statementLineId: line.id,
      chargeEventId: charge.id,
      status: "VARIANCE" as const,
      expectedCents: charge.amountCents,
      billedCents: line.amountCents,
      varianceCents: variance,
      reason: "AMOUNT_VARIANCE",
    };
  });
}
