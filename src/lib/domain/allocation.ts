import type { AppState, OutboundOrder } from "../types";
import { availableQty, getAvailable, isAllocatableLocation } from "./inventory";

export interface WarehouseScore {
  warehouseId: string;
  code: string;
  available: number;
  requested: number;
  canFulfill: boolean;
  eliminatedReason?: string;
  score: number;
  breakdown: {
    inventory: number;
    speed: number;
    cost: number;
  };
  reasons: string[];
}

const SPEED: Record<string, number> = {
  wh_nj: 1,
  wh_ca: 0.55,
  wh_tx: 0.7,
};

const COST: Record<string, number> = {
  wh_nj: 0.75,
  wh_ca: 0.55,
  wh_tx: 0.7,
};

const WEIGHTS = { inventory: 0.5, speed: 0.3, cost: 0.2 };

export function scoreWarehouses(
  state: AppState,
  order: OutboundOrder
): WarehouseScore[] {
  const line = order.lines[0];
  if (!line) return [];

  return state.warehouses.map((wh) => {
    const reasons: string[] = [];
    let eliminatedReason: string | undefined;

    if (!wh.active) eliminatedReason = "WAREHOUSE_INACTIVE";
    if (
      !eliminatedReason &&
      !state.users
        .find((u) => u.id === state.currentUserId)
        ?.ownerIds.includes(order.ownerId)
    ) {
      // still score for demo; owner filter applied elsewhere
    }

    const available = getAvailable(state, {
      warehouseId: wh.id,
      ownerId: order.ownerId,
      skuId: line.skuId,
    });

    if (!eliminatedReason && available <= 0) {
      eliminatedReason = "NO_AVAILABLE_INVENTORY";
    }

    const inventoryScore = Math.min(1, available / Math.max(1, line.requestedQty));
    const speedScore = SPEED[wh.id] ?? 0.5;
    const costScore = COST[wh.id] ?? 0.5;
    const score =
      inventoryScore * WEIGHTS.inventory +
      speedScore * WEIGHTS.speed +
      costScore * WEIGHTS.cost;

    if (!eliminatedReason) {
      if (available >= line.requestedQty) {
        reasons.push("FULL_INVENTORY");
      } else {
        reasons.push("PARTIAL_INVENTORY");
      }
      if (wh.state === order.shipState) reasons.push("SAME_STATE");
      reasons.push("WEIGHTED_SCORE");
    }

    return {
      warehouseId: wh.id,
      code: wh.code,
      available,
      requested: line.requestedQty,
      canFulfill: !eliminatedReason && available >= line.requestedQty,
      eliminatedReason,
      score: Math.round(score * 1000) / 1000,
      breakdown: {
        inventory: Math.round(inventoryScore * 1000) / 1000,
        speed: speedScore,
        cost: costScore,
      },
      reasons,
    };
  });
}

export function pickFifoLots(
  state: AppState,
  args: {
    warehouseId: string;
    ownerId: string;
    skuId: string;
    qty: number;
  }
): Array<{ stockId: string; locationId: string; qty: number; lot?: string }> {
  const candidates = state.stock
    .filter((s) => {
      if (s.warehouseId !== args.warehouseId) return false;
      if (s.ownerId !== args.ownerId) return false;
      if (s.skuId !== args.skuId) return false;
      if (s.quality !== "GOOD") return false;
      const loc = state.locations.find((l) => l.id === s.locationId);
      return !!loc && isAllocatableLocation(loc) && availableQty(s) > 0;
    })
    .sort((a, b) => {
      // Prefer pick locations, then storage; then lot code
      const la = state.locations.find((l) => l.id === a.locationId)!;
      const lb = state.locations.find((l) => l.id === b.locationId)!;
      const rank = (t: string) => (t === "pick" ? 0 : 1);
      if (rank(la.type) !== rank(lb.type)) return rank(la.type) - rank(lb.type);
      return (a.lot ?? "").localeCompare(b.lot ?? "");
    });

  let need = args.qty;
  const picks: Array<{
    stockId: string;
    locationId: string;
    qty: number;
    lot?: string;
  }> = [];

  for (const s of candidates) {
    if (need <= 0) break;
    const take = Math.min(availableQty(s), need);
    if (take <= 0) continue;
    picks.push({
      stockId: s.id,
      locationId: s.locationId,
      qty: take,
      lot: s.lot,
    });
    need -= take;
  }

  if (need > 0) {
    throw new Error("INSUFFICIENT_AVAILABLE");
  }
  return picks;
}
