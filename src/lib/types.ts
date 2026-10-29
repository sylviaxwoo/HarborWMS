export type Locale = "zh-CN" | "en-US" | "es-US";
export type Role =
  | "admin"
  | "warehouse_manager"
  | "receiver"
  | "picker"
  | "shipper"
  | "dispatcher"
  | "driver"
  | "asset_manager"
  | "finance"
  | "owner_readonly";

export type CreationMode = "SYSTEM_SYNC" | "MANUAL" | "FILE_IMPORT";
export type SourceSystem = "ERP" | "OMS" | "WMS";
export type QualityStatus = "GOOD" | "HOLD" | "DAMAGED" | "QC";
export type LocationType =
  | "recv_stage"
  | "qc"
  | "storage"
  | "pick"
  | "pack"
  | "ship_stage"
  | "damaged"
  | "returns";

export type InboundStatus =
  | "DRAFT"
  | "AWAITING_RECEIPT"
  | "RECEIVING"
  | "AWAITING_PUTAWAY"
  | "PUTTING_AWAY"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export type OutboundStatus =
  | "DRAFT"
  | "AWAITING_ALLOCATION"
  | "ALLOCATED"
  | "PICKING"
  | "AWAITING_PACK"
  | "AWAITING_SHIP"
  | "PARTIAL_SHIPPED"
  | "SHIPPED"
  | "CLOSED"
  | "CANCELLED";

export type TripStatus =
  | "PENDING_DISPATCH"
  | "DISPATCHED"
  | "AWAITING_LOAD"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED"
  | "FAILED"
  | "PARTIAL_POD";

export type AssetStatus =
  | "REGISTERED"
  | "AVAILABLE"
  | "ISSUED"
  | "PENDING_RETURN"
  | "RECOVERED"
  | "CLEANING"
  | "REPAIR"
  | "LOST"
  | "SCRAPPED";

export type StatementStatus =
  | "DRAFT"
  | "IMPORTED"
  | "RECONCILING"
  | "DISPUTE"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "EXPORTED";

export type MatchStatus = "MATCHED" | "VARIANCE" | "UNMATCHED" | "DISPUTED" | "ACCEPTED" | "SETTLED";

export interface LocalizedName {
  "zh-CN": string;
  "en-US": string;
  "es-US": string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: LocalizedName;
  timezone: string;
  state: string;
  city: string;
  address: string;
  cutoffLocal: string;
  active: boolean;
}

export interface Owner {
  id: string;
  code: string;
  name: LocalizedName;
}

export interface Sku {
  id: string;
  ownerId: string;
  sku: string;
  barcode: string;
  name: LocalizedName;
  uom: string;
  weightLb: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  lotTracked: boolean;
  serialTracked: boolean;
}

export interface Location {
  id: string;
  warehouseId: string;
  code: string;
  type: LocationType;
  aisle: string;
  rack: string;
  level: string;
  bin: string;
  capacityUnits: number;
  active: boolean;
  allocatable: boolean;
}

export interface StockBalance {
  id: string;
  ownerId: string;
  warehouseId: string;
  locationId: string;
  skuId: string;
  lot?: string;
  quality: QualityStatus;
  onHand: number;
  reserved: number;
}

export interface StockMovement {
  id: string;
  at: string;
  warehouseId: string;
  ownerId: string;
  skuId: string;
  fromLocationId?: string;
  toLocationId?: string;
  qtyBefore: number;
  qtyDelta: number;
  qtyAfter: number;
  quality: QualityStatus;
  lot?: string;
  docType: string;
  docId: string;
  taskId?: string;
  actor: string;
  reason: string;
  txnId: string;
}

export interface InboundLine {
  id: string;
  skuId: string;
  expectedQty: number;
  receivedQty: number;
  putawayQty: number;
  closedShortQty: number;
  lot?: string;
}

export interface InboundOrder {
  id: string;
  number: string;
  type: "PO" | "TRANSFER_IN" | "RETURN" | "OTHER";
  status: InboundStatus;
  warehouseId: string;
  ownerId: string;
  creationMode: CreationMode;
  sourceSystem: SourceSystem;
  upstreamType?: string;
  upstreamNumber?: string;
  externalVersion?: number;
  syncStatus: "NONE" | "SUCCESS" | "FAILED" | "RETRY";
  lastSyncAt?: string;
  createdBy: string;
  createdAt: string;
  expectedAt: string;
  reason?: string;
  lines: InboundLine[];
  audit: AuditEntry[];
}

export interface PutawayTask {
  id: string;
  inboundId: string;
  warehouseId: string;
  skuId: string;
  qty: number;
  fromLocationId: string;
  toLocationId: string;
  status: "OPEN" | "DONE" | "CANCELLED";
  lot?: string;
}

export interface OutboundLine {
  id: string;
  skuId: string;
  requestedQty: number;
  allocatedQty: number;
  pickedQty: number;
  shippedQty: number;
  cancelledQty: number;
}

