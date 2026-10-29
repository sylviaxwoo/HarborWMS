import type {
  AppState,
  Location,
  QualityStatus,
  StockBalance,
  StockMovement,
} from "../types";
import { uid } from "../utils";

export function availableQty(s: StockBalance): number {
  return Math.max(0, s.onHand - s.reserved);
}

export function isAllocatableLocation(loc: Location): boolean {
  return loc.active && loc.allocatable;
}

export function getOnHand(
  state: AppState,
  filter: {
    warehouseId?: string;
    ownerId?: string;
    skuId?: string;
    locationId?: string;
  }
): number {
  return state.stock
    .filter((s) => {
      if (filter.warehouseId && s.warehouseId !== filter.warehouseId) return false;
      if (filter.ownerId && s.ownerId !== filter.ownerId) return false;
      if (filter.skuId && s.skuId !== filter.skuId) return false;
      if (filter.locationId && s.locationId !== filter.locationId) return false;
      return true;
    })
    .reduce((sum, s) => sum + s.onHand, 0);
}

export function getAvailable(
  state: AppState,
  filter: {
    warehouseId: string;
    ownerId: string;
    skuId: string;
  }
): number {
  return state.stock
    .filter((s) => {
      if (s.warehouseId !== filter.warehouseId) return false;
      if (s.ownerId !== filter.ownerId) return false;
      if (s.skuId !== filter.skuId) return false;
      if (s.quality !== "GOOD") return false;
      const loc = state.locations.find((l) => l.id === s.locationId);
      return !!loc && isAllocatableLocation(loc);
    })
    .reduce((sum, s) => sum + availableQty(s), 0);
}

export function inventoryMetrics(state: AppState, warehouseId?: string) {
  const rows = state.stock.filter(
    (s) => !warehouseId || s.warehouseId === warehouseId
  );
  let onHand = 0;
  let reserved = 0;
  let available = 0;
  for (const s of rows) {
    onHand += s.onHand;
    reserved += s.reserved;
    const loc = state.locations.find((l) => l.id === s.locationId);
    if (s.quality === "GOOD" && loc && isAllocatableLocation(loc)) {
      available += availableQty(s);
    }
  }
  return { onHand, reserved, available };
}

export function recommendPutawayLocation(
  state: AppState,
  warehouseId: string,
  skuId: string
): Location | undefined {
  const sameSku = state.stock.find(
    (s) =>
      s.warehouseId === warehouseId &&
      s.skuId === skuId &&
      s.quality === "GOOD" &&
      state.locations.find((l) => l.id === s.locationId)?.type === "pick"
  );
  if (sameSku) {
    return state.locations.find((l) => l.id === sameSku.locationId);
  }
  return state.locations.find(
    (l) =>
      l.warehouseId === warehouseId &&
      l.active &&
      (l.type === "pick" || l.type === "storage")
  );
}

export function applyStockDelta(
  state: AppState,
  args: {
    ownerId: string;
    warehouseId: string;
    locationId: string;
    skuId: string;
    quality: QualityStatus;
    lot?: string;
    delta: number;
    reservedDelta?: number;
    docType: string;
    docId: string;
    taskId?: string;
    actor: string;
    reason: string;
    txnId?: string;
  }
): { stock: StockBalance[]; movement?: StockMovement } {
  const stock = [...state.stock];
  const idx = stock.findIndex(
    (s) =>
      s.ownerId === args.ownerId &&
      s.warehouseId === args.warehouseId &&
      s.locationId === args.locationId &&
      s.skuId === args.skuId &&
      s.quality === args.quality &&
      (s.lot ?? "") === (args.lot ?? "")
  );

  let row: StockBalance;
  if (idx >= 0) {
    row = { ...stock[idx] };
  } else {
    row = {
      id: uid("stk"),
      ownerId: args.ownerId,
      warehouseId: args.warehouseId,
      locationId: args.locationId,
      skuId: args.skuId,
      lot: args.lot,
      quality: args.quality,
      onHand: 0,
      reserved: 0,
    };
  }

  const before = row.onHand;
  const next = before + args.delta;
  if (next < 0) {
    throw new Error("NEGATIVE_STOCK_FORBIDDEN");
  }
  row.onHand = next;
  if (args.reservedDelta) {
    row.reserved = Math.max(0, row.reserved + args.reservedDelta);
  }
  if (row.reserved > row.onHand) {
    throw new Error("RESERVED_EXCEEDS_ON_HAND");
  }

  if (idx >= 0) stock[idx] = row;
  else stock.push(row);

  const movement: StockMovement = {
    id: uid("mov"),
    at: new Date().toISOString(),
    warehouseId: args.warehouseId,
    ownerId: args.ownerId,
    skuId: args.skuId,
    toLocationId: args.delta >= 0 ? args.locationId : undefined,
    fromLocationId: args.delta < 0 ? args.locationId : undefined,
    qtyBefore: before,
    qtyDelta: args.delta,
    qtyAfter: next,
    quality: args.quality,
    lot: args.lot,
    docType: args.docType,
    docId: args.docId,
    taskId: args.taskId,
    actor: args.actor,
    reason: args.reason,
    txnId: args.txnId ?? uid("txn"),
  };

  // Drop zero rows to keep demo tidy
  const cleaned = stock.filter((s) => s.onHand > 0 || s.reserved > 0);
  return { stock: cleaned, movement };
}

export function moveStock(
  state: AppState,
  args: {
    ownerId: string;
    warehouseId: string;
    fromLocationId: string;
    toLocationId: string;
    skuId: string;
    qty: number;
    quality?: QualityStatus;
    lot?: string;
    docType: string;
    docId: string;
    taskId?: string;
    actor: string;
    reason: string;
    keepReservation?: boolean;
  }
): { stock: StockBalance[]; movements: StockMovement[] } {
  const txnId = uid("txn");
  const quality = args.quality ?? "GOOD";
  const out = applyStockDelta(state, {
    ownerId: args.ownerId,
    warehouseId: args.warehouseId,
    locationId: args.fromLocationId,
    skuId: args.skuId,
    quality,
    lot: args.lot,
    delta: -args.qty,
    reservedDelta: args.keepReservation ? -args.qty : 0,
    docType: args.docType,
    docId: args.docId,
    taskId: args.taskId,
    actor: args.actor,
    reason: `${args.reason} (out)`,
    txnId,
  });

  const mid: AppState = { ...state, stock: out.stock };
  const inn = applyStockDelta(mid, {
    ownerId: args.ownerId,
    warehouseId: args.warehouseId,
    locationId: args.toLocationId,
    skuId: args.skuId,
    quality,
    lot: args.lot,
    delta: args.qty,
    reservedDelta: args.keepReservation ? args.qty : 0,
    docType: args.docType,
    docId: args.docId,
    taskId: args.taskId,
    actor: args.actor,
    reason: `${args.reason} (in)`,
    txnId,
  });

  return {
    stock: inn.stock,
    movements: [out.movement!, inn.movement!].map((m) => ({
      ...m,
      fromLocationId: args.fromLocationId,
      toLocationId: args.toLocationId,
    })),
  };
}
