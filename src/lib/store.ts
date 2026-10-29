"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pickFifoLots, scoreWarehouses } from "./domain/allocation";
import {
  computeFreightCharge,
  matchStatement,
  parseFreightCsv,
} from "./domain/billing";
import {
  applyStockDelta,
  moveStock,
  recommendPutawayLocation,
} from "./domain/inventory";
import { createSeedState } from "./seed";
import type {
  AppState,
  CreationMode,
  InboundOrder,
  Locale,
  OutboundOrder,
  Package,
  Role,
} from "./types";
import { uid } from "./utils";

type Actions = {
  setLocale: (locale: Locale) => void;
  setCurrentUser: (userId: string) => void;
  resetDemo: () => void;

  // Integration
  syncErpInbound: (upstreamNumber: string) => { ok: boolean; message: string; inboundId?: string };
  retryIntegration: (eventId: string) => { ok: boolean; message: string };

  // Inbound
  submitInboundDraft: (id: string) => { ok: boolean; message: string };
  createManualInbound: (input: {
    warehouseId: string;
    ownerId: string;
    skuId: string;
    qty: number;
    reason: string;
  }) => { ok: boolean; message: string; id?: string };
  receiveInbound: (
    id: string,
    receipts: { lineId: string; qty: number }[]
  ) => { ok: boolean; message: string };
  confirmPutaway: (taskId: string) => { ok: boolean; message: string };
  closeShort: (id: string) => { ok: boolean; message: string };

  // Outbound
  scoreOrder: (id: string) => ReturnType<typeof scoreWarehouses>;
  allocateOutbound: (
    id: string,
    warehouseId?: string
  ) => { ok: boolean; message: string };
  splitAllocate: (id: string) => { ok: boolean; message: string };
  confirmPick: (
    taskId: string,
    pickedQty: number
  ) => { ok: boolean; message: string };
  packAndReadyShip: (outboundId: string) => { ok: boolean; message: string };
  shipOutbound: (
    outboundId: string
  ) => { ok: boolean; message: string; packageId?: string };
  cancelOutbound: (id: string) => { ok: boolean; message: string };

  // Transfer
  transferStock: (input: {
    warehouseId: string;
    ownerId: string;
    skuId: string;
    fromLocationId: string;
    toLocationId: string;
    qty: number;
  }) => { ok: boolean; message: string };

  // Fleet
  createTripFromPackage: (packageId: string) => { ok: boolean; message: string; tripId?: string };
  assignTrip: (
    tripId: string,
    vehicleId: string,
    driverId: string
  ) => { ok: boolean; message: string };
  departTrip: (tripId: string) => { ok: boolean; message: string };
  deliverTrip: (
    tripId: string,
    podName: string
  ) => { ok: boolean; message: string };

  // Assets
  issueAssets: (input: {
    tripId: string;
    assetIds: string[];
    issuedTo: string;
    dueAt: string;
  }) => { ok: boolean; message: string };
  returnAssets: (
    handoverId: string,
    assetIds: string[]
  ) => { ok: boolean; message: string };

  // Billing
  importFreightStatement: (
    csv: string,
    fileName: string
  ) => { ok: boolean; message: string; statementId?: string };
  runMatch: (statementId: string) => { ok: boolean; message: string };
  resolveDispute: (
    matchId: string,
    resolution: string,
    acceptVendor: boolean
  ) => { ok: boolean; message: string };
  approveSettlements: (statementId: string) => { ok: boolean; message: string };
};

export type WmsStore = AppState & Actions;

function actorName(state: AppState): string {
  return state.users.find((u) => u.id === state.currentUserId)?.name ?? "system";
}

function currentUser(state: AppState) {
  return state.users.find((u) => u.id === state.currentUserId);
}

function canAccessOwner(state: AppState, ownerId: string): boolean {
  const u = currentUser(state);
  if (!u) return false;
  return u.ownerIds.includes(ownerId);
}

function audit(
  entries: AppState["inbounds"][0]["audit"],
  action: string,
  detail: string,
  actor: string
) {
  return [...entries, { at: new Date().toISOString(), actor, action, detail }];
}