export interface OutboundOrder {
  id: string;
  number: string;
  type: "SALES" | "TRANSFER_OUT" | "VENDOR_RETURN" | "OTHER";
  status: OutboundStatus;
  warehouseId: string;
  ownerId: string;
  creationMode: CreationMode;
  sourceSystem: SourceSystem;
  upstreamType?: string;
  upstreamNumber?: string;
  parentId?: string;
  splitReason?: string;
  allowSplit: boolean;
  shipTo: string;
  shipState: string;
  promisedAt: string;
  createdBy: string;
  createdAt: string;
  lines: OutboundLine[];
  audit: AuditEntry[];
}

export interface Reservation {
  id: string;
  outboundId: string;
  stockId: string;
  skuId: string;
  warehouseId: string;
  locationId: string;
  qty: number;
  status: "ACTIVE" | "PICKED" | "SHIPPED" | "RELEASED";
  lot?: string;
}

export interface PickTask {
  id: string;
  outboundId: string;
  reservationId: string;
  warehouseId: string;
  skuId: string;
  fromLocationId: string;
  toLocationId: string;
  qty: number;
  pickedQty: number;
  status: "OPEN" | "DONE" | "SHORT" | "CANCELLED";
  lot?: string;
}

export interface Package {
  id: string;
  outboundId: string;
  warehouseId: string;
  trackingNumber: string;
  weightLb: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  status: "PACKED" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED";
  carrierId?: string;
  tripId?: string;
  lines: { skuId: string; qty: number }[];
}

export interface Vehicle {
  id: string;
  code: string;
  plate: string;
  type: string;
  capacityLb: number;
  status: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE";
  insuranceExpires: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  regions: string[];
  status: "AVAILABLE" | "ASSIGNED" | "OFF";
  licenseExpires: string;
}

export interface Carrier {
  id: string;
  code: string;
  name: string;
  billingCycle: string;
}

export interface Trip {
  id: string;
  number: string;
  status: TripStatus;
  warehouseId: string;
  vehicleId?: string;
  driverId?: string;
  packageIds: string[];
  origin: string;
  destination: string;
  scheduledAt: string;
  departedAt?: string;
  deliveredAt?: string;
  podName?: string;
  notes?: string;
  assetHandoverIds: string[];
  timeline: { at: string; label: string; simulated?: boolean }[];
  audit: AuditEntry[];
}

export interface ReturnableAsset {
  id: string;
  code: string;
  type: "TOTE" | "PALLET" | "INSULATED";
  ownerEntity: string;
  holder: string;
  locationLabel: string;
  status: AssetStatus;
  dueAt?: string;
  warehouseId?: string;
}

export interface AssetHandover {
  id: string;
  tripId?: string;
  outboundId?: string;
  assetIds: string[];
  issuedTo: string;
  issuedAt: string;
  dueAt: string;
  returnedAssetIds: string[];
  status: "OPEN" | "PARTIAL" | "CLOSED" | "OVERDUE";
}

export interface RateContract {
  id: string;
  carrierId: string;
  version: string;
  currency: "USD";
  dimDivisor: number;
  zones: Record<string, number>;
  fuelSurchargePct: number;
  effectiveFrom: string;
}

export interface ChargeEvent {
  id: string;
  category: "FREIGHT" | "STORAGE" | "RENT" | "FLEET";
  packageId?: string;
  tripId?: string;
  warehouseId?: string;
  ownerId?: string;
  currency: "USD";
  amountCents: number;
  billableWeightLb: number;
  zone: string;
  inputs: Record<string, string | number>;
  createdAt: string;
  matchedQty: number;
}

export interface StatementLine {
  id: string;
  trackingOrKey: string;
  service: string;
  amountCents: number;
  qty: number;
  raw: string;
}

export interface Statement {
  id: string;
  number: string;
  carrierId: string;
  status: StatementStatus;
  currency: "USD";
  importedAt: string;
  fileName: string;
  lines: StatementLine[];
}

export interface MatchRecord {
  id: string;
  statementId: string;
  statementLineId: string;
  chargeEventId?: string;
  status: MatchStatus;
  expectedCents: number;
  billedCents: number;
  varianceCents: number;
  reason?: string;
  resolution?: string;
  approved?: boolean;
}

export interface IntegrationEvent {
  id: string;
  direction: "IN" | "OUT";
  type: string;
  sourceSystem: SourceSystem;
  idempotencyKey: string;
  payloadSummary: string;
  status: "SUCCESS" | "FAILED" | "RETRY" | "DEAD";
  retries: number;
  relatedDocId?: string;
  createdAt: string;
  lastError?: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  warehouseIds: string[];
  ownerIds: string[];
}

export interface AppState {
  version: number;
  locale: Locale;
  currentUserId: string;
  users: DemoUser[];
  warehouses: Warehouse[];
  owners: Owner[];
  skus: Sku[];
  locations: Location[];
  stock: StockBalance[];
  movements: StockMovement[];
  inbounds: InboundOrder[];
  putawayTasks: PutawayTask[];
  outbounds: OutboundOrder[];
  reservations: Reservation[];
  pickTasks: PickTask[];
  packages: Package[];
  vehicles: Vehicle[];
  drivers: Driver[];
  carriers: Carrier[];
  trips: Trip[];
  assets: ReturnableAsset[];
  handovers: AssetHandover[];
  contracts: RateContract[];
  chargeEvents: ChargeEvent[];
  statements: Statement[];
  matches: MatchRecord[];
  integrationEvents: IntegrationEvent[];
}
