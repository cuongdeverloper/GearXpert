export const mockSupplierDevices = [
  /* ===== CAMERA ===== */
  {
    _id: "cam_001",
    supplierId: "sup_001",
    name: "Canon EOS R5",
    description: "Professional mirrorless camera with 8K video recording.",
    category: "CAMERA",

    isAddon: false,
    compatibleWith: [],
    requiredAddons: [],

    images: ["https://dslrdanang.vn/wp-content/uploads/2025/05/eos-r50-6.jpg"],

    rentPrice: {
      perDay: 120,
      perWeek: 750,
      perMonth: 2800,
    },

    depositAmount: 500,

    status: "AVAILABLE",

    location: {
      warehouse: "WH-HCM-01",
      city: "Ho Chi Minh",
    },

    specs: {
      resolution: "45MP",
      video: "8K",
      mount: "RF",
    },

    maintenanceSummary: {
      lastMaintenanceAt: new Date("2025-01-10"),
      nextMaintenanceAt: new Date("2025-04-10"),
      totalMaintenanceCount: 2,
    },

    ratingAvg: 4.8,
    reviewCount: 12,
  },

  {
    _id: "cam_002",
    supplierId: "sup_001",
    name: "Sony A7 IV",
    description: "Full-frame hybrid camera for photo and video.",
    category: "CAMERA",

    isAddon: false,
    compatibleWith: [],
    requiredAddons: [],

    images: ["https://dslrdanang.vn/wp-content/uploads/2025/05/eos-r50-6.jpg"],

    rentPrice: {
      perDay: 110,
      perWeek: 680,
      perMonth: 2500,
    },

    depositAmount: 450,
    status: "RENTED",

    location: {
      warehouse: "WH-HN-01",
      city: "Hanoi",
    },

    specs: {
      resolution: "33MP",
      video: "4K",
      mount: "E",
    },

    maintenanceSummary: {
      lastMaintenanceAt: new Date("2025-02-01"),
      nextMaintenanceAt: new Date("2025-05-01"),
      totalMaintenanceCount: 1,
    },

    ratingAvg: 4.6,
    reviewCount: 9,
  },

  /* ===== AUDIO ===== */
  {
    _id: "aud_001",
    supplierId: "sup_001",
    name: "Sony WH-1000XM5",
    description: "Noise cancelling wireless headphones.",
    category: "AUDIO",

    isAddon: false,
    compatibleWith: [],
    requiredAddons: [],

    images: ["https://dslrdanang.vn/wp-content/uploads/2025/05/eos-r50-6.jpg"],

    rentPrice: {
      perDay: 25,
      perWeek: 150,
      perMonth: 500,
    },

    depositAmount: 100,
    status: "AVAILABLE",

    location: {
      warehouse: "WH-HN-01",
      city: "Hanoi",
    },

    specs: {
      batteryLife: "30h",
      noiseCanceling: true,
    },

    maintenanceSummary: {
      lastMaintenanceAt: new Date("2024-12-20"),
      nextMaintenanceAt: new Date("2025-03-20"),
      totalMaintenanceCount: 1,
    },

    ratingAvg: 4.7,
    reviewCount: 18,
  },

  /* ===== OFFICE ===== */
  {
    _id: "off_001",
    supplierId: "sup_001",
    name: "Dell UltraSharp U2723QE",
    description: "27-inch 4K professional monitor.",
    category: "OFFICE",

    isAddon: false,
    compatibleWith: [],
    requiredAddons: [],

    images: ["https://dslrdanang.vn/wp-content/uploads/2025/05/eos-r50-6.jpg"],

    rentPrice: {
      perDay: 35,
      perWeek: 210,
      perMonth: 720,
    },

    depositAmount: 180,
    status: "AVAILABLE",

    location: {
      warehouse: "WH-HN-02",
      city: "Hanoi",
    },

    specs: {
      size: "27 inch",
      resolution: "4K",
      panel: "IPS Black",
    },

    maintenanceSummary: {
      lastMaintenanceAt: null,
      nextMaintenanceAt: null,
      totalMaintenanceCount: 0,
    },

    ratingAvg: 4.5,
    reviewCount: 6,
  },

  /* ===== GAMING ===== */
  {
    _id: "gam_001",
    supplierId: "sup_001",
    name: "PlayStation 5",
    description: "Next-gen gaming console.",
    category: "GAMING",

    isAddon: false,
    compatibleWith: [],
    requiredAddons: ["acc_003"], // tay cầm phụ

    images: ["https://dslrdanang.vn/wp-content/uploads/2025/05/eos-r50-6.jpg"],

    rentPrice: {
      perDay: 45,
      perWeek: 270,
      perMonth: 900,
    },

    depositAmount: 250,
    status: "AVAILABLE",

    location: {
      warehouse: "WH-HCM-02",
      city: "Ho Chi Minh",
    },

    specs: {
      storage: "825GB",
      resolution: "4K",
    },

    maintenanceSummary: {
      lastMaintenanceAt: new Date("2025-01-05"),
      nextMaintenanceAt: new Date("2025-04-05"),
      totalMaintenanceCount: 2,
    },

    ratingAvg: 4.9,
    reviewCount: 25,
  },

  /* ===== ACCESSORY (ADD-ON) ===== */
  {
    _id: "acc_003",
    supplierId: "sup_001",
    name: "DualSense Wireless Controller",
    description: "Extra controller for PlayStation 5.",
    category: "ACCESSORY",

    isAddon: true,
    compatibleWith: ["gam_001"],
    requiredAddons: [],

    images: ["https://dslrdanang.vn/wp-content/uploads/2025/05/eos-r50-6.jpg"],

    rentPrice: {
      perDay: 8,
      perWeek: 45,
      perMonth: 150,
    },

    depositAmount: 60,
    status: "AVAILABLE",

    location: {
      warehouse: "WH-HCM-02",
      city: "Ho Chi Minh",
    },

    specs: {
      connectivity: "Bluetooth",
    },

    maintenanceSummary: {
      lastMaintenanceAt: null,
      nextMaintenanceAt: null,
      totalMaintenanceCount: 0,
    },

    ratingAvg: 4.4,
    reviewCount: 10,
  },
];
