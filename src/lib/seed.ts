import type {
  AppState,
  Location,
  LocationType,
  RateContract,
  ReturnableAsset,
  Sku,
  StockBalance,
} from "./types";

const TENANT = "demo";

function loc(
  warehouseId: string,
  code: string,
  type: LocationType,
  aisle: string,
  rack: string,
  level: string,
  bin: string,
  capacity: number,
  allocatable: boolean
): Location {
  return {
    id: `loc_${warehouseId}_${code}`,
    warehouseId,
    code,
    type,
    aisle,
    rack,
    level,
    bin,
    capacityUnits: capacity,
    active: true,
    allocatable,
  };
}

function buildLocations(warehouseId: string): Location[] {
  const types: Array<[string, LocationType, boolean, number]> = [
    ["RECV-01", "recv_stage", false, 500],
    ["QC-01", "qc", false, 100],
    ["DMG-01", "damaged", false, 100],
    ["RET-01", "returns", false, 100],
    ["ST-A-01-01", "storage", true, 200],
    ["ST-A-01-02", "storage", true, 200],
    ["ST-A-02-01", "storage", true, 200],
    ["ST-B-01-01", "storage", true, 200],
    ["PK-01", "pick", true, 150],
    ["PK-02", "pick", true, 150],
    ["PACK-01", "pack", false, 100],
    ["SHIP-01", "ship_stage", false, 200],
  ];
  return types.map(([code, type, allocatable, cap], i) =>
    loc(
      warehouseId,
      code,
      type,
      String.fromCharCode(65 + (i % 3)),
      String((i % 4) + 1).padStart(2, "0"),
      "1",
      String((i % 5) + 1).padStart(2, "0"),
      cap,
      allocatable
    )
  );
}

function sku(
  id: string,
  ownerId: string,
  code: string,
  zh: string,
  en: string,
  es: string,
  weight: number,
  lot = false
): Sku {
  return {
    id,
    ownerId,
    sku: code,
    barcode: `BC${code}`,
    name: { "zh-CN": zh, "en-US": en, "es-US": es },
    uom: "EA",
    weightLb: weight,
    lengthIn: 10,
    widthIn: 8,
    heightIn: 6,
    lotTracked: lot,
    serialTracked: false,
  };
}