export const useWmsStore = create<WmsStore>()(
  persist(
    (set, get) => ({
      ...createSeedState(),

      setLocale: (locale) => set({ locale }),
      setCurrentUser: (userId) => set({ currentUserId: userId }),
      resetDemo: () => {
        const locale = get().locale;
        set({ ...createSeedState(), locale });
      },

      syncErpInbound: (upstreamNumber) => {
        const state = get();
        const key = `demo|ERP|PO|${upstreamNumber}`;
        const existingEvt = state.integrationEvents.find(
          (e) => e.idempotencyKey === key
        );
        const existingInb = state.inbounds.find(
          (i) => i.upstreamNumber === upstreamNumber
        );
        if (existingInb) {
          const evt = {
            id: uid("evt"),
            direction: "IN" as const,
            type: "inbound.created",
            sourceSystem: "ERP" as const,
            idempotencyKey: key,
            payloadSummary: `Duplicate ignored → ${existingInb.number}`,
            status: "SUCCESS" as const,
            retries: 0,
            relatedDocId: existingInb.id,
            createdAt: new Date().toISOString(),
          };
          set({
            integrationEvents: [evt, ...state.integrationEvents],
          });
          return {
            ok: true,
            message: "IDEMPOTENT_NO_SIDE_EFFECT",
            inboundId: existingInb.id,
          };
        }

        const id = uid("inb");
        const inbound: InboundOrder = {
          id,
          number: `INB-2026-${String(state.inbounds.length + 100).padStart(4, "0")}`,
          type: "PO",
          status: "AWAITING_RECEIPT",
          warehouseId: "wh_nj",
          ownerId: "own_aurora",
          creationMode: "SYSTEM_SYNC",
          sourceSystem: "ERP",
          upstreamType: "PO",
          upstreamNumber,
          externalVersion: 1,
          syncStatus: "SUCCESS",
          lastSyncAt: new Date().toISOString(),
          createdBy: "erp.sync",
          createdAt: new Date().toISOString(),
          expectedAt: new Date(Date.now() + 86400000).toISOString(),
          lines: [
            {
              id: uid("inbl"),
              skuId: "sku_01",
              expectedQty: 100,
              receivedQty: 0,
              putawayQty: 0,
              closedShortQty: 0,
            },
          ],
          audit: [
            {
              at: new Date().toISOString(),
              actor: "erp.sync",
              action: "SYNCED",
              detail: `inbound.created ${upstreamNumber}`,
            },
          ],
        };
        set({
          inbounds: [inbound, ...state.inbounds],
          integrationEvents: [
            {
              id: uid("evt"),
              direction: "IN",
              type: "inbound.created",
              sourceSystem: "ERP",
              idempotencyKey: key,
              payloadSummary: `${upstreamNumber} → ${inbound.number}`,
              status: "SUCCESS",
              retries: 0,
              relatedDocId: id,
              createdAt: new Date().toISOString(),
            },
            ...state.integrationEvents,
          ],
        });
        void existingEvt;
        return { ok: true, message: "SYNCED", inboundId: id };
      },

      retryIntegration: (eventId) => {
        const state = get();
        const evt = state.integrationEvents.find((e) => e.id === eventId);
        if (!evt) return { ok: false, message: "NOT_FOUND" };
        set({
          integrationEvents: state.integrationEvents.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  status: "SUCCESS",
                  retries: e.retries + 1,
                  lastError: undefined,
                }
              : e
          ),
        });
        return { ok: true, message: "RETRIED" };
      },

      submitInboundDraft: (id) => {
        const state = get();
        const inbound = state.inbounds.find((i) => i.id === id);
        if (!inbound) return { ok: false, message: "NOT_FOUND" };
        if (inbound.status !== "DRAFT") return { ok: false, message: "INVALID_STATUS" };
        set({
          inbounds: state.inbounds.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: "AWAITING_RECEIPT",
                  audit: audit(i.audit, "SUBMITTED", "Draft submitted", actorName(state)),
                }
              : i
          ),
        });
        return { ok: true, message: "SUBMITTED" };
      },

      createManualInbound: (input) => {
        const state = get();
        if (!canAccessOwner(state, input.ownerId)) {
          return { ok: false, message: "OWNER_FORBIDDEN" };
        }
        const id = uid("inb");
        const inbound: InboundOrder = {
          id,
          number: `INB-2026-${String(state.inbounds.length + 100).padStart(4, "0")}`,
          type: "OTHER",
          status: "DRAFT",
          warehouseId: input.warehouseId,
          ownerId: input.ownerId,
          creationMode: "MANUAL",
          sourceSystem: "WMS",
          syncStatus: "NONE",
          createdBy: actorName(state),
          createdAt: new Date().toISOString(),
          expectedAt: new Date(Date.now() + 86400000).toISOString(),
          reason: input.reason,
          lines: [
            {
              id: uid("inbl"),
              skuId: input.skuId,
              expectedQty: input.qty,
              receivedQty: 0,
              putawayQty: 0,
              closedShortQty: 0,
            },
          ],
          audit: [
            {
              at: new Date().toISOString(),
              actor: actorName(state),
              action: "CREATED",
              detail: "Manual inbound created",
            },
          ],
        };
        set({ inbounds: [inbound, ...state.inbounds] });
        return { ok: true, message: "CREATED", id };
      },

      receiveInbound: (id, receipts) => {
        const state = get();
        const inbound = state.inbounds.find((i) => i.id === id);
        if (!inbound) return { ok: false, message: "NOT_FOUND" };
        if (
          !["AWAITING_RECEIPT", "RECEIVING", "AWAITING_PUTAWAY", "PUTTING_AWAY"].includes(
            inbound.status
          )
        ) {
          return { ok: false, message: "INVALID_STATUS" };
        }

        const recvLoc = state.locations.find(
          (l) => l.warehouseId === inbound.warehouseId && l.type === "recv_stage"
        );
        if (!recvLoc) return { ok: false, message: "NO_RECV_LOCATION" };

        let stock = state.stock;
        const movements = [...state.movements];
        const putawayTasks = [...state.putawayTasks];
        const lines = inbound.lines.map((line) => {
          const r = receipts.find((x) => x.lineId === line.id);
          if (!r || r.qty <= 0) return line;
          const remaining = line.expectedQty - line.receivedQty - line.closedShortQty;
          const qty = Math.min(r.qty, Math.max(0, remaining + Math.floor(remaining * 0.05))); // tiny over-receive tolerance display path
          const accept = Math.min(r.qty, remaining); // demo: do not auto overstock beyond expected for A03
          if (accept <= 0) return line;

          const applied = applyStockDelta(
            { ...state, stock },
            {
              ownerId: inbound.ownerId,
              warehouseId: inbound.warehouseId,
              locationId: recvLoc.id,
              skuId: line.skuId,
              quality: "GOOD",
              lot: line.lot,
              delta: accept,
              docType: "INBOUND",
              docId: inbound.id,
              actor: actorName(state),
              reason: "Receive to staging (not allocatable)",
            }
          );
          stock = applied.stock;
          if (applied.movement) movements.unshift(applied.movement);

          const target =
            recommendPutawayLocation(
              { ...state, stock },
              inbound.warehouseId,
              line.skuId
            ) ??
            state.locations.find(
              (l) => l.warehouseId === inbound.warehouseId && l.type === "storage"
            )!;

          putawayTasks.unshift({
            id: uid("put"),
            inboundId: inbound.id,
            warehouseId: inbound.warehouseId,
            skuId: line.skuId,
            qty: accept,
            fromLocationId: recvLoc.id,
            toLocationId: target.id,
            status: "OPEN",
            lot: line.lot,
          });

          void qty;
          return { ...line, receivedQty: line.receivedQty + accept };
        });

        const allReceived = lines.every(
          (l) => l.receivedQty + l.closedShortQty >= l.expectedQty
        );
        const anyReceived = lines.some((l) => l.receivedQty > 0);

        set({
          stock,
          movements,
          putawayTasks,
          inbounds: state.inbounds.map((i) =>
            i.id === id
              ? {
                  ...i,
                  lines,
                  status: allReceived
                    ? "AWAITING_PUTAWAY"
                    : anyReceived
                      ? "RECEIVING"
                      : i.status,
                  audit: audit(
                    i.audit,
                    "RECEIVED",
                    `Received lines: ${receipts.map((r) => r.qty).join(",")}`,
                    actorName(state)
                  ),
                }
              : i
          ),
          integrationEvents: [
            {
              id: uid("evt"),
              direction: "OUT",
              type: "receipt.confirmed",
              sourceSystem: "ERP",
              idempotencyKey: `demo|ERP|RCPT|${inbound.id}|${Date.now()}`,
              payloadSummary: `${inbound.number} receipt confirmed`,
              status: "SUCCESS",
              retries: 0,
              relatedDocId: inbound.id,
              createdAt: new Date().toISOString(),
            },
            ...state.integrationEvents,
          ],
        });
        return { ok: true, message: "RECEIVED" };
      },

      confirmPutaway: (taskId) => {
        const state = get();
        const task = state.putawayTasks.find((t) => t.id === taskId);
        if (!task || task.status !== "OPEN") return { ok: false, message: "NOT_FOUND" };
        const inbound = state.inbounds.find((i) => i.id === task.inboundId);
        if (!inbound) return { ok: false, message: "INBOUND_MISSING" };

        try {
          const moved = moveStock(state, {
            ownerId: inbound.ownerId,
            warehouseId: task.warehouseId,
            fromLocationId: task.fromLocationId,
            toLocationId: task.toLocationId,
            skuId: task.skuId,
            qty: task.qty,
            lot: task.lot,
            docType: "PUTAWAY",
            docId: inbound.id,
            taskId: task.id,
            actor: actorName(state),
            reason: "Putaway from staging to target",
          });

          const lines = inbound.lines.map((l) =>
            l.skuId === task.skuId
              ? { ...l, putawayQty: l.putawayQty + task.qty }
              : l
          );
          const openTasks = state.putawayTasks.filter(
            (t) => t.inboundId === inbound.id && t.id !== taskId && t.status === "OPEN"
          );
          const allPut = lines.every((l) => l.putawayQty >= l.receivedQty);
          const fullyClosed = lines.every(
            (l) => l.receivedQty + l.closedShortQty >= l.expectedQty
          );
          const nextStatus =
            allPut && openTasks.length === 0
              ? fullyClosed
                ? "COMPLETED"
                : "RECEIVING"
              : "PUTTING_AWAY";

          set({
            stock: moved.stock,
            movements: [...moved.movements, ...state.movements],
            putawayTasks: state.putawayTasks.map((t) =>
              t.id === taskId ? { ...t, status: "DONE" } : t
            ),
            inbounds: state.inbounds.map((i) =>
              i.id === inbound.id
                ? {
                    ...i,
                    lines,
                    status: nextStatus,
                    audit: audit(
                      i.audit,
                      "PUTAWAY",
                      `Putaway ${task.qty} of ${task.skuId}`,
                      actorName(state)
                    ),
                  }
                : i
            ),
            integrationEvents: [
              {
                id: uid("evt"),
                direction: "OUT",
                type: "putaway.completed",
                sourceSystem: "ERP",
                idempotencyKey: `demo|ERP|PUT|${task.id}`,
                payloadSummary: `${inbound.number} putaway done`,
                status: "SUCCESS",
                retries: 0,
                relatedDocId: inbound.id,
                createdAt: new Date().toISOString(),
              },
              ...state.integrationEvents,
            ],
          });
          return { ok: true, message: "PUTAWAY_DONE" };
        } catch (e) {
          return { ok: false, message: String(e) };
        }
      },

      closeShort: (id) => {
        const state = get();
        const inbound = state.inbounds.find((i) => i.id === id);
        if (!inbound) return { ok: false, message: "NOT_FOUND" };
        const lines = inbound.lines.map((l) => ({
          ...l,
          closedShortQty: Math.max(0, l.expectedQty - l.receivedQty),
        }));
        const openPuts = state.putawayTasks.some(
          (t) => t.inboundId === id && t.status === "OPEN"
        );
        set({
          inbounds: state.inbounds.map((i) =>
            i.id === id
              ? {
                  ...i,
                  lines,
                  status: openPuts ? "PUTTING_AWAY" : "CLOSED",
                  audit: audit(
                    i.audit,
                    "CLOSE_SHORT",
                    "Short quantity closed with approval",
                    actorName(state)
                  ),
                }
              : i
          ),
        });
        return { ok: true, message: "CLOSED_SHORT" };
      },

      scoreOrder: (id) => {
        const state = get();
        const order = state.outbounds.find((o) => o.id === id);
        if (!order) return [];
        return scoreWarehouses(state, order);
      },

      allocateOutbound: (id, warehouseId) => {
        const state = get();
        const order = state.outbounds.find((o) => o.id === id);
        if (!order) return { ok: false, message: "NOT_FOUND" };
        if (!canAccessOwner(state, order.ownerId)) {
          return { ok: false, message: "OWNER_FORBIDDEN" };
        }
        if (
          !["AWAITING_ALLOCATION", "DRAFT"].includes(order.status) &&
          order.status !== "ALLOCATED"
        ) {
          // allow only waiting
          if (order.status !== "AWAITING_ALLOCATION") {
            return { ok: false, message: "INVALID_STATUS" };
          }
        }

        const whId = warehouseId ?? order.warehouseId;
        try {
          let stock = [...state.stock];
          const reservations = [...state.reservations];
          const pickTasks = [...state.pickTasks];
          const shipStage = state.locations.find(
            (l) => l.warehouseId === whId && l.type === "ship_stage"
          );
          if (!shipStage) return { ok: false, message: "NO_SHIP_STAGE" };

          const lines = order.lines.map((line) => {
            const picks = pickFifoLots(
              { ...state, stock },
              {
                warehouseId: whId,
                ownerId: order.ownerId,
                skuId: line.skuId,
                qty: line.requestedQty - line.allocatedQty,
              }
            );
            let allocated = line.allocatedQty;
            for (const p of picks) {
              stock = stock.map((s) =>
                s.id === p.stockId ? { ...s, reserved: s.reserved + p.qty } : s
              );
              const reservationId = uid("rsv");
              reservations.unshift({
                id: reservationId,
                outboundId: order.id,
                stockId: p.stockId,
                skuId: line.skuId,
                warehouseId: whId,
                locationId: p.locationId,
                qty: p.qty,
                status: "ACTIVE",
                lot: p.lot,
              });
              pickTasks.unshift({
                id: uid("pick"),
                outboundId: order.id,
                reservationId,
                warehouseId: whId,
                skuId: line.skuId,
                fromLocationId: p.locationId,
                toLocationId: shipStage.id,
                qty: p.qty,
                pickedQty: 0,
                status: "OPEN",
                lot: p.lot,
              });
              allocated += p.qty;
            }
            return { ...line, allocatedQty: allocated };
          });

          set({
            stock,
            reservations,
            pickTasks,
            outbounds: state.outbounds.map((o) =>
              o.id === id
                ? {
                    ...o,
                    warehouseId: whId,
                    lines,
                    status: "ALLOCATED",
                    audit: audit(
                      o.audit,
                      "ALLOCATED",
                      `Allocated at ${whId}`,
                      actorName(state)
                    ),
                  }
                : o
            ),
          });
          return { ok: true, message: "ALLOCATED" };
        } catch {
          return { ok: false, message: "INSUFFICIENT_AVAILABLE" };
        }
      },

      splitAllocate: (id) => {
        const state = get();
        const order = state.outbounds.find((o) => o.id === id);
        if (!order) return { ok: false, message: "NOT_FOUND" };
        if (!order.allowSplit) return { ok: false, message: "SPLIT_NOT_ALLOWED" };
        const line = order.lines[0];
        if (!line) return { ok: false, message: "NO_LINES" };

        const scores = scoreWarehouses(state, order)
          .filter((s) => !s.eliminatedReason && s.available > 0)
          .sort((a, b) => b.score - a.score);
        if (scores.length === 0) return { ok: false, message: "NO_CANDIDATE" };

        let remaining = line.requestedQty;
        const children: OutboundOrder[] = [];
        for (const s of scores) {
          if (remaining <= 0) break;
          const take = Math.min(s.available, remaining);
          const childId = uid("out");
          children.push({
            ...order,
            id: childId,
            number: `${order.number}-${s.code}`,
            warehouseId: s.warehouseId,
            parentId: order.id,
            splitReason: `Weighted split: avail=${s.available}, score=${s.score}`,
            status: "AWAITING_ALLOCATION",
            lines: [
              {
                ...line,
                id: uid("outl"),
                requestedQty: take,
                allocatedQty: 0,
                pickedQty: 0,
                shippedQty: 0,
                cancelledQty: 0,
              },
            ],
            audit: [
              {
                at: new Date().toISOString(),
                actor: actorName(state),
                action: "SPLIT_CHILD",
                detail: `From ${order.number}`,
              },
            ],
          });
          remaining -= take;
        }

        if (remaining > 0 && children.length === 0) {
          return { ok: false, message: "INSUFFICIENT_AVAILABLE" };
        }

        // Allocate each child
        let nextState: AppState = {
          ...state,
          outbounds: [
            ...children,
            ...state.outbounds.map((o) =>
              o.id === id
                ? {
                    ...o,
                    status: "CLOSED" as const,
                    audit: audit(
                      o.audit,
                      "SPLIT_PARENT",
                      `Split into ${children.map((c) => c.number).join(", ")}`,
                      actorName(state)
                    ),
                  }
                : o
            ),
          ],
        };

        set(nextState);

        for (const child of children) {
          const res = get().allocateOutbound(child.id, child.warehouseId);
          if (!res.ok) {
            return { ok: false, message: res.message };
          }
        }
        void nextState;
        return { ok: true, message: "SPLIT_ALLOCATED" };
      },

      confirmPick: (taskId, pickedQty) => {
        const state = get();
        const task = state.pickTasks.find((t) => t.id === taskId);
        if (!task || task.status !== "OPEN") return { ok: false, message: "NOT_FOUND" };
        const order = state.outbounds.find((o) => o.id === task.outboundId);
        if (!order) return { ok: false, message: "ORDER_MISSING" };

        const qty = Math.min(pickedQty, task.qty);
        try {
          if (qty < task.qty) {
            // short pick: move picked qty, release remainder reservation, isolate shortage
            const moved =
              qty > 0
                ? moveStock(state, {
                    ownerId: order.ownerId,
                    warehouseId: task.warehouseId,
                    fromLocationId: task.fromLocationId,
                    toLocationId: task.toLocationId,
                    skuId: task.skuId,
                    qty,
                    lot: task.lot,
                    docType: "PICK",
                    docId: order.id,
                    taskId: task.id,
                    actor: actorName(state),
                    reason: "Short pick move",
                    keepReservation: true,
                  })
                : { stock: state.stock, movements: [] as AppState["movements"] };

            let stock = moved.stock;
            // release unpicked reservation on source
            const short = task.qty - qty;
            stock = stock.map((s) =>
              s.id ===
              state.reservations.find((r) => r.id === task.reservationId)?.stockId
                ? { ...s, reserved: Math.max(0, s.reserved - short) }
                : s
            );

            // isolate remaining on-hand at source into damaged/hold if still there
            const dmg = state.locations.find(
              (l) => l.warehouseId === task.warehouseId && l.type === "damaged"
            );
            let movements = [...moved.movements, ...state.movements];
            if (dmg && short > 0) {
              try {
                const iso = moveStock(
                  { ...state, stock },
                  {
                    ownerId: order.ownerId,
                    warehouseId: task.warehouseId,
                    fromLocationId: task.fromLocationId,
                    toLocationId: dmg.id,
                    skuId: task.skuId,
                    qty: Math.min(
                      short,
                      stock.find(
                        (s) =>
                          s.locationId === task.fromLocationId &&
                          s.skuId === task.skuId
                      )?.onHand ?? 0
                    ),
                    quality: "GOOD",
                    lot: task.lot,
                    docType: "SHORT_ISOLATE",
                    docId: order.id,
                    taskId: task.id,
                    actor: actorName(state),
                    reason: "Isolate suspected shortage",
                  }
                );
                // re-tag quality by applying damaged via delta trick: move then mark
                stock = iso.stock.map((s) =>
                  s.locationId === dmg.id && s.skuId === task.skuId
                    ? { ...s, quality: "HOLD" as const }
                    : s
                );
                movements = [...iso.movements, ...movements];
              } catch {
                // if cannot isolate, keep released reservation only
              }
            }

            set({
              stock,
              movements,
              reservations: state.reservations.map((r) =>
                r.id === task.reservationId
                  ? {
                      ...r,
                      qty,
                      status: qty > 0 ? "PICKED" : "RELEASED",
                      locationId: qty > 0 ? task.toLocationId : r.locationId,
                    }
                  : r
              ),
              pickTasks: state.pickTasks.map((t) =>
                t.id === taskId
                  ? { ...t, pickedQty: qty, status: "SHORT" }
                  : t
              ),
              outbounds: state.outbounds.map((o) =>
                o.id === order.id
                  ? {
                      ...o,
                      status: "PICKING",
                      lines: o.lines.map((l) =>
                        l.skuId === task.skuId
                          ? { ...l, pickedQty: l.pickedQty + qty }
                          : l
                      ),
                      audit: audit(
                        o.audit,
                        "SHORT_PICK",
                        `Expected ${task.qty}, picked ${qty}`,
                        actorName(state)
                      ),
                    }
                  : o
              ),
            });
            return { ok: true, message: "SHORT_PICKED" };
          }

          const moved = moveStock(state, {
            ownerId: order.ownerId,
            warehouseId: task.warehouseId,
            fromLocationId: task.fromLocationId,
            toLocationId: task.toLocationId,
            skuId: task.skuId,
            qty,
            lot: task.lot,
            docType: "PICK",
            docId: order.id,
            taskId: task.id,
            actor: actorName(state),
            reason: "Pick to ship stage",
            keepReservation: true,
          });

          const remainingOpen = state.pickTasks.some(
            (t) =>
              t.outboundId === order.id && t.id !== taskId && t.status === "OPEN"
          );

          set({
            stock: moved.stock,
            movements: [...moved.movements, ...state.movements],
            reservations: state.reservations.map((r) =>
              r.id === task.reservationId
                ? { ...r, status: "PICKED", locationId: task.toLocationId }
                : r
            ),
            pickTasks: state.pickTasks.map((t) =>
              t.id === taskId ? { ...t, pickedQty: qty, status: "DONE" } : t
            ),
            outbounds: state.outbounds.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    status: remainingOpen ? "PICKING" : "AWAITING_PACK",
                    lines: o.lines.map((l) =>
                      l.skuId === task.skuId
                        ? { ...l, pickedQty: l.pickedQty + qty }
                        : l
                    ),
                    audit: audit(
                      o.audit,
                      "PICKED",
                      `Picked ${qty}`,
                      actorName(state)
                    ),
                  }
                : o
            ),
          });
          return { ok: true, message: "PICKED" };
        } catch (e) {
          return { ok: false, message: String(e) };
        }
      },

      packAndReadyShip: (outboundId) => {
        const state = get();
        const order = state.outbounds.find((o) => o.id === outboundId);
        if (!order) return { ok: false, message: "NOT_FOUND" };
        if (!["AWAITING_PACK", "PICKING", "AWAITING_SHIP"].includes(order.status)) {
          return { ok: false, message: "INVALID_STATUS" };
        }
        const open = state.pickTasks.some(
          (t) => t.outboundId === outboundId && t.status === "OPEN"
        );
        if (open) return { ok: false, message: "PICKS_OPEN" };
        set({
          outbounds: state.outbounds.map((o) =>
            o.id === outboundId
              ? {
                  ...o,
                  status: "AWAITING_SHIP",
                  audit: audit(o.audit, "PACKED", "Pack confirmed", actorName(state)),
                }
              : o
          ),
        });
        return { ok: true, message: "READY_TO_SHIP" };
      },

      shipOutbound: (outboundId) => {
        const state = get();
        const order = state.outbounds.find((o) => o.id === outboundId);
        if (!order) return { ok: false, message: "NOT_FOUND" };
        if (order.status === "SHIPPED") {
          return { ok: false, message: "ALREADY_SHIPPED" };
        }
        if (order.status !== "AWAITING_SHIP" && order.status !== "PARTIAL_SHIPPED") {
          return { ok: false, message: "INVALID_STATUS" };
        }

        const shipStage = state.locations.find(
          (l) => l.warehouseId === order.warehouseId && l.type === "ship_stage"
        );
        if (!shipStage) return { ok: false, message: "NO_SHIP_STAGE" };

        try {
          let stock = state.stock;
          const movements = [...state.movements];
          const packageLines: Package["lines"] = [];
          let weight = 0;

          for (const line of order.lines) {
            const shipQty = line.pickedQty - line.shippedQty;
            if (shipQty <= 0) continue;
            const sku = state.skus.find((s) => s.id === line.skuId)!;
            const applied = applyStockDelta(
              { ...state, stock },
              {
                ownerId: order.ownerId,
                warehouseId: order.warehouseId,
                locationId: shipStage.id,
                skuId: line.skuId,
                quality: "GOOD",
                delta: -shipQty,
                reservedDelta: -shipQty,
                docType: "SHIPMENT",
                docId: order.id,
                actor: actorName(state),
                reason: "Carrier handoff deduct on-hand + reservation",
              }
            );
            stock = applied.stock;
            if (applied.movement) movements.unshift(applied.movement);
            packageLines.push({ skuId: line.skuId, qty: shipQty });
            weight += sku.weightLb * shipQty;
          }

          if (packageLines.length === 0) {
            return { ok: false, message: "NOTHING_TO_SHIP" };
          }

          const trackingNumber = `FL${Date.now().toString().slice(-10)}`;
          const pkg: Package = {
            id: uid("pkg"),
            outboundId: order.id,
            warehouseId: order.warehouseId,
            trackingNumber,
            weightLb: Math.max(1, Math.round(weight * 10) / 10),
            lengthIn: 12,
            widthIn: 10,
            heightIn: 8,
            status: "SHIPPED",
            carrierId: "car_fastlane",
            lines: packageLines,
          };

          const charge = computeFreightCharge(
            state,
            pkg,
            order.shipState || "DEFAULT"
          );

          set({
            stock,
            movements,
            packages: [pkg, ...state.packages],
            chargeEvents: [charge, ...state.chargeEvents],
            reservations: state.reservations.map((r) =>
              r.outboundId === order.id && r.status === "PICKED"
                ? { ...r, status: "SHIPPED" }
                : r
            ),
            outbounds: state.outbounds.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    status: "SHIPPED",
                    lines: o.lines.map((l) => ({
                      ...l,
                      shippedQty: l.pickedQty,
                    })),
                    audit: audit(
                      o.audit,
                      "SHIPPED",
                      `Shipped ${trackingNumber}`,
                      actorName(state)
                    ),
                  }
                : o
            ),
            integrationEvents: [
              {
                id: uid("evt"),
                direction: "OUT",
                type: "shipment.confirmed",
                sourceSystem: "OMS",
                idempotencyKey: `demo|OMS|SHIP|${order.id}|${trackingNumber}`,
                payloadSummary: `${order.number} shipped ${trackingNumber}`,
                status: "SUCCESS",
                retries: 0,
                relatedDocId: order.id,
                createdAt: new Date().toISOString(),
              },
              ...state.integrationEvents,
            ],
          });
          return { ok: true, message: "SHIPPED", packageId: pkg.id };
        } catch (e) {
          return { ok: false, message: String(e) };
        }
      },

      cancelOutbound: (id) => {
        const state = get();
        const order = state.outbounds.find((o) => o.id === id);
        if (!order) return { ok: false, message: "NOT_FOUND" };
        if (["SHIPPED", "CLOSED"].includes(order.status)) {
          return { ok: false, message: "USE_RETURN_FLOW" };
        }

        // Release active reservations if not picked; if picked, leave note for putback
        let stock = state.stock;
        for (const r of state.reservations.filter(
          (x) => x.outboundId === id && x.status === "ACTIVE"
        )) {
          stock = stock.map((s) =>
            s.id === r.stockId
              ? { ...s, reserved: Math.max(0, s.reserved - r.qty) }
              : s
          );
        }

        set({
          stock,
          reservations: state.reservations.map((r) =>
            r.outboundId === id && r.status === "ACTIVE"
              ? { ...r, status: "RELEASED" }
              : r
          ),
          pickTasks: state.pickTasks.map((t) =>
            t.outboundId === id && t.status === "OPEN"
              ? { ...t, status: "CANCELLED" }
              : t
          ),
          outbounds: state.outbounds.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: "CANCELLED",
                  audit: audit(o.audit, "CANCELLED", "Cancelled before ship", actorName(state)),
                }
              : o
          ),
        });
        return { ok: true, message: "CANCELLED" };
      },

      transferStock: (input) => {
        const state = get();
        try {
          const moved = moveStock(state, {
            ...input,
            docType: "TRANSFER",
            docId: uid("tr"),
            actor: actorName(state),
            reason: "Internal location transfer",
          });
          // Ensure total warehouse qty unchanged is inherent
          set({
            stock: moved.stock,
            movements: [...moved.movements, ...state.movements],
          });
          return { ok: true, message: "TRANSFERRED" };
        } catch (e) {
          return { ok: false, message: String(e) };
        }
      },

      createTripFromPackage: (packageId) => {
        const state = get();
        const pkg = state.packages.find((p) => p.id === packageId);
        if (!pkg) return { ok: false, message: "NOT_FOUND" };
        if (pkg.tripId) return { ok: false, message: "ALREADY_ON_TRIP" };
        const order = state.outbounds.find((o) => o.id === pkg.outboundId);
        const tripId = uid("trip");
        const trip = {
          id: tripId,
          number: `TRP-${String(state.trips.length + 1).padStart(4, "0")}`,
          status: "PENDING_DISPATCH" as const,
          warehouseId: pkg.warehouseId,
          packageIds: [pkg.id],
          origin: state.warehouses.find((w) => w.id === pkg.warehouseId)?.code ?? "",
          destination: order?.shipTo ?? "Unknown",
          scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
          assetHandoverIds: [],
          timeline: [
            {
              at: new Date().toISOString(),
              label: "Trip created from shipment",
              simulated: true,
            },
          ],
          audit: [
            {
              at: new Date().toISOString(),
              actor: actorName(state),
              action: "CREATED",
              detail: `Package ${pkg.trackingNumber}`,
            },
          ],
        };
        set({
          trips: [trip, ...state.trips],
          packages: state.packages.map((p) =>
            p.id === packageId ? { ...p, tripId, status: "IN_TRANSIT" } : p
          ),
        });
        return { ok: true, message: "TRIP_CREATED", tripId };
      },

      assignTrip: (tripId, vehicleId, driverId) => {
        const state = get();
        const trip = state.trips.find((t) => t.id === tripId);
        if (!trip) return { ok: false, message: "NOT_FOUND" };
        const vehicle = state.vehicles.find((v) => v.id === vehicleId);
        const driver = state.drivers.find((d) => d.id === driverId);
        if (!vehicle || !driver) return { ok: false, message: "MISSING_RESOURCE" };
        if (vehicle.status !== "AVAILABLE") return { ok: false, message: "VEHICLE_UNAVAILABLE" };
        if (driver.status !== "AVAILABLE") return { ok: false, message: "DRIVER_UNAVAILABLE" };

        // Conflict: already assigned elsewhere
        const conflict = state.trips.some(
          (t) =>
            t.id !== tripId &&
            ["DISPATCHED", "AWAITING_LOAD", "IN_TRANSIT"].includes(t.status) &&
            (t.vehicleId === vehicleId || t.driverId === driverId)
        );
        if (conflict) return { ok: false, message: "SCHEDULE_CONFLICT" };

        set({
          vehicles: state.vehicles.map((v) =>
            v.id === vehicleId ? { ...v, status: "ASSIGNED" } : v
          ),
          drivers: state.drivers.map((d) =>
            d.id === driverId ? { ...d, status: "ASSIGNED" } : d
          ),
          trips: state.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  vehicleId,
                  driverId,
                  status: "DISPATCHED",
                  timeline: [
                    ...t.timeline,
                    {
                      at: new Date().toISOString(),
                      label: `Dispatched ${vehicle.code} / ${driver.name}`,
                      simulated: true,
                    },
                  ],
                  audit: audit(
                    t.audit,
                    "DISPATCHED",
                    `${vehicle.code} + ${driver.name}`,
                    actorName(state)
                  ),
                }
              : t
          ),
        });
        return { ok: true, message: "DISPATCHED" };
      },

      departTrip: (tripId) => {
        const state = get();
        const trip = state.trips.find((t) => t.id === tripId);
        if (!trip || trip.status !== "DISPATCHED") {
          return { ok: false, message: "INVALID_STATUS" };
        }
        set({
          trips: state.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  status: "IN_TRANSIT",
                  departedAt: new Date().toISOString(),
                  timeline: [
                    ...t.timeline,
                    {
                      at: new Date().toISOString(),
                      label: "Departed warehouse (simulated)",
                      simulated: true,
                    },
                  ],
                }
              : t
          ),
        });
        return { ok: true, message: "DEPARTED" };
      },

      deliverTrip: (tripId, podName) => {
        const state = get();
        const trip = state.trips.find((t) => t.id === tripId);
        if (!trip || !["IN_TRANSIT", "DISPATCHED"].includes(trip.status)) {
          return { ok: false, message: "INVALID_STATUS" };
        }
        set({
          trips: state.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  status: "DELIVERED",
                  deliveredAt: new Date().toISOString(),
                  podName,
                  timeline: [
                    ...t.timeline,
                    {
                      at: new Date().toISOString(),
                      label: `POD by ${podName} (simulated)`,
                      simulated: true,
                    },
                  ],
                  audit: audit(t.audit, "DELIVERED", `POD ${podName}`, actorName(state)),
                }
              : t
          ),
          packages: state.packages.map((p) =>
            trip.packageIds.includes(p.id) ? { ...p, status: "DELIVERED" } : p
          ),
          vehicles: state.vehicles.map((v) =>
            v.id === trip.vehicleId ? { ...v, status: "AVAILABLE" } : v
          ),
          drivers: state.drivers.map((d) =>
            d.id === trip.driverId ? { ...d, status: "AVAILABLE" } : d
          ),
          handovers: state.handovers.map((h) =>
            trip.assetHandoverIds.includes(h.id)
              ? { ...h, status: h.returnedAssetIds.length ? h.status : "OPEN" }
              : h
          ),
        });
        return { ok: true, message: "DELIVERED" };
      },

      issueAssets: (input) => {
        const state = get();
        const trip = state.trips.find((t) => t.id === input.tripId);
        if (!trip) return { ok: false, message: "TRIP_MISSING" };
        const assets = state.assets.filter((a) => input.assetIds.includes(a.id));
        if (assets.some((a) => a.status !== "AVAILABLE")) {
          return { ok: false, message: "ASSET_NOT_AVAILABLE" };
        }
        const handoverId = uid("ho");
        set({
          assets: state.assets.map((a) =>
            input.assetIds.includes(a.id)
              ? {
                  ...a,
                  status: "ISSUED",
                  holder: input.issuedTo,
                  locationLabel: "WITH_CUSTOMER",
                  dueAt: input.dueAt,
                }
              : a
          ),
          handovers: [
            {
              id: handoverId,
              tripId: input.tripId,
              assetIds: input.assetIds,
              issuedTo: input.issuedTo,
              issuedAt: new Date().toISOString(),
              dueAt: input.dueAt,
              returnedAssetIds: [],
              status: "OPEN",
            },
            ...state.handovers,
          ],
          trips: state.trips.map((t) =>
            t.id === input.tripId
              ? {
                  ...t,
                  assetHandoverIds: [...t.assetHandoverIds, handoverId],
                  audit: audit(
                    t.audit,
                    "ASSET_ISSUE",
                    `Issued ${input.assetIds.length} totes`,
                    actorName(state)
                  ),
                }
              : t
          ),
        });
        return { ok: true, message: "ISSUED" };
      },

      returnAssets: (handoverId, assetIds) => {
        const state = get();
        const ho = state.handovers.find((h) => h.id === handoverId);
        if (!ho) return { ok: false, message: "NOT_FOUND" };
        const returning = assetIds.filter(
          (id) => ho.assetIds.includes(id) && !ho.returnedAssetIds.includes(id)
        );
        if (returning.length === 0) return { ok: false, message: "NOTHING_TO_RETURN" };

        const returnedAssetIds = [...ho.returnedAssetIds, ...returning];
        const complete = returnedAssetIds.length >= ho.assetIds.length;
        const overdue =
          !complete && new Date(ho.dueAt).getTime() < Date.now() ? "OVERDUE" : ho.status;

        set({
          assets: state.assets.map((a) =>
            returning.includes(a.id)
              ? {
                  ...a,
                  status: "AVAILABLE",
                  holder: "WAREHOUSE",
                  locationLabel: "NJ-01 / RECV-01",
                  dueAt: undefined,
                }
              : a
          ),
          handovers: state.handovers.map((h) =>
            h.id === handoverId
              ? {
                  ...h,
                  returnedAssetIds,
                  status: complete ? "CLOSED" : overdue === "OVERDUE" ? "OVERDUE" : "PARTIAL",
                }
              : h
          ),
        });
        return { ok: true, message: complete ? "CLOSED" : "PARTIAL_RETURN" };
      },

      importFreightStatement: (csv, fileName) => {
        const state = get();
        // Idempotent by fileName + content hash-ish
        const existing = state.statements.find((s) => s.fileName === fileName);
        if (existing) {
          return {
            ok: false,
            message: "DUPLICATE_IMPORT",
            statementId: existing.id,
          };
        }
        const lines = parseFreightCsv(csv);
        if (lines.length === 0) return { ok: false, message: "EMPTY_FILE" };
        const id = uid("stmt");
        set({
          statements: [
            {
              id,
              number: `FRT-${Date.now().toString().slice(-6)}`,
              carrierId: "car_fastlane",
              status: "IMPORTED",
              currency: "USD",
              importedAt: new Date().toISOString(),
              fileName,
              lines: lines.map((l) => ({ ...l, id: uid("stl") })),
            },
            ...state.statements,
          ],
        });
        return { ok: true, message: "IMPORTED", statementId: id };
      },

      runMatch: (statementId) => {
        const state = get();
        const matches = matchStatement(state, statementId);
        const hasDispute = matches.some(
          (m) => m.status === "VARIANCE" || m.status === "UNMATCHED"
        );
        set({
          matches: [
            ...matches,
            ...state.matches.filter((m) => m.statementId !== statementId),
          ],
          statements: state.statements.map((s) =>
            s.id === statementId
              ? {
                  ...s,
                  status: hasDispute ? "DISPUTE" : "PENDING_APPROVAL",
                }
              : s
          ),
        });
        return { ok: true, message: "MATCHED" };
      },

      resolveDispute: (matchId, resolution, acceptVendor) => {
        const state = get();
        set({
          matches: state.matches.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  status: acceptVendor ? "ACCEPTED" : "DISPUTED",
                  resolution,
                  approved: false,
                }
              : m
          ),
        });
        return { ok: true, message: "RESOLVED" };
      },

      approveSettlements: (statementId) => {
        const state = get();
        const rows = state.matches.filter((m) => m.statementId === statementId);
        const approvable = rows.filter(
          (m) => m.status === "MATCHED" || m.status === "ACCEPTED"
        );
        set({
          matches: state.matches.map((m) =>
            m.statementId === statementId &&
            (m.status === "MATCHED" || m.status === "ACCEPTED")
              ? { ...m, status: "SETTLED", approved: true }
              : m
          ),
          statements: state.statements.map((s) =>
            s.id === statementId
              ? {
                  ...s,
                  status:
                    approvable.length === rows.length ? "CONFIRMED" : "DISPUTE",
                }
              : s
          ),
          chargeEvents: state.chargeEvents.map((c) => {
            const m = approvable.find((x) => x.chargeEventId === c.id);
            return m ? { ...c, matchedQty: 1 } : c;
          }),
        });
        return { ok: true, message: "APPROVED" };
      },
    }),
    {
      name: "wms-demo-v1",
      version: 1,
    }
  )
);

export function useCurrentRole(): Role {
  return useWmsStore((s) => {
    const u = s.users.find((x) => x.id === s.currentUserId);
    return u?.role ?? "admin";
  });
}

export function visibleByOwner<T extends { ownerId: string }>(
  items: T[],
  state: Pick<AppState, "users" | "currentUserId">
): T[] {
  const u = state.users.find((x) => x.id === state.currentUserId);
  if (!u) return [];
  return items.filter((i) => u.ownerIds.includes(i.ownerId));
}

export type CreationModeLabel = CreationMode;