export function createSeedState(): AppState {
  const warehouses = [
    {
      id: "wh_nj",
      code: "NJ-01",
      name: {
        "zh-CN": "新泽西一号仓",
        "en-US": "New Jersey DC",
        "es-US": "CD Nueva Jersey",
      },
      timezone: "America/New_York",
      state: "NJ",
      city: "Edison",
      address: "100 Logistics Way, Edison, NJ 08817",
      cutoffLocal: "15:00",
      active: true,
    },
    {
      id: "wh_ca",
      code: "CA-01",
      name: {
        "zh-CN": "加州一号仓",
        "en-US": "California DC",
        "es-US": "CD California",
      },
      timezone: "America/Los_Angeles",
      state: "CA",
      city: "Ontario",
      address: "2200 Inland Empire Blvd, Ontario, CA 91761",
      cutoffLocal: "14:00",
      active: true,
    },
    {
      id: "wh_tx",
      code: "TX-01",
      name: {
        "zh-CN": "德州一号仓",
        "en-US": "Texas DC",
        "es-US": "CD Texas",
      },
      timezone: "America/Chicago",
      state: "TX",
      city: "Dallas",
      address: "4800 Great Southwest Pkwy, Dallas, TX 75236",
      cutoffLocal: "15:30",
      active: true,
    },
  ];

  const owners = [
    {
      id: "own_aurora",
      code: "AURORA",
      name: {
        "zh-CN": "极光家居",
        "en-US": "Aurora Home",
        "es-US": "Aurora Hogar",
      },
    },
    {
      id: "own_northwind",
      code: "NORTHWIND",
      name: {
        "zh-CN": "北风运动",
        "en-US": "Northwind Sports",
        "es-US": "Northwind Deportes",
      },
    },
  ];

  const skus: Sku[] = [
    sku("sku_01", "own_aurora", "AUR-TOWEL-S", "纯棉毛巾 S", "Cotton Towel S", "Toalla de algodón S", 1.2),
    sku("sku_02", "own_aurora", "AUR-TOWEL-L", "纯棉毛巾 L", "Cotton Towel L", "Toalla de algodón L", 1.8),
    sku("sku_03", "own_aurora", "AUR-SHEET-Q", "床品四件套 Q", "Sheet Set Queen", "Juego de sábanas Queen", 4.5, true),
    sku("sku_04", "own_aurora", "AUR-PILLOW", "记忆枕", "Memory Pillow", "Almohada viscoelástica", 2.1),
    sku("sku_05", "own_aurora", "AUR-CANDLE", "香氛蜡烛", "Scented Candle", "Vela aromática", 1.0),
    sku("sku_06", "own_aurora", "AUR-LAMP", "台灯", "Desk Lamp", "Lámpara de escritorio", 3.4),
    sku("sku_07", "own_aurora", "AUR-RUG-S", "小地毯", "Small Rug", "Alfombra pequeña", 5.2),
    sku("sku_08", "own_aurora", "AUR-MUG", "陶瓷马克杯", "Ceramic Mug", "Taza de cerámica", 0.9),
    sku("sku_09", "own_aurora", "AUR-FRAME", "相框", "Photo Frame", "Marco de fotos", 1.5),
    sku("sku_10", "own_aurora", "AUR-DIFFUSER", "香薰机", "Diffuser", "Difusor", 2.0),
    sku("sku_11", "own_northwind", "NW-YOGA-MAT", "瑜伽垫", "Yoga Mat", "Mat de yoga", 2.8),
    sku("sku_12", "own_northwind", "NW-BOTTLE", "运动水杯", "Sports Bottle", "Botella deportiva", 0.8),
    sku("sku_13", "own_northwind", "NW-DUMBBELL-10", "哑铃 10lb", "Dumbbell 10lb", "Mancuerna 10lb", 10),
    sku("sku_14", "own_northwind", "NW-BAND", "阻力带", "Resistance Band", "Banda de resistencia", 0.6),
    sku("sku_15", "own_northwind", "NW-JERSEY-M", "球衣 M", "Jersey M", "Camiseta M", 0.7),
    sku("sku_16", "own_northwind", "NW-SHOES-42", "跑鞋 42", "Running Shoes 42", "Zapatillas 42", 1.9, true),
    sku("sku_17", "own_northwind", "NW-CAP", "运动帽", "Sports Cap", "Gorra deportiva", 0.4),
    sku("sku_18", "own_northwind", "NW-BAG", "运动包", "Gym Bag", "Bolsa de gym", 1.6),
    sku("sku_19", "own_northwind", "NW-GLOVES", "训练手套", "Training Gloves", "Guantes de entrenamiento", 0.5),
    sku("sku_20", "own_northwind", "NW-SKIP", "跳绳", "Jump Rope", "Cuerda para saltar", 0.7),
  ];

  const locations = warehouses.flatMap((w) => buildLocations(w.id));

  const stock: StockBalance[] = [];
  const pushStock = (
    warehouseId: string,
    locationCode: string,
    skuId: string,
    ownerId: string,
    onHand: number,
    reserved = 0,
    lot?: string
  ) => {
    const location = locations.find(
      (l) => l.warehouseId === warehouseId && l.code === locationCode
    )!;
    stock.push({
      id: `stk_${warehouseId}_${locationCode}_${skuId}_${lot ?? "NA"}`,
      ownerId,
      warehouseId,
      locationId: location.id,
      skuId,
      lot,
      quality: "GOOD",
      onHand,
      reserved,
    });
  };

  // NJ inventory — intentionally tight on some SKUs for split demo
  pushStock("wh_nj", "PK-01", "sku_01", "own_aurora", 40);
  pushStock("wh_nj", "ST-A-01-01", "sku_01", "own_aurora", 60);
  pushStock("wh_nj", "PK-01", "sku_02", "own_aurora", 25);
  pushStock("wh_nj", "ST-A-01-02", "sku_03", "own_aurora", 18, 0, "LOT-NJ-03");
  pushStock("wh_nj", "PK-02", "sku_11", "own_northwind", 30);
  pushStock("wh_nj", "ST-B-01-01", "sku_12", "own_northwind", 80);
  pushStock("wh_nj", "PK-01", "sku_13", "own_northwind", 12); // scarce for contention
  pushStock("wh_nj", "ST-A-02-01", "sku_16", "own_northwind", 20, 0, "LOT-SH-42");

  pushStock("wh_ca", "PK-01", "sku_01", "own_aurora", 120);
  pushStock("wh_ca", "ST-A-01-01", "sku_02", "own_aurora", 90);
  pushStock("wh_ca", "PK-02", "sku_11", "own_northwind", 70);
  pushStock("wh_ca", "ST-B-01-01", "sku_13", "own_northwind", 55);
  pushStock("wh_ca", "PK-01", "sku_15", "own_northwind", 40);

  pushStock("wh_tx", "PK-01", "sku_01", "own_aurora", 50);
  pushStock("wh_tx", "ST-A-01-01", "sku_05", "own_aurora", 100);
  pushStock("wh_tx", "PK-02", "sku_12", "own_northwind", 60);
  pushStock("wh_tx", "ST-B-01-01", "sku_18", "own_northwind", 35);

  const now = new Date("2026-10-29T14:00:00.000Z");
  const iso = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();

  const inbounds = [
    {
      id: "inb_po_100",
      number: "INB-2026-0100",
      type: "PO" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_nj",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "PO",
      upstreamNumber: "PO-ERP-8891",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      lastSyncAt: iso(-2),
      createdBy: "erp.sync",
      createdAt: iso(-2),
      expectedAt: iso(6),
      lines: [
        {
          id: "inbl_100_1",
          skuId: "sku_01",
          expectedQty: 100,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
        {
          id: "inbl_100_2",
          skuId: "sku_04",
          expectedQty: 40,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [
        {
          at: iso(-2),
          actor: "erp.sync",
          action: "SYNCED",
          detail: "inbound.created PO-ERP-8891",
        },
      ],
    },
    {
      id: "inb_manual_101",
      number: "INB-2026-0101",
      type: "OTHER" as const,
      status: "DRAFT" as const,
      warehouseId: "wh_nj",
      ownerId: "own_northwind",
      creationMode: "MANUAL" as const,
      sourceSystem: "WMS" as const,
      syncStatus: "NONE" as const,
      createdBy: "Alex Manager",
      createdAt: iso(-1),
      expectedAt: iso(8),
      reason: "Found inventory after cycle count staging",
      lines: [
        {
          id: "inbl_101_1",
          skuId: "sku_14",
          expectedQty: 20,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [
        {
          at: iso(-1),
          actor: "Alex Manager",
          action: "CREATED",
          detail: "Manual other inbound draft",
        },
      ],
    },
    {
      id: "inb_po_102",
      number: "INB-2026-0102",
      type: "PO" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_ca",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "PO",
      upstreamNumber: "PO-ERP-9002",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      lastSyncAt: iso(-5),
      createdBy: "erp.sync",
      createdAt: iso(-5),
      expectedAt: iso(12),
      lines: [
        {
          id: "inbl_102_1",
          skuId: "sku_06",
          expectedQty: 30,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_103",
      number: "INB-2026-0103",
      type: "TRANSFER_IN" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_tx",
      ownerId: "own_northwind",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "TO",
      upstreamNumber: "TO-ERP-441",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      createdBy: "erp.sync",
      createdAt: iso(-8),
      expectedAt: iso(20),
      lines: [
        {
          id: "inbl_103_1",
          skuId: "sku_18",
          expectedQty: 15,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_104",
      number: "INB-2026-0104",
      type: "PO" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_nj",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "PO",
      upstreamNumber: "PO-ERP-9100",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      createdBy: "erp.sync",
      createdAt: iso(-10),
      expectedAt: iso(30),
      lines: [
        {
          id: "inbl_104_1",
          skuId: "sku_05",
          expectedQty: 50,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_105",
      number: "INB-2026-0105",
      type: "RETURN" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_ca",
      ownerId: "own_northwind",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "OMS" as const,
      upstreamType: "RMA",
      upstreamNumber: "RMA-2201",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      createdBy: "oms.sync",
      createdAt: iso(-12),
      expectedAt: iso(40),
      lines: [
        {
          id: "inbl_105_1",
          skuId: "sku_15",
          expectedQty: 5,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_106",
      number: "INB-2026-0106",
      type: "PO" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_tx",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "PO",
      upstreamNumber: "PO-ERP-9111",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      createdBy: "erp.sync",
      createdAt: iso(-14),
      expectedAt: iso(48),
      lines: [
        {
          id: "inbl_106_1",
          skuId: "sku_08",
          expectedQty: 80,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_107",
      number: "INB-2026-0107",
      type: "PO" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_nj",
      ownerId: "own_northwind",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "PO",
      upstreamNumber: "PO-ERP-9120",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      createdBy: "erp.sync",
      createdAt: iso(-16),
      expectedAt: iso(50),
      lines: [
        {
          id: "inbl_107_1",
          skuId: "sku_19",
          expectedQty: 60,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_108",
      number: "INB-2026-0108",
      type: "PO" as const,
      status: "AWAITING_RECEIPT" as const,
      warehouseId: "wh_ca",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "ERP" as const,
      upstreamType: "PO",
      upstreamNumber: "PO-ERP-9130",
      externalVersion: 1,
      syncStatus: "SUCCESS" as const,
      createdBy: "erp.sync",
      createdAt: iso(-18),
      expectedAt: iso(60),
      lines: [
        {
          id: "inbl_108_1",
          skuId: "sku_07",
          expectedQty: 12,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "inb_po_109",
      number: "INB-2026-0109",
      type: "OTHER" as const,
      status: "DRAFT" as const,
      warehouseId: "wh_tx",
      ownerId: "own_northwind",
      creationMode: "MANUAL" as const,
      sourceSystem: "WMS" as const,
      syncStatus: "NONE" as const,
      createdBy: "Sam Receiver",
      createdAt: iso(-3),
      expectedAt: iso(10),
      reason: "Vendor sample intake",
      lines: [
        {
          id: "inbl_109_1",
          skuId: "sku_20",
          expectedQty: 10,
          receivedQty: 0,
          putawayQty: 0,
          closedShortQty: 0,
        },
      ],
      audit: [],
    },
  ];

  const outbounds = [
    {
      id: "out_200",
      number: "OUT-2026-0200",
      type: "SALES" as const,
      status: "AWAITING_ALLOCATION" as const,
      warehouseId: "wh_nj",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "OMS" as const,
      upstreamType: "SO",
      upstreamNumber: "SO-OMS-5001",
      allowSplit: true,
      shipTo: "12 Market St, New York, NY 10002",
      shipState: "NY",
      promisedAt: iso(24),
      createdBy: "oms.sync",
      createdAt: iso(-4),
      lines: [
        {
          id: "outl_200_1",
          skuId: "sku_01",
          requestedQty: 15,
          allocatedQty: 0,
          pickedQty: 0,
          shippedQty: 0,
          cancelledQty: 0,
        },
      ],
      audit: [
        {
          at: iso(-4),
          actor: "oms.sync",
          action: "SYNCED",
          detail: "outbound.created SO-OMS-5001",
        },
      ],
    },
    {
      id: "out_201",
      number: "OUT-2026-0201",
      type: "SALES" as const,
      status: "AWAITING_ALLOCATION" as const,
      warehouseId: "wh_nj",
      ownerId: "own_northwind",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "OMS" as const,
      upstreamType: "SO",
      upstreamNumber: "SO-OMS-5002",
      allowSplit: false,
      shipTo: "88 Broad St, Newark, NJ 07102",
      shipState: "NJ",
      promisedAt: iso(18),
      createdBy: "oms.sync",
      createdAt: iso(-3),
      lines: [
        {
          id: "outl_201_1",
          skuId: "sku_13",
          requestedQty: 10,
          allocatedQty: 0,
          pickedQty: 0,
          shippedQty: 0,
          cancelledQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "out_202",
      number: "OUT-2026-0202",
      type: "SALES" as const,
      status: "AWAITING_ALLOCATION" as const,
      warehouseId: "wh_nj",
      ownerId: "own_northwind",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "OMS" as const,
      upstreamType: "SO",
      upstreamNumber: "SO-OMS-5003",
      allowSplit: false,
      shipTo: "401 Hudson Ave, Hoboken, NJ 07030",
      shipState: "NJ",
      promisedAt: iso(18),
      createdBy: "oms.sync",
      createdAt: iso(-3),
      lines: [
        {
          id: "outl_202_1",
          skuId: "sku_13",
          requestedQty: 8,
          allocatedQty: 0,
          pickedQty: 0,
          shippedQty: 0,
          cancelledQty: 0,
        },
      ],
      audit: [],
    },
    {
      id: "out_203",
      number: "OUT-2026-0203",
      type: "SALES" as const,
      status: "AWAITING_ALLOCATION" as const,
      warehouseId: "wh_nj",
      ownerId: "own_aurora",
      creationMode: "SYSTEM_SYNC" as const,
      sourceSystem: "OMS" as const,
      upstreamType: "SO",
      upstreamNumber: "SO-OMS-5100",
      allowSplit: true,
      shipTo: "900 Mission St, San Francisco, CA 94103",
      shipState: "CA",
      promisedAt: iso(36),
      createdBy: "oms.sync",
      createdAt: iso(-2),
      lines: [
        {
          id: "outl_203_1",
          skuId: "sku_02",
          requestedQty: 80,
          allocatedQty: 0,
          pickedQty: 0,
          shippedQty: 0,
          cancelledQty: 0,
        },
      ],
      audit: [],
    },
  ];

  // Fill remaining outbounds to reach ~20
  for (let i = 4; i < 20; i++) {
    const wh = i % 3 === 0 ? "wh_ca" : i % 3 === 1 ? "wh_tx" : "wh_nj";
    const owner = i % 2 === 0 ? "own_aurora" : "own_northwind";
    const skuId =
      owner === "own_aurora"
        ? `sku_0${(i % 9) + 1}`
        : `sku_${11 + (i % 10)}`;
    outbounds.push({
      id: `out_${200 + i}`,
      number: `OUT-2026-0${200 + i}`,
      type: "SALES",
      status: "AWAITING_ALLOCATION",
      warehouseId: wh,
      ownerId: owner,
      creationMode: "SYSTEM_SYNC",
      sourceSystem: "OMS",
      upstreamType: "SO",
      upstreamNumber: `SO-OMS-${5200 + i}`,
      allowSplit: true,
      shipTo: `Demo Address ${i}, USA`,
      shipState: wh === "wh_ca" ? "CA" : wh === "wh_tx" ? "TX" : "NJ",
      promisedAt: iso(24 + i),
      createdBy: "oms.sync",
      createdAt: iso(-i),
      lines: [
        {
          id: `outl_${200 + i}_1`,
          skuId,
          requestedQty: 2 + (i % 5),
          allocatedQty: 0,
          pickedQty: 0,
          shippedQty: 0,
          cancelledQty: 0,
        },
      ],
      audit: [],
    });
  }

  const carriers = [
    {
      id: "car_fastlane",
      code: "FASTLANE",
      name: "FastLane Parcel",
      billingCycle: "WEEKLY",
    },
    {
      id: "car_redoak",
      code: "REDOAK",
      name: "RedOak Freight",
      billingCycle: "MONTHLY",
    },
  ];

  const contracts: RateContract[] = [
    {
      id: "ctr_fastlane_v1",
      carrierId: "car_fastlane",
      version: "v2026.1",
      currency: "USD",
      dimDivisor: 139,
      zones: { NJ: 8, NY: 9, PA: 10, CA: 14, TX: 12, DEFAULT: 15 } as Record<
        string,
        number
      >,
      fuelSurchargePct: 12,
      effectiveFrom: "2026-01-01",
    },
    {
      id: "ctr_redoak_v1",
      carrierId: "car_redoak",
      version: "v2026.1",
      currency: "USD",
      dimDivisor: 166,
      zones: { NJ: 18, NY: 20, CA: 28, TX: 22, DEFAULT: 30 } as Record<
        string,
        number
      >,
      fuelSurchargePct: 8,
      effectiveFrom: "2026-01-01",
    },
  ];

  const vehicles = [
    {
      id: "veh_01",
      code: "V-100",
      plate: "NJ-WMS-01",
      type: "Box Truck",
      capacityLb: 8000,
      status: "AVAILABLE" as const,
      insuranceExpires: "2027-03-01",
    },
    {
      id: "veh_02",
      code: "V-200",
      plate: "NJ-WMS-02",
      type: "Van",
      capacityLb: 3000,
      status: "AVAILABLE" as const,
      insuranceExpires: "2027-01-15",
    },
    {
      id: "veh_03",
      code: "V-300",
      plate: "CA-WMS-01",
      type: "Box Truck",
      capacityLb: 8000,
      status: "MAINTENANCE" as const,
      insuranceExpires: "2026-12-01",
    },
  ];

  const drivers = [
    {
      id: "drv_01",
      name: "Jordan Lee",
      phone: "+1-201-555-0101",
      regions: ["NJ", "NY", "PA"],
      status: "AVAILABLE" as const,
      licenseExpires: "2028-06-01",
    },
    {
      id: "drv_02",
      name: "Maria Santos",
      phone: "+1-973-555-0144",
      regions: ["NJ", "NY"],
      status: "AVAILABLE" as const,
      licenseExpires: "2027-11-20",
    },
    {
      id: "drv_03",
      name: "Chris Nguyen",
      phone: "+1-626-555-0199",
      regions: ["CA"],
      status: "OFF" as const,
      licenseExpires: "2027-04-10",
    },
  ];

  const assets: ReturnableAsset[] = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return {
      id: `asset_${String(n).padStart(3, "0")}`,
      code: `TOTE-${String(n).padStart(4, "0")}`,
      type: "TOTE" as const,
      ownerEntity: "WMS Demo Fleet",
      holder: "WAREHOUSE",
      locationLabel: n <= 20 ? "NJ-01 / RECV-01" : n <= 25 ? "CA-01" : "TX-01",
      status: "AVAILABLE" as const,
      warehouseId: n <= 20 ? "wh_nj" : n <= 25 ? "wh_ca" : "wh_tx",
    };
  });

  const users = [
    {
      id: "user_admin",
      name: "Taylor Admin",
      role: "admin" as const,
      warehouseIds: ["wh_nj", "wh_ca", "wh_tx"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_mgr",
      name: "Alex Manager",
      role: "warehouse_manager" as const,
      warehouseIds: ["wh_nj"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_recv",
      name: "Sam Receiver",
      role: "receiver" as const,
      warehouseIds: ["wh_nj"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_pick",
      name: "Pat Picker",
      role: "picker" as const,
      warehouseIds: ["wh_nj"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_ship",
      name: "Riley Shipper",
      role: "shipper" as const,
      warehouseIds: ["wh_nj"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_disp",
      name: "Dana Dispatcher",
      role: "dispatcher" as const,
      warehouseIds: ["wh_nj", "wh_ca", "wh_tx"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_drv",
      name: "Jordan Lee",
      role: "driver" as const,
      warehouseIds: ["wh_nj"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_asset",
      name: "Casey Assets",
      role: "asset_manager" as const,
      warehouseIds: ["wh_nj", "wh_ca", "wh_tx"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_fin",
      name: "Morgan Finance",
      role: "finance" as const,
      warehouseIds: ["wh_nj", "wh_ca", "wh_tx"],
      ownerIds: ["own_aurora", "own_northwind"],
    },
    {
      id: "user_owner",
      name: "Aurora ReadOnly",
      role: "owner_readonly" as const,
      warehouseIds: ["wh_nj", "wh_ca", "wh_tx"],
      ownerIds: ["own_aurora"],
    },
  ];

  const statements = [
    {
      id: "stmt_rent_demo",
      number: "RENT-2026-10",
      carrierId: "car_redoak",
      status: "IMPORTED" as const,
      currency: "USD" as const,
      importedAt: iso(-20),
      fileName: "landlord-oct-2026.csv",
      lines: [
        {
          id: "stl_rent_1",
          trackingOrKey: "LEASE-NJ-BASE",
          service: "BASE_RENT",
          amountCents: 800000,
          qty: 1,
          raw: "BASE_RENT,8000.00",
        },
        {
          id: "stl_rent_2",
          trackingOrKey: "LEASE-NJ-CAM",
          service: "CAM",
          amountCents: 30000,
          qty: 1,
          raw: "CAM,300.00",
        },
      ],
    },
  ];

  return {
    version: 1,
    locale: "zh-CN",
    currentUserId: "user_mgr",
    users,
    warehouses,
    owners,
    skus,
    locations,
    stock,
    movements: [],
    inbounds,
    putawayTasks: [],
    outbounds,
    reservations: [],
    pickTasks: [],
    packages: [],
    vehicles,
    drivers,
    carriers,
    trips: [],
    assets,
    handovers: [],
    contracts,
    chargeEvents: [],
    statements,
    matches: [],
    integrationEvents: [
      {
        id: "evt_1",
        direction: "IN",
        type: "inbound.created",
        sourceSystem: "ERP",
        idempotencyKey: `${TENANT}|ERP|PO|PO-ERP-8891`,
        payloadSummary: "PO-ERP-8891 → INB-2026-0100",
        status: "SUCCESS",
        retries: 0,
        relatedDocId: "inb_po_100",
        createdAt: iso(-2),
      },
      {
        id: "evt_2",
        direction: "IN",
        type: "outbound.created",
        sourceSystem: "OMS",
        idempotencyKey: `${TENANT}|OMS|SO|SO-OMS-5001`,
        payloadSummary: "SO-OMS-5001 → OUT-2026-0200",
        status: "SUCCESS",
        retries: 0,
        relatedDocId: "out_200",
        createdAt: iso(-4),
      },
      {
        id: "evt_fail",
        direction: "OUT",
        type: "receipt.confirmed",
        sourceSystem: "ERP",
        idempotencyKey: `${TENANT}|ERP|RCPT|DEMO-FAIL`,
        payloadSummary: "Simulated failed callback",
        status: "FAILED",
        retries: 1,
        createdAt: iso(-6),
        lastError: "Upstream timeout (simulated)",
      },
    ],
  };
}
