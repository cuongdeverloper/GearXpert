const Cart = require("../../models/Cart");

const CartItem = require("../../models/CartItem");

const Rental = require("../../models/Rental");
const ExtensionRequest = require("../../models/ExtensionRequest");

const Contract = require("../../models/Contract");

const ContractItem = require("../../models/ContractItem");

const RentalItem = require("../../models/RentalItem");

const Device = require("../../models/Device");

const Voucher = require("../../models/Voucher");
const User = require("../../models/User");

const Wallet = require("../../models/Wallet");

const WalletTransaction = require("../../models/WalletTransaction");

const DeviceItem = require("../../models/DeviceItem");
const CompensationProposal = require("../../models/CompensationProposal");
const { compensationAuditLog } = require("../../utils/compensationAuditLog");
const {
  buildCanonicalPaymentBreakdown,
} = require("../../utils/buildCanonicalPaymentBreakdown");

const DeliveryTask = require("../../models/DeliveryTask");

const mongoose = require("mongoose");

const cloudinary = require("cloudinary").v2;

const ContractFile = require("../../models/ContractFile");

const {
  ensureDraftForDelivery,

  syncCancelledRental,
} = require("../../services/HandoverService");

const {
  ensureDraftForReturn,

  completeReturn,

  listByRental,

  syncClosedRental,
} = require("../../services/ReturnService");

const { PayOS } = require("@payos/node");

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,

  process.env.PAYOS_API_KEY,

  process.env.PAYOS_CHECKSUM_KEY,
);

// Đầu file RentalController.js (hoặc nơi bạn định nghĩa các hàm)

const NotificationConfig = require("../../configs/NotificationConfig"); // điều chỉnh path cho đúng

const {
  emitOperationStaffUpdate,
} = require("../../utils/operationStaffSocket");

const SupplierProfile = require("../../models/SupplierProfile");
const { sendMail } = require("../../configs/sendMail");
const EmailTemplates = require("../../utils/EmailTemplates");

const { HandoverRecord, HANDOVER_STATUS } = require("../../models/HandoverRecord");

const toCompensationProposalDto = (proposal) => {
  if (!proposal) return null;
  return {
    _id: proposal._id,
    proposedBy: proposal.proposedBy,
    amount: proposal.amount ?? 0,
    currency: proposal.currency || "VND",
    reason: proposal.reason || "",
    explanation: proposal.explanation || "",
    suggestedResolution: proposal.suggestedResolution,
    images: Array.isArray(proposal.images) ? proposal.images : [],
    submittedAt: proposal.submittedAt || proposal.createdAt,
    forwardedToCustomerAt: proposal.forwardedToCustomerAt,
    forwardedMessagePreview: proposal.forwardedMessagePreview || "",
    customerDecision: proposal.customerDecision || "PENDING",
    customerDecidedAt: proposal.customerDecidedAt,
    customerDecidedBy: proposal.customerDecidedBy,
    customerDecisionNote: proposal.customerDecisionNote || "",
    supplierDecision: proposal.supplierDecision || "PENDING",
    supplierDecidedAt: proposal.supplierDecidedAt,
    supplierDecidedBy: proposal.supplierDecidedBy,
    supplierDecisionNote: proposal.supplierDecisionNote || "",
    adminDecision: proposal.adminDecision || "PENDING",
    adminDecidedAt: proposal.adminDecidedAt,
    adminDecidedBy: proposal.adminDecidedBy,
    adminDecisionNote: proposal.adminDecisionNote || "",
    approvedCompensationAmount: proposal.approvedCompensationAmount ?? 0,
    flowStatus: proposal.flowStatus || "PROPOSED",
    appliedToDeposit: Boolean(proposal.appliedToDeposit),
    appliedToDepositAt: proposal.appliedToDepositAt,
    deductedFromDepositAmount: proposal.deductedFromDepositAmount ?? 0,
  };
};

const attachLatestCompensationProposal = async ({
  deliveryIssues = [],
  damageReports = [],
}) => {
  const toObjectIdList = (items = []) =>
    items
      .map((item) => item?._id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

  const deliveryIds = toObjectIdList(deliveryIssues);
  const damageIds = toObjectIdList(damageReports);

  const orConditions = [];
  if (deliveryIds.length) {
    orConditions.push({
      referenceModel: "DeliveryIssueReport",
      referenceId: { $in: deliveryIds },
    });
  }
  if (damageIds.length) {
    orConditions.push({
      referenceModel: "DamageReport",
      referenceId: { $in: damageIds },
    });
  }

  const proposalMap = new Map();
  if (orConditions.length) {
    const latestProposals = await CompensationProposal.aggregate([
      { $match: { $or: orConditions } },
      { $sort: { submittedAt: -1, createdAt: -1 } },
      {
        $group: {
          _id: {
            referenceModel: "$referenceModel",
            referenceId: "$referenceId",
          },
          proposal: { $first: "$$ROOT" },
        },
      },
    ]);

    latestProposals.forEach((entry) => {
      const model = entry?._id?.referenceModel;
      const referenceId = entry?._id?.referenceId;
      if (!model || !referenceId) return;
      proposalMap.set(
        `${model}:${String(referenceId)}`,
        toCompensationProposalDto(entry.proposal)
      );
    });
  }

  const mapIssues = (items = [], modelName) =>
    items.map((item) => {
      const proposal = proposalMap.get(`${modelName}:${String(item?._id)}`) || null;
      return { ...item, compensationProposal: proposal };
    });

  return {
    deliveryIssues: mapIssues(deliveryIssues, "DeliveryIssueReport"),
    damageReports: mapIssues(damageReports, "DamageReport"),
  };
};








// Helper function to get client IP

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip;
};

// Helper gửi noti cho supplier hoặc customer

const sendRentalNotification = async (
  rental,

  receiverRole,

  title,

  message,

  linkSuffix = "",

  type = "ORDER",
) => {
  const receiverId =
    receiverRole === "SUPPLIER" ? rental.supplierId : rental.customerId;

  const senderId =
    receiverRole === "SUPPLIER" ? rental.customerId : rental.supplierId;

  const rid = rental._id?.toString?.() || rental._id;

  const link =
    receiverRole === "SUPPLIER"
      ? `/supplier/rental-requests?rental=${rid}`
      : linkSuffix
        ? `/my-rentals/${rid}${linkSuffix}`
        : `/my-rentals/${rid}`;

  await NotificationConfig.sendNotification({
    senderId,

    receiverId,

    title,

    message,

    link,

    type,
  });
};

const tryParseJsonField = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const extractUploadedUrls = (filesInput) => {
  const files = Array.isArray(filesInput)
    ? filesInput
    : Object.values(filesInput || {}).flat();

  return files.map((file) => file?.path).filter(Boolean);
};

// Helper function to generate contract for rental

const generateRentalContract = async (rentalId) => {
  try {
    // Get rental with populated data

    const rental = await Rental.findById(rentalId)

      .populate("customerId", "fullName email phone")

      .populate("supplierId", "fullName email phone")

      .populate({
        path: "items",

        populate: {
          path: "deviceId",

          select: "name rentPrice depositAmount",
        },
      });

    if (!rental) {
      throw new Error("Rental not found");
    }

    // Read template file

    const templatePath = path.join(
      __dirname,
      "../../templatesContract/template_contract.docx",
    );

    if (!fs.existsSync(templatePath)) {
      throw new Error("Contract template not found");
    }

    // Upload template to Cloudinary

    const uploadResult = await cloudinary.uploader.upload(
      templatePath,

      {
        resource_type: "auto",

        folder: "contracts",

        public_id: `contract-${rentalId}-${Date.now()}`,

        format: "pdf",
      },
    );

    // Create contract record

    const contract = await Contract.create({
      rentalId,

      contractType: "DELIVERY",

      status: "DRAFT",

      deliveryMethod: "SHIP",
    });

    // Create contract file record

    await ContractFile.create({
      contractId: contract._id,

      fileUrl: uploadResult.secure_url,

      fileType: "DELIVERY",

      uploadedBy: rental.supplierId, // Auto-generated by system
    });

    return {
      contract,

      fileUrl: uploadResult.secure_url,
    };
  } catch (error) {
    console.error("Contract generation error:", error);

    throw new Error("Failed to generate contract");
  }
};

/**



 * GET /api/rentals/:rentalId



 * Lấy chi tiết một đơn thuê (dành cho customer xem chi tiết)



 */

/** Cuối ngày trả (local 23:59:59.999) mới nhất trong line items vẫn ≥ hiện tại */

const isRentalPeriodStillOpenForDelivery = (rentalItems) => {
  if (!rentalItems?.length) return false;

  const now = Date.now();

  let latestEndEod = 0;

  for (const it of rentalItems) {
    const d = new Date(it.rentalEndDate);

    if (Number.isNaN(d.getTime())) continue;

    const eod = new Date(d);

    eod.setHours(23, 59, 59, 999);

    latestEndEod = Math.max(latestEndEod, eod.getTime());
  }

  return latestEndEod >= now;
};

/**



 * GET /api/rentals/:rentalId



 * Lấy chi tiết một đơn thuê (khách hoặc NCC của đơn)



 */

exports.getRentalById = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.status(400).json({ message: "Rental ID không hợp lệ" });
    }

    const rental = await Rental.findOne({
      _id: rentalId,

      $or: [{ customerId: userId }, { supplierId: userId }],
    })

      .populate("customerId", "fullName avatar email phone")

      .populate("supplierId", "fullName avatar email phone")

      .populate(
        "assignedOperationStaffId",

        "fullName avatar email phone role",
      )

      .populate({
        path: "extensionRequests",

        match: { status: "PENDING" },

        select:
          "requestedEndDate requestedDays proposedExtraAmount status note",
      })

      .lean();

    if (!rental) {
      return res.status(404).json({
        success: false,

        message: "Không tìm thấy đơn thuê hoặc bạn không có quyền xem",
      });
    }

    // Populate RentalItems + nested data

    const rentalItems = await RentalItem.find({ rentalId: rental._id })

      .populate([
        {
          path: "deviceId",

          select: "name slug images supplierId rentPrice depositAmount",

          populate: {
            path: "supplierId",

            select: "fullName avatar phone email",
          },
        },

        {
          path: "deviceItemIds", // mảng serial thực tế

          select: "serialNumber internalCode condition status location images",
        },
      ])

      .lean();

    // Thêm reports + serialNumbers cho từng item (giống getMyRentals)

    const itemsWithReports = await Promise.all(
      rentalItems.map(async (item) => {
        const deliveryIssues = await mongoose

          .model("DeliveryIssueReport")

          .find({ rentalItemIds: { $in: [item._id] } })

          .sort({ createdAt: -1 })

          .select(
            "issueType description status images resolvedNote createdAt updatedAt",
          )

          .lean();

        const damageReports = await mongoose

          .model("DamageReport")

          .find({ rentalItemId: item._id })

          .sort({ createdAt: -1 })

          .select(
            "description severity status images compensationAmount createdAt updatedAt",
          )

          .lean();



        const issuesWithProposals = await attachLatestCompensationProposal({
          deliveryIssues,
          damageReports,
        });

        return {
          ...item,

          deliveryIssues: issuesWithProposals.deliveryIssues,

          damageReports: issuesWithProposals.damageReports,

          serialNumbers: item.deviceItemIds?.map((d) => d.serialNumber) || [],

          conditions: item.deviceItemIds?.map((d) => d.condition) || [],
        };
      }),
    );

    const devicesInfo = (itemsWithReports || [])
      .map((ri) => {
        const deviceObj =
          ri.deviceId && typeof ri.deviceId === "object" ? ri.deviceId : {};
        const snapshotObj = ri.deviceSnapshot || {};
        return {
          name: deviceObj.name || snapshotObj.name || "Thiết bị",
          image:
            (deviceObj.images && deviceObj.images[0]) ||
            (snapshotObj.images && snapshotObj.images[0]) ||
            "",
          quantity: ri.quantity || 1,
        };
      })
      .filter((d) => d.name);

    // Explicitly fetch extension requests to bypass potential virtual population issues
    const extReqs = await ExtensionRequest.find({
      rentalId: rental._id,
      status: { $in: ["PENDING", "APPROVED", "REJECTED"] },
    }).lean();

    if (extReqs && Array.isArray(extReqs)) {
      rental.extensionRequests = extReqs.map((er) => {
        return {
          ...er,
          devices: devicesInfo,
        };
      });
    }

    const result = {
      ...rental,
      items: itemsWithReports,
    };

    // Lấy thông tin contract nếu có

    const contract = await Contract.findOne({ rentalId: rental._id }).lean();

    let contractUrl = null;

    if (contract) {
      const contractFile = await ContractFile.findOne({
        contractId: contract._id,
      }).lean();

      if (contractFile) {
        contractUrl = contractFile.fileUrl;
      }
    }

    // Check if rental has been reviewed

    const Review = require("../../models/Review");

    const hasReview = await Review.exists({ rentalId: rental._id, userId });

    res.json({
      success: true,

      rental: {
        ...result,

        isReviewed: !!hasReview,
      },

      contractUrl,
    });
  } catch (error) {
    console.error("Error getRentalById:", error);

    res.status(500).json({
      success: false,

      message: error.message || "Lỗi khi lấy chi tiết đơn thuê",
    });
  }
};

exports.checkoutRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  let grandTotalAmount = 0;

  const PLATFORM_FEE_RATE = 0.1; // 10% trên rent sau voucher

  try {
    const customerId = req.user.id;

    const {
      cartType = "NORMAL",

      deliveryAddress,

      phoneNumber,

      paymentMethod,

      notes,

      voucherCode,

      // Accept both deliveryFee (new) and shippingFee (frontend compat)

      deliveryFee: _deliveryFeeRaw,

      shippingFee: _shippingFeeRaw,

      customerSignature,
    } = req.body;

    // Parse delivery fee: accept deliveryFee or shippingFee field from frontend

    const deliveryFee = Number(_deliveryFeeRaw ?? _shippingFeeRaw ?? 0) || 0;

    const formattedAddress = {
      receiverName: deliveryAddress?.receiverName || "Khách hàng",

      street: deliveryAddress?.street || "",

      district: deliveryAddress?.district || "",

      city: deliveryAddress?.city || "",

      fullAddress: deliveryAddress?.fullAddress || "",
    };

    // 1. Load cart

    const cart = await Cart.findOne({ customerId, cartType })

      .populate({ path: "items", populate: { path: "deviceId" } })

      .session(session);

    if (!cart || cart.items.length === 0) throw new Error("Giỏ hàng trống");

    // 2. Group items by supplier

    const supplierGroups = {};

    for (const item of cart.items) {
      const device = item.deviceId;

      if (!device) throw new Error("Thiết bị không tồn tại");

      const availableCount = await DeviceItem.countDocuments({
        deviceId: device._id,

        status: "AVAILABLE",
      }).session(session);

      if (availableCount < item.quantity) {
        throw new Error(
          `Thiết bị ${device.name} không đủ số lượng khả dụng (còn ${availableCount}/${item.quantity})`,
        );
      }

      const supplierId = device.supplierId.toString();

      // Chặn supplier tự book sản phẩm của chính mình

      if (supplierId === customerId.toString()) {
        throw new Error(
          `Bạn không thể thuê sản phẩm "${device.name}" do chính mình đăng ký cung cấp`,
        );
      }

      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          items: [],

          rentPriceTotal: 0,

          depositAmount: 0,
        };
      }

      // Use discountPrice if available and not expired, otherwise use regular rentPrice

      const now = new Date();

      const discountExpiry = device.discountExpiry
        ? new Date(device.discountExpiry)
        : null;

      const isDiscountValid =
        device.discountPrice && discountExpiry && discountExpiry > now;

      const effectivePrice = isDiscountValid
        ? device.discountPrice
        : device.rentPrice.perDay;

      const rent = effectivePrice * item.totalDays * item.quantity;

      const deposit = device.depositAmount * item.quantity;

      supplierGroups[supplierId].rentPriceTotal += rent;

      supplierGroups[supplierId].depositAmount += deposit;

      supplierGroups[supplierId].items.push({
        deviceId: device._id,

        quantity: item.quantity,

        rentalStartDate: item.rentalStartDate,

        rentalEndDate: item.rentalEndDate,

        totalDays: item.totalDays,

        rentPrice: rent,

        depositAmount: deposit,
      });
    }

    const supplierIds = Object.keys(supplierGroups);

    // 3. Voucher

    let appliedVoucher = null;

    if (voucherCode) {
      appliedVoucher = await Voucher.findOne({
        code: voucherCode.toUpperCase(),

        status: "ACTIVE",
      }).session(session);

      if (
        appliedVoucher &&
        appliedVoucher.usedCount >= appliedVoucher.usageLimit
      ) {
        throw new Error("Mã giảm giá đã hết lượt sử dụng");
      }

      if (appliedVoucher && appliedVoucher.applicableRank) {
        const user = await User.findById(customerId).select("rank").session(session);
        const userRank = (user?.rank || 'BRONZE').trim().toUpperCase();
        const dbRank = appliedVoucher.applicableRank.trim().toUpperCase();
        
        const rankWeights = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
        const userWeight = rankWeights[userRank] || 1;
        const voucherWeight = rankWeights[dbRank] || 1;

        if (userWeight < voucherWeight) {
          throw new Error(`Mã này dành cho hạng ${dbRank} trở lên. Hạng hiện tại của bạn là ${userRank}.`);
        }

        // Kiểm tra giới hạn tần suất cho Voucher Rank (1 lần/tháng)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const usedThisVoucher = await Rental.findOne({
          customerId,
          voucherCode: appliedVoucher.code,
          status: { $nin: ['CANCELLED', 'REJECTED'] },
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).session(session);

        if (usedThisVoucher) {
          throw new Error(`Bạn đã sử dụng ưu đãi hạng ${dbRank} của tháng này rồi.`);
        }
      }

      if (appliedVoucher) {
        const usageCheck = await Rental.findOne({
          customerId,

          voucherCode: { $regex: new RegExp(`^${appliedVoucher.code}$`, "i") },

          status: { $nin: ["CANCELLED", "REJECTED"] },
        }).session(session);

        if (usageCheck) {
          throw new Error(
            "Bạn đã sử dụng mã giảm giá này cho một đơn hàng trước đó",
          );
        }
      }
    }

    // 4. Tính toán chi tiết theo từng supplier

    const rentalCreationData = [];

    let totalPlatformFee = 0;

    for (const supplierId of supplierIds) {
      const group = supplierGroups[supplierId];

      let voucherDiscount = 0;

      if (appliedVoucher) {
        if (appliedVoucher.discountType === "PERCENT") {
          voucherDiscount = Math.round(
            (group.rentPriceTotal * appliedVoucher.discountValue) / 100,
          );

          if (appliedVoucher.maxDiscount) {
            voucherDiscount = Math.min(
              voucherDiscount,

              appliedVoucher.maxDiscount,
            );
          }
        } else if (appliedVoucher.discountType === "FIXED") {
          voucherDiscount = Math.min(
            appliedVoucher.discountValue,

            group.rentPriceTotal,
          );
        }
      }

      const rentAfterDiscount = group.rentPriceTotal - voucherDiscount;

      const platformFee = Math.round(rentAfterDiscount * PLATFORM_FEE_RATE);

      const supplierReceive = rentAfterDiscount - platformFee;

      const totalCustomerPay =
        rentAfterDiscount + group.depositAmount + deliveryFee;

      grandTotalAmount += totalCustomerPay;

      totalPlatformFee += platformFee;

      rentalCreationData.push({
        supplierId,

        rentPriceTotal: group.rentPriceTotal,

        rentAfterDiscount,

        voucherDiscount,

        platformFee,

        supplierReceive,

        depositAmount: group.depositAmount,

        deliveryFee,

        totalCustomerPay,

        items: group.items,
      });
    }

    // 5. Allocate DeviceItem (giữ nguyên)

    const allocatedData = [];

    for (const data of rentalCreationData) {
      const allocatedItems = [];

      for (const item of data.items) {
        const deviceItemIds = await allocateDeviceItems(
          item.deviceId,

          item.quantity,

          session,
        );

        allocatedItems.push({ ...item, deviceItemIds });
      }

      allocatedData.push({ ...data, items: allocatedItems });
    }

    // 6. Xử lý thanh toán WALLET → trừ khách + cộng phí vào ví system

    let paymentStatus = "UNPAID";

    let walletSuccess = false;

    if (paymentMethod === "WALLET") {
      const customerWallet = await Wallet.findOne({ user: customerId }).session(
        session,
      );

      if (!customerWallet || customerWallet.balance < grandTotalAmount) {
        throw new Error("Số dư ví không đủ");
      }

      // Trừ tiền khách

      const custBalanceBefore = customerWallet.balance;

      customerWallet.balance -= grandTotalAmount;

      await customerWallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: customerWallet._id,

            type: "PAYMENT",

            amount: -grandTotalAmount,

            balanceBefore: custBalanceBefore,

            balanceAfter: customerWallet.balance,

            referenceType: "RENTAL",

            status: "SUCCESS",

            description: `Thanh toán ${supplierIds.length} đơn thuê (bao gồm cọc)`,
          },
        ],
        { session, ordered: true },
      );

      // System wallet transactions sẽ được tạo ở step 7.5 (sau khi có rentalId)

      paymentStatus = "PAID";

      walletSuccess = true;

      // Tăng usedCount voucher

      if (appliedVoucher) {
        const updated = await Voucher.updateOne(
          {
            _id: appliedVoucher._id,

            usedCount: { $lt: appliedVoucher.usageLimit },
          },

          { $inc: { usedCount: 1 } },

          { session },
        );

        if (updated.modifiedCount === 0) {
          throw new Error(
            "Mã giảm giá đã hết lượt sử dụng ngay lúc thanh toán",
          );
        }
      }
    } else if (paymentMethod === "BANK") {
      paymentStatus = "UNPAID";
    }

    // 7. Tạo Rentals (bỏ insuranceAmount)

    const createdRentals = [];

    for (const data of allocatedData) {
      const rentalData = {
        customerId,

        supplierId: data.supplierId,

        rentPriceTotal: data.rentPriceTotal,

        depositAmount: data.depositAmount,

        deliveryFee: data.deliveryFee,

        voucherDiscount: data.voucherDiscount,

        totalAmount: data.totalCustomerPay,

        paymentBreakdown: {
          rentAmount: data.rentAfterDiscount,

          depositAmount: data.depositAmount,

          platformFee: data.platformFee,

          supplierReceive: data.supplierReceive,
        },

        paymentMethod,

        paymentStatus,

        status: "PENDING",

        escrowStatus: "HOLDING",

        depositStatus: "HELD",

        supplierPayoutStatus: "PENDING",

        voucherCode: appliedVoucher?.code,

        deliveryAddress: formattedAddress,

        phoneNumber,

        notes,

        rentalStartDate: data.items[0]?.rentalStartDate,
        rentalEndDate: data.items[0]?.rentalEndDate,
        customerSignature,
      };

      if (paymentMethod === "BANK") {
        rentalData.orderCode = Number(
          String(Date.now()) + Math.floor(Math.random() * 1000),
        );
      }

      const [rental] = await Rental.create([rentalData], {
        session,
        ordered: true,
      });

      // RentalItems (giữ nguyên, bỏ insurance nếu có)

      const rentalItemsData = data.items.map((item) => ({
        rentalId: rental._id,

        deviceId: item.deviceId,

        deviceItemIds: item.deviceItemIds,

        quantity: item.quantity,

        rentalStartDate: item.rentalStartDate,

        rentalEndDate: item.rentalEndDate,

        totalDays: item.totalDays,

        rentPrice: item.rentPrice / item.quantity,

        depositAmount: item.depositAmount / item.quantity,

        isAddon: false,
      }));

      await RentalItem.insertMany(rentalItemsData, { session });

      // Store rental with its items data for contract generation

      // Convert Mongoose document to plain object to ensure all getters work

      const rentalPlain = rental.toObject();

      createdRentals.push({
        rental: rentalPlain,

        items: rentalItemsData,
      });
    }

    // 7.5. Tạo system wallet transactions per rental (sau khi có rentalId để gắn referenceId đúng)

    if (paymentMethod === "WALLET") {
      const systemWallet = await Wallet.findOne({ isSystem: true }).session(
        session,
      );

      if (!systemWallet) throw new Error("Không tìm thấy ví hệ thống");

      const txNow = new Date();

      let sysRunningBalance = systemWallet.balance;

      const systemTxs = [];

      for (let idx = 0; idx < createdRentals.length; idx++) {
        const { rental: createdRental } = createdRentals[idx];

        const rd = allocatedData[idx];

        const netEscrow = Math.max(
          0,
          (rd.rentAfterDiscount || 0) - (rd.platformFee || 0),
        );

        const pFee = rd.platformFee || 0;

        const depositAmt = rd.depositAmount || 0;

        const shippingFee = rd.deliveryFee || 0;

        const offset = idx * 4;

        if (pFee > 0) {
          systemTxs.push({
            wallet: systemWallet._id,

            type: "PLATFORM_FEE",

            amount: pFee,

            balanceBefore: sysRunningBalance,

            balanceAfter: sysRunningBalance + pFee,

            referenceType: "RENTAL",

            referenceId: createdRental._id,

            description: `Thu phí nền tảng đơn #${createdRental._id.toString().slice(-6)}`,

            status: "SUCCESS",

            isEarned: false,

            rentalStatus: "PENDING",

            metadata: { paymentMethod: "WALLET" },

            createdAt: new Date(txNow.getTime() + offset),
          });

          sysRunningBalance += pFee;
        }

        if (netEscrow > 0) {
          systemTxs.push({
            wallet: systemWallet._id,

            type: "ESCROW_HOLD",

            amount: netEscrow,

            balanceBefore: sysRunningBalance,

            balanceAfter: sysRunningBalance + netEscrow,

            referenceType: "RENTAL",

            referenceId: createdRental._id,

            description: `Tiền thuê tạm giữ đơn #${createdRental._id.toString().slice(-6)}`,

            status: "SUCCESS",

            createdAt: new Date(txNow.getTime() + offset + 1),
          });

          sysRunningBalance += netEscrow;
        }

        if (depositAmt > 0) {
          systemTxs.push({
            wallet: systemWallet._id,

            type: "DEPOSIT_HOLD",

            amount: depositAmt,

            balanceBefore: sysRunningBalance,

            balanceAfter: sysRunningBalance + depositAmt,

            referenceType: "RENTAL",

            referenceId: createdRental._id,

            description: `Tiền đặt cọc tạm giữ đơn #${createdRental._id.toString().slice(-6)}`,

            status: "SUCCESS",

            createdAt: new Date(txNow.getTime() + offset + 2),
          });

          sysRunningBalance += depositAmt;
        }

        if (shippingFee > 0) {
          systemTxs.push({
            wallet: systemWallet._id,

            type: "SHIPPING_FEE",

            amount: shippingFee,

            balanceBefore: sysRunningBalance,

            balanceAfter: sysRunningBalance + shippingFee,

            referenceType: "RENTAL",

            referenceId: createdRental._id,

            description: `Phí vận chuyển đơn #${createdRental._id.toString().slice(-6)}`,

            status: "SUCCESS",

            isEarned: false,

            rentalStatus: "PENDING",

            metadata: { paymentMethod: "WALLET" },

            createdAt: new Date(txNow.getTime() + offset + 3),
          });

          sysRunningBalance += shippingFee;
        }
      }

      systemWallet.balance = sysRunningBalance;

      await systemWallet.save({ session });

      if (systemTxs.length > 0) {
        await WalletTransaction.insertMany(systemTxs, { session });
      }
    }

    // 8. Notification và upload contract

    // For WALLET payment - immediate contract creation

    if (walletSuccess) {
      for (const { rental, items } of createdRentals) {
        try {
          await createContractForRental(rental, req, items, customerSignature);
        } catch (error) {
          console.error(`[CHECKOUT] Error stack:`, error.stack);
        }
      }
    }

    // 8.1 Verify contract creation after all attempts

    setTimeout(async () => {
      for (const { rental } of createdRentals) {
        try {
          const contract = await Contract.findOne({
            rentalId: rental._id,
          }).lean();

          if (contract) {
            const contractFile = await ContractFile.findOne({
              contractId: contract._id,
            }).lean();
          } else {
            console.warn(
              `[CHECKOUT] ⚠ No contract found for rental ${rental._id}`,
            );
          }
        } catch (verifyError) {
          console.error(
            `[CHECKOUT] Error verifying contract for rental ${rental._id}:`,
            verifyError,
          );
        }
      }
    }, 5000); // Check after 5 seconds

    // Helper function to create contract

    async function createContractForRental(
      rental,
      req,
      rentalItemsData = [],
      customerSignature = null,
    ) {
      try {
        // Import contract controller functions

        const ContractController = require("../Contract/ContractController");

        const Contract = require("../../models/Contract");

        const ContractFile = require("../../models/ContractFile");

        const DeviceItem = require("../../models/DeviceItem");

        const Device = require("../../models/Device");

        // Gán customerSignature vào rental nếu có

        if (customerSignature) {
          rental.customerSignature = customerSignature;
        }

        // Use provided items data, enrich with device and deviceItem info

        const enrichedItems = [];

        for (const item of rentalItemsData) {
          // Fetch device info

          const device = await Device.findById(item.deviceId).select(
            "name condition",
          );

          // Fetch device items for serial numbers

          const deviceItems = await DeviceItem.find({
            _id: { $in: item.deviceItemIds || [] },
          }).select("serialNumber imei");

          enrichedItems.push({
            ...item,

            deviceId: device || { name: "Thiết bị", condition: "GOOD" },

            deviceItems: deviceItems,
          });
        }

        // Generate contract buffer with enriched rental items

        const buf = await ContractController.generateDocxBuffer(
          rental,
          enrichedItems,
        );

        // Upload to Cloudinary

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "raw",

                folder: "contracts",

                public_id: `contract-${rental._id}-${Date.now()}`,

                format: "docx",
              },

              (error, result) => (error ? reject(error) : resolve(result)),
            )
            .end(buf);
        });

        // Create contract record

        const contractRecord = await Contract.create({
          rentalId: rental._id,

          contractType: "DELIVERY",

          status: "SIGNED",

          deliveryMethod: "SHIP",

          location: rental.deliveryAddress?.fullAddress || "",

          ipAddress: getClientIp(req),

          userAgent: req.headers["user-agent"] || "",

          contractVersion: "v1",

          customer: rental.customerId,

          supplier: rental.supplierId,

          signedByCustomer: true,

          signedByStaff: true,

          signedAt: new Date(),
        });

        // Create contract file record

        const contractFileRecord = await ContractFile.create({
          contractId: contractRecord._id,

          fileUrl: uploadResult.secure_url,

          fileType: "DELIVERY",

          uploadedBy: rental.customerId,
        });
      } catch (contractError) {
        // Không throw error vì payment thành công, contract có thê upload sau
      }
    }

    // 9. Send notifications

    for (const { rental } of createdRentals) {
      await sendRentalNotification(
        rental,

        "SUPPLIER",

        "Có don thuê moi!",

        `Khách hàng ${paymentMethod === "WALLET" ? "dã thanh toán" : "dã dat"} ${rental.totalAmount.toLocaleString(
          "vi-VN",
        )}VNÐ (bao gôm cçc). Ban sê nhân duçc phân tiên thuê sau khi hoàn tat.`,
      );

      await sendRentalNotification(
        rental,

        "CUSTOMER",

        paymentMethod === "WALLET"
          ? "Đặt thuê thành công"
          : "Đặt thuê thành công",

        `Ban dã ${paymentMethod === "WALLET" ? "thanh toán" : "dat"} thành công don #${rental._id

          .toString()

          .slice(-6)}. Vui lòng chô nhà cung câp xác nhân.`,
      );
    }

    // 10. Xóa cart (giù nguyên)

    await CartItem.deleteMany({
      _id: { $in: cart.items.map((i) => i._id) },
    }).session(session);

    cart.items = [];

    await cart.save({ session });

    // 10. PayOS cho BANK (giữ nguyên, orderCode dùng chung cho group)

    let paymentLink = null;
    let orderCode = null;

    if (paymentMethod === "BANK") {
      orderCode = Number(String(Date.now()).slice(-9));

      const representativeRentalId = createdRentals[0].rental._id.toString();

      paymentLink = await payos.paymentRequests.create({
        orderCode,

        amount: grandTotalAmount,

        description: `GXP - Thuê thiết bị & đặt cọc`,

        returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${representativeRentalId}`,

        cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${representativeRentalId}`,
      });

      const updateResult = await Rental.updateMany(
        { _id: { $in: createdRentals.map((r) => r.rental._id) } },

        { orderCode },

        { session },
      );

      console.log(
        `[CHECKOUT] Updated ${updateResult.modifiedCount} rentals with orderCode: ${orderCode}`,
      );
    }

    await session.commitTransaction();

    res.status(201).json({
      message:
        paymentMethod === "BANK"
          ? "Vui lòng hoàn tất thanh toán"
          : "Checkout thành công",

      rentalIds: createdRentals.map((r) => r.rental._id),

      paymentMethod,

      paymentLink,

      orderCode: paymentMethod === "BANK" ? orderCode : null,

      totalAmount: grandTotalAmount,
    });

    // 11. Gửi email xác nhận (không await để trả response nhanh)
    if (paymentMethod === "WALLET") {
      process.nextTick(async () => {
        try {
          const user = await User.findById(customerId).select("fullName email");
          if (!user?.email) return;

          // Chuẩn bị dữ liệu cho template
          const rentalsForEmail = await Promise.all(createdRentals.map(async ({ rental }) => {
            const supplier = await User.findById(rental.supplierId).select("fullName");
            const itemsList = await RentalItem.find({ rentalId: rental._id }).populate("deviceId", "name");

            return {
              ...rental,
              supplierName: supplier?.fullName || "Nhà cung cấp",
              items: itemsList.map(it => ({
                name: it.deviceId?.name || "Thiết bị",
                quantity: it.quantity,
                rentalStartDate: it.rentalStartDate,
                rentalEndDate: it.rentalEndDate,
                totalAmount: it.rentPrice * it.quantity
              }))
            };
          }));

          const emailHtml = EmailTemplates.orderConfirmationTemplate(
            user.fullName,
            rentalsForEmail,
            `WLT-${Date.now().toString().slice(-6)}`
          );

          await sendMail(user.email, "Xác nhận đặt thuê thiết bị thành công - GearXpert", emailHtml);
          console.log(`[CHECKOUT] Wallet email sent to ${user.email}`);
        } catch (mailErr) {
          console.error("[CHECKOUT] Wallet Mail error:", mailErr);
        }
      });
    }
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("CHECKOUT ERROR:", err.stack);

    if (!res.headersSent) {
      res.status(400).json({ message: err.message || "Thanh toán thất bại" });
    }
  } finally {
    session.endSession();
  }
};

// Helper allocate (giữ nguyên)

async function allocateDeviceItems(deviceId, quantity, session) {
  const items = await DeviceItem.find({
    deviceId,

    status: "AVAILABLE",
  })

    .limit(quantity)

    .session(session);

  if (items.length < quantity) {
    throw new Error(
      `Không đủ thiết bị khả dụng (còn ${items.length}/${quantity})`,
    );
  }

  // Chuyển status sang RENTED

  for (const item of items) {
    item.status = "RENTED";

    await item.save({ session });
  }

  // Số lượng Device = gộp từ DeviceItem (hook save đã gọi updateDeviceCounts).

  // Không $inc tay lên Device — stockQuantity trên Device = tổng số DeviceItem.

  return items.map((item) => item._id);
}

/**



 * Kiểm tra người dùng đã từng thuê thiết bị này chưa (để cho phép review)



 */

exports.hasRentedDevice = async (req, res) => {
  try {
    const customerId = req.user._id;

    const deviceId = req.params.deviceId;

    // Tìm xem có RentalItem nào chứa deviceId này thuộc về customerId không

    const rentalItem = await RentalItem.findOne({ deviceId }).populate({
      path: "rentalId",

      match: { customerId, paymentStatus: "PAID" },
    });

    res.json({ hasRented: !!(rentalItem && rentalItem.rentalId) });
  } catch (error) {
    res.status(500).json({ message: "Lỗi kiểm tra lịch sử thuê" });
  }
};

// GET /rentals/supplier/:supplierId?status=PENDING,APPROVED

exports.getSupplierRentals = async (req, res) => {
  try {
    const { supplierId } = req.params;

    let { status } = req.query;

    let statusArr = [];

    if (status) {
      statusArr = status.split(",").map((s) => s.trim().toUpperCase());
    }

    const query = { supplierId };

    if (statusArr.length > 0) {
      query.status = { $in: statusArr };
    }

    // Lấy rentals trước, populate customer và address

    const rentals = await Rental.find(query)

      .populate("customerId", "fullName avatar email")

      .populate("deliveryAddress", "fullAddress")

      .sort({ createdAt: -1 });

    // Lấy rentalItems cho từng rental, populate deviceId

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId");

        return {
          ...rental.toObject(),

          rentalItems,
        };
      }),
    );

    res.json({ rentals: rentalsWithItems });
  } catch (error) {
    console.error("Error getSupplierRentals:", error);

    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveringRentals = async (req, res) => {
  try {
    const query = { status: { $in: ["DELIVERING", "PENDING_RESOLUTION"] } };

    if (req.user?.role === "OPERATION_STAFF") {
      query.$or = [
        { assignedOperationStaffId: null },

        { assignedOperationStaffId: req.user.id },
      ];
    }

    const rentals = await Rental.find(query)

      .populate("customerId", "fullName avatar email")

      .populate("assignedOperationStaffId", "fullName email")

      .sort({ updatedAt: -1 });

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId", "name images");

        // Ensure DeliveryTask exists

        let deliveryTask = await DeliveryTask.findOne({
          rentalId: rental._id,

          type: "DELIVERY",

          status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
        })

          .sort({ createdAt: -1 })

          .lean();

        // Check if rental is in DELIVERING or has a valid task in PENDING_RESOLUTION

        if (rental.status === "PENDING_RESOLUTION") {
          // Bỏ qua nếu PENDING_RESOLUTION này là do thất bại khi thu hồi

          if (rental.inspectedContext === "RETURN") {
            return null;
          }

          // Chỉ show ở tab Giao Hàng nếu đó là đơn "Giao bổ sung"

          if (!deliveryTask || !deliveryTask.isAdditional) {
            return null;
          }
        } else if (rental.status !== "DELIVERING") {
          return null; // Không trả về nếu không phải DELIVERING hoặc PENDING_RESOLUTION hợp lệ
        }

        // Auto-create task if it doesn't exist for DELIVERING rentals

        if (!deliveryTask && rental.status === "DELIVERING") {
          const newTask = await DeliveryTask.create({
            rentalId: rental._id,

            deviceIds: rentalItems.map((item) => item.deviceId),

            type: "DELIVERY",

            status: "PENDING",

            pickupRequestId: null,

            notes: "",
          });

          deliveryTask = newTask.toObject();
        }

        return {
          ...rental.toObject(),

          rentalItems,

          deliveryTask,
        };
      }),
    );

    // Filter out nulls

    res.json({ rentals: rentalsWithItems.filter(Boolean) });
  } catch (error) {
    console.error("Error getDeliveringRentals:", error);

    res.status(500).json({ message: error.message });
  }
};

exports.getReturningRentals = async (req, res) => {
  try {
    const query = { status: "RETURNING" };

    if (req.user?.role === "OPERATION_STAFF") {
      query.assignedOperationStaffId = req.user.id;
    }

    const rentals = await Rental.find(query)

      .populate("customerId", "fullName avatar email")

      .populate("assignedOperationStaffId", "fullName email")

      .sort({ updatedAt: -1 });

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        // Ensure each RETURNING rental has a retrieval draft for operation flow.

        await ensureDraftForReturn({
          rentalId: rental._id,

          staffId:
            req.user?.role === "OPERATION_STAFF"
              ? req.user.id
              : rental.assignedOperationStaffId,

          actorId: req.user?.id,
        });

        const returnRecords = await listByRental(rental._id);

        const activeReturnRecord = returnRecords.find((record) =>
          ["DRAFT", "IN_PROGRESS"].includes(record.status),
        );

        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId", "name images");

        return {
          ...rental.toObject(),

          rentalItems,

          returnRecord: activeReturnRecord || null,
        };
      }),
    );

    res.json({ rentals: rentalsWithItems });
  } catch (error) {
    console.error("Error getReturningRentals:", error);

    res.status(500).json({ message: error.message });
  }
};

exports.claimDeliveryTask = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    if (req.user?.role !== "OPERATION_STAFF") {
      throw new Error("Chỉ operation staff mới có thể nhận đơn");
    }

    const { taskId } = req.params;

    const staffId = req.user.id;

    const existingTask = await DeliveryTask.findById(taskId).session(session);

    if (!existingTask) {
      throw new Error("Không tìm thấy delivery task");
    }

    if (existingTask.type !== "DELIVERY") {
      throw new Error("Task này không phải task giao hàng");
    }

    if (["COMPLETED", "FAILED"].includes(existingTask.status)) {
      throw new Error("Task đã kết thúc, không thể nhận");
    }

    if (
      existingTask.deliveryStaffId &&
      String(existingTask.deliveryStaffId) !== String(staffId)
    ) {
      throw new Error("Task đã được staff khác nhận");
    }

    const claimedTask = await DeliveryTask.findOneAndUpdate(
      {
        _id: taskId,

        type: "DELIVERY",

        status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },

        $or: [{ deliveryStaffId: null }, { deliveryStaffId: staffId }],
      },

      {
        $set: {
          deliveryStaffId: staffId,

          status:
            existingTask.status === "IN_TRANSIT" ? "IN_TRANSIT" : "ASSIGNED",

          claimedAt: existingTask.claimedAt || new Date(),
        },
      },

      { new: true, session },
    );

    if (!claimedTask) {
      throw new Error("Không thể nhận task do xung đột đồng thời");
    }

    const rentalUpdate = await Rental.findOneAndUpdate(
      {
        _id: claimedTask.rentalId,

        status: "DELIVERING",

        $or: [
          { assignedOperationStaffId: null },

          { assignedOperationStaffId: staffId },
        ],
      },

      {
        $set: {
          assignedOperationStaffId: staffId,

          assignmentLockedAt: new Date(),
        },
      },

      { new: true, session },
    );

    if (!rentalUpdate) {
      throw new Error(
        "Đơn đã bị staff khác lock hoặc không còn ở trạng thái DELIVERING",
      );
    }

    await session.commitTransaction();

    emitOperationStaffUpdate({
      action: "RENTAL_LOCKED",

      message: "Một đơn giao hàng vừa được nhận (lock).",

      rentalId: String(claimedTask.rentalId),

      deliveryTaskId: String(claimedTask._id),

      assignedOperationStaffId: String(staffId),

      actorId: String(staffId),
    });

    return res.status(200).json({
      success: true,

      message: "Nhận đơn thành công",

      task: claimedTask,

      rentalId: claimedTask.rentalId,
    });
  } catch (err) {
    await session.abortTransaction();

    return res.status(409).json({
      success: false,

      message: err.message || "Không thể nhận task",
    });
  } finally {
    session.endSession();
  }
};

exports.getMyRentals = async (req, res) => {
  try {
    const customerId = req.user.id;

    // ── Step 1: Fetch all rentals + populate extensionRequests (1 query) ──
    let rentals = await Rental.find({ customerId })
      .populate({
        path: "extensionRequests",
        match: { status: { $in: ["PENDING", "APPROVED", "REJECTED"] } },
        select:
          "requestedEndDate requestedDays proposedExtraAmount status note createdAt rentalId",
      })
      .lean({ virtuals: true });

    if (!rentals.length) {
      return res.json({ rentals: [] });
    }

    const rentalIds = rentals.map((r) => r._id);

    // ── Step 2: Batch fetch ALL RentalItems for all rentals (1 query) ──
    const allRentalItems = await RentalItem.find({
      rentalId: { $in: rentalIds },
    })
      .populate([
        {
          path: "deviceId",
          select: "name slug images supplierId rentPrice depositAmount",
          populate: {
            path: "supplierId",
            select: "fullName avatar phone email",
          },
        },
        {
          path: "deviceItemIds",
          select:
            "serialNumber internalCode condition status location images lastMaintenance nextMaintenanceDue",
        },
      ])
      .lean();

    // Group items by rentalId for O(1) lookup
    const itemsByRentalId = new Map();
    const allItemIds = [];
    for (const item of allRentalItems) {
      const rid = item.rentalId.toString();
      if (!itemsByRentalId.has(rid)) itemsByRentalId.set(rid, []);
      itemsByRentalId.get(rid).push(item);
      allItemIds.push(item._id);
    }

    // ── Step 3: Batch fetch ALL reports for all items (2 queries) ──
    const DeliveryIssueReport = mongoose.model("DeliveryIssueReport");
    const DamageReport = mongoose.model("DamageReport");

    const [allDeliveryIssues, allDamageReports] = await Promise.all([
      DeliveryIssueReport.find({ rentalItemIds: { $in: allItemIds } })
        .sort({ createdAt: -1 })
        .select(
          "issueType description status images resolutionNote createdAt updatedAt deviceItemIds rentalItemIds assignedAdminId",
        )
        .populate([
          {
            path: "deviceItemIds",
            select: "serialNumber deviceId",
            populate: { path: "deviceId", select: "name images" },
          },
          {
            path: "assignedAdminId",
            select: "fullName",
          },
        ])
        .lean(),
      DamageReport.find({ rentalItemId: { $in: allItemIds } })
        .sort({ createdAt: -1 })
        .select(
          "description severity status images compensationAmount createdAt updatedAt deviceItemIds rentalItemId resolutionNote assignedAdminId",
        )
        .populate([
          {
            path: "deviceItemIds",
            select: "serialNumber deviceId",
            populate: { path: "deviceId", select: "name images" },
          },
          {
            path: "assignedAdminId",
            select: "fullName",
          },
        ])
        .lean(),
    ]);

    // Index delivery issues by rentalItemId (many-to-many via rentalItemIds array)
    const deliveryIssuesByItemId = new Map();
    for (const issue of allDeliveryIssues) {
      for (const rid of issue.rentalItemIds || []) {
        const key = rid.toString();
        if (!deliveryIssuesByItemId.has(key))
          deliveryIssuesByItemId.set(key, []);
        deliveryIssuesByItemId.get(key).push(issue);
      }
    }

    // Index damage reports by rentalItemId
    const damageReportsByItemId = new Map();
    for (const report of allDamageReports) {
      const key = report.rentalItemId.toString();
      if (!damageReportsByItemId.has(key))
        damageReportsByItemId.set(key, []);
      damageReportsByItemId.get(key).push(report);
    }

    // ── Step 4: Batch check reviews (1 query instead of N) ──
    const Review = require("../../models/Review");
    const reviewedRentalIds = new Set(
      (
        await Review.distinct("rentalId", {
          rentalId: { $in: rentalIds },
          userId: customerId,
        })
      ).map((id) => id.toString()),
    );

    // ── Step 5: Assemble everything using Maps (no additional queries) ──
    rentals = rentals.map((rental) => {
      const rentalIdStr = rental._id.toString();
      const rentalItems = itemsByRentalId.get(rentalIdStr) || [];

      // Attach reports + serial info to each item
      const itemsWithReports = rentalItems.map((item) => {
        const itemIdStr = item._id.toString();
        return {
          ...item,
          deliveryIssues: deliveryIssuesByItemId.get(itemIdStr) || [],
          damageReports: damageReportsByItemId.get(itemIdStr) || [],
          serialNumbers:
            item.deviceItemIds?.map((d) => d.serialNumber) || [],
          conditions: item.deviceItemIds?.map((d) => d.condition) || [],
        };
      });

      // Build devicesInfo for extension requests
      const devicesInfo = itemsWithReports.map((ri) => {
        const deviceObj =
          ri.deviceId && typeof ri.deviceId === "object" ? ri.deviceId : {};
        const snapshotObj = ri.deviceSnapshot || {};
        return {
          name: deviceObj.name || snapshotObj.name || "Thiết bị",
          image:
            (deviceObj.images && deviceObj.images[0]) ||
            (snapshotObj.images && snapshotObj.images[0]) ||
            "",
          quantity: ri.quantity || 1,
        };
      });

      // Enrich extension requests with device info (no extra query – already populated in step 1)
      const enrichedExtensionRequests = (rental.extensionRequests || []).map(
        (er) => ({ ...er, devices: devicesInfo }),
      );

      return {
        ...rental,
        items: itemsWithReports,
        extensionRequests: enrichedExtensionRequests,
        isReviewed: reviewedRentalIds.has(rentalIdStr),
      };
    });

    // ── Step 6: Batch enrich supplier profiles (1 query, same as before) ──
    const allSupplierIds = [
      ...new Set(
        rentals.flatMap((r) =>
          (r.items || [])
            .map((item) => item.deviceId?.supplierId?._id?.toString())
            .filter(Boolean),
        ),
      ),
    ];

    if (allSupplierIds.length > 0) {
      const supplierProfiles = await SupplierProfile.find({
        userId: { $in: allSupplierIds },
      })
        .select("userId businessName businessAvatar")
        .lean();

      const profileMap = {};
      supplierProfiles.forEach((p) => {
        profileMap[p.userId.toString()] = p;
      });

      rentals = rentals.map((rental) => ({
        ...rental,
        items: (rental.items || []).map((item) => {
          const sid = item.deviceId?.supplierId?._id?.toString();
          if (sid && profileMap[sid] && item.deviceId?.supplierId) {
            item.deviceId.supplierId.businessName =
              profileMap[sid].businessName;
            item.deviceId.supplierId.businessAvatar =
              profileMap[sid].businessAvatar;
          }
          return item;
        }),
      }));
    }

    res.json({ rentals });
  } catch (error) {
    console.error("Error getMyRentals:", error);
    res
      .status(500)
      .json({ message: error.message || "Lỗi lấy danh sách đơn thuê" });
  }
};

// PATCH /rentals/:rentalId/approve

exports.approveRental = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const rental = await Rental.findById(rentalId);

    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

    if (rental.status === "APPROVED")
      return res.status(400).json({ message: "Đơn đã được duyệt" });

    rental.status = "APPROVED";

    await rental.save();

    // Generate contract automatically

    await sendRentalNotification(
      rental,

      "CUSTOMER",

      "Đơn thuê đã được duyệt",

      "Nhà cung cấp đã xác nhận đơn thuê của bạn. Chuẩn bị nhận hàng nhé!",
    );

    res.json({ success: true, message: "Đã duyệt đơn thuê", rental });
  } catch (error) {
    console.error("Approve rental error:", error);

    res.status(500).json({ message: "Lỗi khi duyệt đơn thuê" });
  }
};

// PATCH /rentals/:rentalId/reject

exports.rejectRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    const supplierId = req.user.id;

    const { reason, details, customerMessage } = req.body;

    const rental = await Rental.findById(rentalId).session(session);

    if (!rental) throw new Error("Không tìm thấy đơn thuê");

    if (rental.supplierId.toString() !== supplierId) {
      throw new Error("Bạn không có quyền từ chối đơn này");
    }

    if (rental.status !== "PENDING") {
      throw new Error("Chỉ có thể từ chối đơn ở trạng thái chờ xử lý");
    }

    rental.status = "REJECTED";

    rental.rejectionReason = reason || "Không có lý do cụ thể";

    rental.rejectionNote = details || "";

    rental.rejectionMessage =
      customerMessage || "Đơn đã bị từ chối bởi nhà cung cấp";

    rental.rejectedAt = new Date();

    await rental.save({ session });

    await NotificationConfig.sendNotification({
      senderId: supplierId,

      receiverId: rental.customerId,

      title: "Đơn thuê bị từ chối",

      message: `Đơn thuê của bạn đã bị từ chối. Lý do: ${reason || "Không có lý do cụ thể"
        }${details ? " - " + details : ""}`,

      link: `/my-rentals/${rental._id}`,

      type: "ORDER",
    });

    // Hoàn lại status DeviceItem (không còn quantity ở Device)

    const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(
      session,
    );

    for (const item of rentalItems) {
      if (item.deviceItemIds && item.deviceItemIds.length > 0) {
        await DeviceItem.updateMany(
          { _id: { $in: item.deviceItemIds } },

          { $set: { status: "AVAILABLE" } },

          { session },
        );

        await DeviceItem.updateDeviceCounts(item.deviceId, session);
      }
    }

    // Hoàn tiền nếu đã PAID

    if (rental.paymentStatus === "PAID") {
      const wallet = await Wallet.findOne({ user: rental.customerId }).session(
        session,
      );

      if (wallet) {
        const balanceBefore = wallet.balance;

        wallet.balance += rental.totalAmount;

        await wallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: wallet._id,

              type: "REFUND",

              amount: rental.totalAmount,

              balanceBefore,

              balanceAfter: wallet.balance,

              referenceType: "RENTAL",

              referenceId: rental._id,

              description: `Hoàn tiền do nhà cung cấp từ chối đơn #${rental._id

                .toString()

                .slice(-6)}`,

              status: "SUCCESS",
            },
          ],
          { session, ordered: true },
        );
      }

      // Giải phóng ví system - tạo các giao dịch release để admin track

      const systemWallet = await Wallet.findOne({ isSystem: true }).session(
        session,
      );

      if (systemWallet && rental.totalAmount > 0) {
        const refundAmount = rental.totalAmount;

        const sysBefore = systemWallet.balance;

        systemWallet.balance -= refundAmount;

        await systemWallet.save({ session });

        const rentAmount = rental.paymentBreakdown?.rentAmount || 0;

        const platformFee = rental.paymentBreakdown?.platformFee || 0;

        const depositAmt = rental.paymentBreakdown?.depositAmount || 0;

        const deliveryFeeAmt = rental.deliveryFee || 0;

        const netEscrow = Math.max(0, rentAmount - platformFee);

        let sysRunning = sysBefore;

        if (netEscrow > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "ESCROW_RELEASE",

                amount: -netEscrow,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - netEscrow,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Giải phóng tiền thuê do NCC từ chối đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= netEscrow;
        }

        if (depositAmt > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "DEPOSIT_RELEASE",

                amount: -depositAmt,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - depositAmt,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Giải phóng tiền cọc do NCC từ chối đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= depositAmt;
        }

        if (platformFee > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "PLATFORM_FEE_REFUND",

                amount: -platformFee,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - platformFee,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Hoàn phí nền tảng do NCC từ chối đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= platformFee;

          await WalletTransaction.updateOne(
            {
              wallet: systemWallet._id,
              type: "PLATFORM_FEE",
              referenceType: "RENTAL",
              referenceId: rental._id,
            },

            {
              $set: {
                rentalStatus: "CANCELLED",
                isEarned: false,
                isRefunded: true,
              },
            },

            { session },
          );
        }

        if (deliveryFeeAmt > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "SHIPPING_FEE_REFUND",

                amount: -deliveryFeeAmt,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - deliveryFeeAmt,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Hoàn phí vận chuyển do NCC từ chối đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= deliveryFeeAmt;

          await WalletTransaction.updateOne(
            {
              wallet: systemWallet._id,
              type: "SHIPPING_FEE",
              referenceType: "RENTAL",
              referenceId: rental._id,
            },

            {
              $set: {
                rentalStatus: "CANCELLED",
                isEarned: false,
                isRefunded: true,
              },
            },

            { session },
          );
        }
      }

      rental.paymentStatus = "REFUNDED";

      await rental.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,

      message: "Đã từ chối đơn thuê và hoàn tất các bước liên quan",

      rental,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("REJECT RENTAL ERROR:", error);

    res.status(400).json({
      success: false,

      message: error.message || "Từ chối đơn thất bại",
    });
  } finally {
    session.endSession();
  }
};

const formatDayLabel = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;

const formatMonthLabel = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const formatYearLabel = (date) => `${date.getFullYear()}`;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date) =>
  new Date(
    date.getFullYear(),

    date.getMonth(),

    date.getDate(),

    23,

    59,

    59,

    999,
  );

/** Cộng dòng doanh thu phía NCC: ưu tiên paymentBreakdown.supplierReceive, fallback totalAmount (đơn cũ). */

const sumSupplierRevenueLine = async (match) => {
  const result = await Rental.aggregate([
    { $match: match },

    {
      $group: {
        _id: null,

        total: {
          $sum: {
            $ifNull: [
              "$paymentBreakdown.supplierReceive",

              { $ifNull: ["$totalAmount", 0] },
            ],
          },
        },
      },
    },
  ]);

  const raw = result[0]?.total;

  if (raw == null) return 0;

  const n = typeof raw === "number" ? raw : parseFloat(String(raw));

  return Number.isFinite(n) ? n : 0;
};

/** Doanh thu thuần hiển thị cho supplier: đã thanh toán − đã hoàn; không âm (tránh ảo khi tổng hoàn > tổng còn PAID). */

const netSupplierDisplayRevenue = (paidSum, refundedSum) => {
  const p = Number(paidSum) || 0;

  const r = Number(refundedSum) || 0;

  return Math.max(0, p - r);
};

// GET /rentals/supplier/:supplierId/revenue

exports.getSupplierRevenue = async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "SupplierId không hợp lệ" });
    }

    const supplierObjectId = new mongoose.Types.ObjectId(supplierId);

    const now = new Date();

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalPaid = await sumSupplierRevenueLine({
      supplierId: supplierObjectId,

      paymentStatus: "PAID",
    });

    const totalRefunded = await sumSupplierRevenueLine({
      supplierId: supplierObjectId,

      paymentStatus: "REFUNDED",
    });

    const monthlyPaid = await sumSupplierRevenueLine({
      supplierId: supplierObjectId,

      paymentStatus: "PAID",

      createdAt: { $gte: startMonth, $lte: now },
    });

    const monthlyRefunded = await sumSupplierRevenueLine({
      supplierId: supplierObjectId,

      paymentStatus: "REFUNDED",

      createdAt: { $gte: startMonth, $lte: now },
    });

    // Last month revenue
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const lastMonthPaid = await sumSupplierRevenueLine({
      supplierId: supplierObjectId,
      paymentStatus: "PAID",
      createdAt: { $gte: startLastMonth, $lte: endLastMonth },
    });
    const lastMonthRefunded = await sumSupplierRevenueLine({
      supplierId: supplierObjectId,
      paymentStatus: "REFUNDED",
      createdAt: { $gte: startLastMonth, $lte: endLastMonth },
    });
    const lastMonthRevenue = netSupplierDisplayRevenue(lastMonthPaid, lastMonthRefunded);

    const activeStatuses = [
      "APPROVED",

      "DELIVERING",

      "RENTING",

      "RETURNING",

      "INSPECTING",
    ];

    const activeRentals = await Rental.countDocuments({
      supplierId: supplierObjectId,

      status: { $in: activeStatuses },
    });

    const avgRatingResult = await Device.aggregate([
      { $match: { supplierId: supplierObjectId, reviewCount: { $gt: 0 } } },

      { $group: { _id: null, avgRating: { $avg: "$ratingAvg" } } },
    ]);

    const avgRating = avgRatingResult[0]?.avgRating || 0;

    const rentalStatusAgg = await Rental.aggregate([
      { $match: { supplierId: supplierObjectId } },

      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const rentalStatusCounts = {};

    rentalStatusAgg.forEach((row) => {
      if (row._id) rentalStatusCounts[row._id] = row.count;
    });

    const categoryAgg = await Device.aggregate([
      {
        $match: {
          supplierId: supplierObjectId,

          isAddon: false,
        },
      },

      { $group: { _id: "$category", count: { $sum: 1 } } },

      { $sort: { count: -1 } },
    ]);

    const categoryBreakdown = categoryAgg.map((item) => ({
      category: item._id || "OTHER",

      count: item.count,
    }));

    const yearStart = new Date(now.getFullYear() - 2, 0, 1);

    const revenueRentals = await Rental.find({
      supplierId: supplierObjectId,

      paymentStatus: { $in: ["PAID", "REFUNDED"] },

      createdAt: { $gte: yearStart, $lte: now },
    }).select("createdAt totalAmount paymentStatus paymentBreakdown");

    const dayBuckets = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(now);

      date.setDate(now.getDate() - (6 - idx));

      return {
        label: formatDayLabel(date),

        start: startOfDay(date),

        end: endOfDay(date),
      };
    });

    const monthBuckets = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);

      return {
        label: formatMonthLabel(date),

        start: new Date(date.getFullYear(), date.getMonth(), 1),

        end: new Date(
          date.getFullYear(),

          date.getMonth() + 1,

          0,

          23,

          59,

          59,

          999,
        ),
      };
    });

    const yearBuckets = Array.from({ length: 3 }, (_, idx) => {
      const year = now.getFullYear() - (2 - idx);

      const date = new Date(year, 0, 1);

      return {
        label: formatYearLabel(date),

        start: new Date(year, 0, 1),

        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    });

    const summarizeBuckets = (buckets) =>
      buckets.map((bucket) => {
        let totalIn = 0;

        let totalOut = 0;

        let rentalsCount = 0;

        revenueRentals.forEach((rental) => {
          if (
            rental.createdAt >= bucket.start &&
            rental.createdAt <= bucket.end
          ) {
            const line =
              rental.paymentBreakdown?.supplierReceive != null
                ? Number(rental.paymentBreakdown.supplierReceive)
                : Number(rental.totalAmount) || 0;

            if (rental.paymentStatus === "PAID") {
              totalIn += line;

              rentalsCount += 1;
            } else if (rental.paymentStatus === "REFUNDED") {
              totalOut += line;
            }
          }
        });

        return {
          label: bucket.label,

          in: totalIn,

          out: totalOut,

          revenue: Math.max(0, totalIn - totalOut),

          rentals: rentalsCount,
        };
      });

    const cashFlow = {
      DAY: summarizeBuckets(dayBuckets).map((b) => ({
        label: b.label,

        in: b.in,

        out: b.out,
      })),

      MONTH: summarizeBuckets(monthBuckets).map((b) => ({
        label: b.label,

        in: b.in,

        out: b.out,
      })),

      YEAR: summarizeBuckets(yearBuckets).map((b) => ({
        label: b.label,

        in: b.in,

        out: b.out,
      })),
    };

    const monthlyBreakdown = summarizeBuckets(monthBuckets).map((item) => ({
      label: item.label,

      revenue: item.revenue,

      rentals: item.rentals,
    }));

    const topDevices = await RentalItem.aggregate([
      {
        $lookup: {
          from: "rentals",

          localField: "rentalId",

          foreignField: "_id",

          as: "rental",
        },
      },

      { $unwind: "$rental" },

      {
        $match: {
          "rental.supplierId": supplierObjectId,

          "rental.paymentStatus": "PAID",
        },
      },

      {
        $group: {
          _id: "$deviceId",

          revenue: { $sum: "$rentPrice" },

          rentals: { $sum: "$quantity" },
        },
      },

      {
        $lookup: {
          from: "devices",

          localField: "_id",

          foreignField: "_id",

          as: "device",
        },
      },

      { $unwind: "$device" },

      { $project: { name: "$device.name", revenue: 1, rentals: 1 } },

      { $sort: { revenue: -1 } },

      { $limit: 4 },
    ]);

    const bottomDevices = await RentalItem.aggregate([
      {
        $lookup: {
          from: "rentals",
          localField: "rentalId",
          foreignField: "_id",
          as: "rental",
        },
      },
      { $unwind: "$rental" },
      {
        $match: {
          "rental.supplierId": supplierObjectId,
          "rental.paymentStatus": "PAID",
        },
      },
      {
        $group: {
          _id: "$deviceId",
          revenue: { $sum: "$rentPrice" },
          rentals: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "devices",
          localField: "_id",
          foreignField: "_id",
          as: "device",
        },
      },
      { $unwind: "$device" },
      { $project: { name: "$device.name", revenue: 1, rentals: 1 } },
      { $sort: { rentals: 1 } },
      { $limit: 4 },
    ]);

    // Booking Trends (Day of week & Hour)
    const trendsAgg = await Rental.aggregate([
      { $match: { supplierId: supplierObjectId } },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$createdAt" }, // 1 (Sun) to 7 (Sat)
            hour: { $hour: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyTrends = Array(7).fill(0);
    const hourlyTrends = Array(24).fill(0);

    trendsAgg.forEach((item) => {
      if (item._id.dayOfWeek) dailyTrends[item._id.dayOfWeek - 1] += item.count;
      if (item._id.hour !== undefined) hourlyTrends[item._id.hour] += item.count;
    });

    // Customer Retention
    const customerAgg = await Rental.aggregate([
      { $match: { supplierId: supplierObjectId } },
      { $group: { _id: "$customerId", count: { $sum: 1 } } },
    ]);
    const totalCustomers = customerAgg.length;
    const returningCustomers = customerAgg.filter((c) => c.count >= 2).length;
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    const recentRentals = await Rental.find({
      supplierId: supplierObjectId,

      paymentStatus: { $in: ["PAID", "REFUNDED"] },
    })

      .populate("customerId", "fullName")

      .sort({ createdAt: -1 })

      .limit(5);

    const transactions = recentRentals.map((rental) => ({
      id: rental._id,

      amount:
        rental.paymentStatus === "REFUNDED"
          ? -rental.totalAmount
          : rental.totalAmount,

      description:
        rental.paymentStatus === "REFUNDED"
          ? `Hoàn tiền đơn thuê #${rental._id.toString().slice(-6)}`
          : `Thanh toán đơn thuê #${rental._id.toString().slice(-6)}`,

      createdAt: rental.createdAt.toLocaleString("vi-VN"),

      status: rental.paymentStatus,

      customerName: rental.customerId?.fullName || "",
    }));

    res.json({
      summary: {
        totalRevenue: netSupplierDisplayRevenue(totalPaid, totalRefunded),

        monthlyRevenue: netSupplierDisplayRevenue(monthlyPaid, monthlyRefunded),

        lastMonthRevenue,

        activeRentals,

        avgRating,

        retentionRate,
      },

      cashFlow,

      monthlyBreakdown,

      topDevices,

      bottomDevices,

      bookingTrends: {
        daily: dailyTrends,
        hourly: hourlyTrends,
      },

      transactions,

      rentalStatusCounts,

      categoryBreakdown,
    });
  } catch (error) {
    console.error("Error getSupplierRevenue:", error);

    res.status(500).json({ message: error.message });
  }
};

// 1. HỦY ĐƠN & HOÀN TIỀN (Chỉ cho PENDING)

// ====================== CANCEL RENTAL - ĐÃ SỬA ======================

exports.cancelRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    const customerId = req.user.id;

    // 1. Tìm rental

    const rental = await Rental.findOne({
      _id: rentalId,

      customerId,
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (rental.status !== "PENDING") {
      throw new Error("Chỉ có thể hủy đơn ở trạng thái PENDING");
    }

    const refundAmount = rental.totalAmount || 0;

    // 2. Hoàn tiền cho khách nếu đã thanh toán

    if (rental.paymentStatus === "PAID" && refundAmount > 0) {
      const customerWallet = await Wallet.findOne({
        user: rental.customerId,
      }).session(session);

      if (customerWallet) {
        const balanceBefore = customerWallet.balance;

        customerWallet.balance += refundAmount;

        await customerWallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: customerWallet._id,

              type: "REFUND",

              amount: refundAmount,

              balanceBefore,

              balanceAfter: customerWallet.balance,

              referenceType: "RENTAL",

              referenceId: rental._id,

              description: `Hoàn tiền hủy đơn #${rental._id

                .toString()

                .slice(-6)}`,

              status: "SUCCESS",
            },
          ],
          { session, ordered: true },
        );
      }

      // Trừ tiền từ ví system để hoàn cho khách (tạo giao dịch giải phóng)

      const systemWallet = await Wallet.findOne({ isSystem: true }).session(
        session,
      );

      if (systemWallet && refundAmount > 0) {
        const sysBefore = systemWallet.balance;

        systemWallet.balance -= refundAmount;

        await systemWallet.save({ session });

        const rentAmount = rental.paymentBreakdown?.rentAmount || 0;

        const platformFee = rental.paymentBreakdown?.platformFee || 0;

        const depositAmt = rental.paymentBreakdown?.depositAmount || 0;

        const deliveryFee = rental.deliveryFee || 0;

        // FIX: netEscrow = rentAmount - platformFee (không cộng deliveryFee

        // vì deliveryFee được lưu riêng trong SHIPPING_FEE transaction)

        const netEscrow = Math.max(0, rentAmount - platformFee);

        let sysRunning = sysBefore;

        if (netEscrow > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "ESCROW_RELEASE",

                amount: -netEscrow,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - netEscrow,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Giải phóng tiền thuê do hủy đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= netEscrow;
        }

        if (depositAmt > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "DEPOSIT_RELEASE",

                amount: -depositAmt,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - depositAmt,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Giải phóng tiền cọc do hủy đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= depositAmt;
        }

        if (platformFee > 0) {
          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "PLATFORM_FEE_REFUND",

                amount: -platformFee,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - platformFee,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Hoàn phí nền tảng do hủy đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= platformFee;

          // Đánh dấu PLATFORM_FEE gốc là đã được hoàn

          await WalletTransaction.updateOne(
            {
              wallet: systemWallet._id,
              type: "PLATFORM_FEE",
              referenceType: "RENTAL",
              referenceId: rental._id,
            },

            {
              $set: {
                rentalStatus: "CANCELLED",
                isEarned: false,
                isRefunded: true,
              },
            },

            { session },
          );
        }

        if (deliveryFee > 0) {
          // Tạo transaction hoàn phí vận chuyển

          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,

                type: "SHIPPING_FEE_REFUND",

                amount: -deliveryFee,

                balanceBefore: sysRunning,

                balanceAfter: sysRunning - deliveryFee,

                referenceType: "RENTAL",

                referenceId: rental._id,

                description: `Hoàn phí vận chuyển do hủy đơn #${rental._id.toString().slice(-6)}`,

                status: "SUCCESS",
              },
            ],
            { session },
          );

          sysRunning -= deliveryFee;

          // Đánh dấu SHIPPING_FEE gốc là đã được hoàn

          await WalletTransaction.updateOne(
            {
              wallet: systemWallet._id,
              type: "SHIPPING_FEE",
              referenceType: "RENTAL",
              referenceId: rental._id,
            },

            {
              $set: {
                rentalStatus: "CANCELLED",
                isEarned: false,
                isRefunded: true,
              },
            },

            { session },
          );
        }
      }
    }

    // 3. Hoàn lại DeviceItem và cập nhật stock Device

    const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(
      session,
    );

    for (const item of rentalItems) {
      if (item.deviceItemIds && item.deviceItemIds.length > 0) {
        await DeviceItem.updateMany(
          { _id: { $in: item.deviceItemIds } },

          { $set: { status: "AVAILABLE" } },

          { session },
        );

        await DeviceItem.updateDeviceCounts(item.deviceId, session);
      }
    }

    // 4. Cập nhật rental - DÙNG $set để tránh validation lỗi paymentBreakdown

    await Rental.updateOne(
      { _id: rentalId },

      {
        $set: {
          status: "CANCELLED",

          paymentStatus: "REFUNDED",

          cancelledAt: new Date(),

          cancelReason: "Khách hàng yêu cầu hủy",

          escrowStatus: "RELEASED",

          depositStatus: "REFUNDED",

          supplierPayoutStatus: "CANCELLED",
        },
      },

      { session },
    );

    // 5. Gửi thông báo

    await sendRentalNotification(
      rental,

      "SUPPLIER",

      "Đơn thuê bị hủy",

      `Khách hàng đã hủy đơn #${rental._id.toString().slice(-6)}.`,
    );

    await sendRentalNotification(
      rental,

      "CUSTOMER",

      "Hủy đơn thành công",

      `Đơn thuê #${rental._id

        .toString()

        .slice(-6)} đã được hủy. Tiền đã hoàn về ví.`,
    );

    await session.commitTransaction();

    try {
      await syncCancelledRental({
        rentalId: rental._id,

        actorId: customerId,
      });
    } catch (syncError) {
      // Keep cancel successful even if handover sync fails; staff can run manual sync endpoint.

      console.error("SYNC CANCEL HANDOVER ERROR:", syncError.message);
    }

    try {
      await syncClosedRental({
        rentalId: rental._id,

        actorId: customerId,
      });
    } catch (syncError) {
      console.error("SYNC CANCEL RETURN ERROR:", syncError.message);
    }

    res.json({
      success: true,

      message: "Hủy đơn thành công và tiền đã được hoàn",
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Cancel Rental Error:", err);

    res.status(400).json({
      success: false,

      message: err.message || "Hủy đơn thất bại",
    });
  } finally {
    session.endSession();
  }
};

// 2. XÁC NHẬN ĐÃ NHẬN HÀNG & CỘNG TIỀN CHO SUPPLIER

exports.confirmReceived = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    const customerId = req.user.id;

    const rental = await Rental.findById(rentalId).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (rental.customerId.toString() !== customerId.toString()) {
      throw new Error("Bạn không có quyền xác nhận đơn này");
    }

    if (!["DELIVERING", "DELIVERED"].includes(rental.status)) {
      throw new Error("Đơn hàng chưa ở trạng thái giao hàng");
    }

    // Kiểm tra đã có biên bản bàn giao hoàn thành chưa (thay vì deliveredAt)

    const completedHandover = await HandoverRecord.findOne({
      rentalId: rental._id,

      status: HANDOVER_STATUS.COMPLETED,

      result: "SUCCESS",
    }).session(session);

    // Nếu status là DELIVERED (đã có staff log biên bản) thì bắt buộc phải có completedHandover

    if (rental.status === "DELIVERED" && !completedHandover) {
      throw new Error("Không tìm thấy biên bản bàn giao hoàn thành");
    }

    rental.status = "RENTING";

    rental.pickedUpAt = new Date();

    rental.deliveredAt =
      completedHandover?.customerConfirmation?.confirmedAt || new Date();

    await rental.save({ session });

    await sendRentalNotification(
      rental,

      "SUPPLIER",

      "Khách đã xác nhận nhận hàng",

      "Khách hàng đã nhận thiết bị, đơn đang trong thời gian thuê.",
    );

    await sendRentalNotification(
      rental,

      "CUSTOMER",

      "Nhận hàng thành công",

      "Bạn đã xác nhận nhận thiết bị. Hãy sử dụng cẩn thận và trả đúng hạn.",
    );

    await session.commitTransaction();

    res.json({ message: "Xác nhận nhận hàng thành công" });
  } catch (err) {
    await session.abortTransaction();

    res.status(400).json({ message: err.message || "Xác nhận thất bại" });
  } finally {
    session.endSession();
  }
};

// Remove the duplicate declaration as it is already declared at the top of the file

// ====================== EXTEND RENTAL - ĐÃ SỬA ======================

// ====================== EXTEND RENTAL - PHIÊN BẢN MẠNH & CÓ LOG ======================

exports.extendRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    let { newEndDate, requestedDays, extraAmount = 0, note = "" } = req.body;

    if (!newEndDate) throw new Error("Vui lòng chọn ngày gia hạn mới");

    const rental = await Rental.findById(rentalId)

      .populate("items")

      .session(session);

    if (!rental) throw new Error("Không tìm thấy đơn thuê");

    if (rental.status !== "RENTING") {
      throw new Error("Chỉ được yêu cầu gia hạn khi đang thuê");
    }

    // === KIỂM TRA NGÀY ===

    let currentEndDateStr = rental.items?.[0]?.rentalEndDate;

    if (!currentEndDateStr) {
      console.error("❌ Không tìm thấy rentalEndDate trong items");

      throw new Error("Không tìm thấy ngày kết thúc hiện tại của đơn");
    }

    const currentEnd = new Date(currentEndDateStr);

    const proposedEnd = new Date(newEndDate);

    if (isNaN(currentEnd.getTime())) {
      console.error("❌ currentEndDate không hợp lệ:", currentEndDateStr);

      throw new Error("Ngày kết thúc hiện tại không hợp lệ");
    }

    if (isNaN(proposedEnd.getTime())) {
      console.error("❌ newEndDate không hợp lệ:", newEndDate);

      throw new Error("Ngày gia hạn mới không hợp lệ");
    }

    if (proposedEnd <= currentEnd) {
      throw new Error("Ngày gia hạn phải sau ngày trả hiện tại");
    }

    const actualRequestedDays = Math.ceil(
      (proposedEnd - currentEnd) / (1000 * 60 * 60 * 24),
    );

    if (actualRequestedDays <= 0) {
      throw new Error("Số ngày gia hạn phải lớn hơn 0");
    }

    // Tự động tính tiền gia hạn dựa trên đơn giá/ngày của các sản phẩm trong đơn
    // (Đảm bảo chuẩn xác thay vì tin tưởng hoàn toàn vào extraAmount từ frontend gửi lên)
    const dailyRate = (rental.items || []).reduce((sum, item) => {
      const days = item.totalDays || 1;
      const unitDailyRate = (item.rentPrice || 0) / days;
      return sum + unitDailyRate;
    }, 0);

    const calculatedExtraAmount = Math.round(dailyRate * actualRequestedDays);
    const extraAmountNum = calculatedExtraAmount;

    // Kiểm tra báo cáo trùng lặp - đã có yêu cầu gia hạn đang xử lý cho đơn này chưa

    const existingRequest = await ExtensionRequest.findOne({
      rentalId: rental._id,

      status: { $in: ["PENDING", "PROCESSING"] },
    });

    if (existingRequest) {
      throw new Error(
        "Đã có yêu cầu gia hạn đang được xử lý cho đơn này. Vui lòng chờ kết quả xử lý trước khi gửi yêu cầu mới.",
      );
    }

    // === XỬ LÝ THANH TOÁN TỪ VÍ ===

    let customerWalletTxId = null;

    let adminWalletTxId = null;

    let paymentStatus = "UNPAID";

    if (extraAmountNum > 0) {
      // Lấy ví khách hàng

      const customerWallet = await Wallet.findOne({
        user: rental.customerId,
      }).session(session);

      if (!customerWallet) {
        throw new Error("Không tìm thấy ví của khách hàng");
      }

      if (customerWallet.balance < extraAmountNum) {
        throw new Error(
          `Số dư ví không đủ. Cần ${extraAmountNum.toLocaleString()}đ, hiện có ${customerWallet.balance.toLocaleString()}đ`,
        );
      }

      // Trừ tiền từ ví khách

      const custBalanceBefore = customerWallet.balance;

      customerWallet.balance -= extraAmountNum;

      await customerWallet.save({ session });

      // Tạo giao dịch trừ tiền khách

      const custTx = await WalletTransaction.create(
        [
          {
            wallet: customerWallet._id,

            type: "PAYMENT",

            amount: -extraAmountNum,

            balanceBefore: custBalanceBefore,

            balanceAfter: customerWallet.balance,

            referenceType: "RENTAL",

            referenceId: rental._id,

            description: `Thanh toán phí gia hạn đơn thuê #${rental._id.toString().slice(-6)}`,

            status: "SUCCESS",
          },
        ],

        { session },
      );

      customerWalletTxId = custTx[0]._id;

      paymentStatus = "PAID";
    }

    // Tạo yêu cầu gia hạn

    const extensionRequest = await ExtensionRequest.create(
      [
        {
          rentalId: rental._id,

          customerId: rental.customerId,

          supplierId: rental.supplierId,

          requestedEndDate: proposedEnd,

          requestedDays: actualRequestedDays,

          proposedExtraAmount: extraAmountNum,

          note: note.trim(),

          status: "PENDING",

          paymentStatus: paymentStatus,

          customerWalletTransactionId: customerWalletTxId,

          adminWalletTransactionId: adminWalletTxId,
        },
      ],
      { session, ordered: true },
    );

    // Cập nhật trạng thái rental

    await Rental.updateOne(
      { _id: rentalId },

      { $set: { extensionStatus: "PENDING" } },

      { session },
    );

    // Gửi thông báo

    await NotificationConfig.sendNotification({
      senderId: rental.customerId,

      receiverId: rental.supplierId,

      title: "Yêu cầu gia hạn đơn thuê",

      message: `Khách hàng yêu cầu gia hạn thêm ${actualRequestedDays} ngày đến ${proposedEnd.toLocaleDateString(
        "vi-VN",
      )}. Phí đề xuất: ${extraAmountNum.toLocaleString()}đ`,

      link: `/supplier/orders/${rental._id}`,

      type: "ORDER",
    });

    await session.commitTransaction();

    res.status(201).json({
      success: true,

      message: "Yêu cầu gia hạn đã được gửi thành công",

      extensionRequest: extensionRequest[0],
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Extend Rental Error:", err);

    res.status(400).json({
      success: false,

      message: err.message || "Gửi yêu cầu gia hạn thất bại",
    });
  } finally {
    session.endSession();
  }
};

exports.startDelivery = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const supplierId = req.user.id;

    const rental = await Rental.findById(rentalId);

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.supplierId.toString() !== supplierId.toString()) {
      return res

        .status(403)

        .json({ message: "Bạn không có quyền thao tác đơn này" });
    }

    if (rental.status !== "PENDING") {
      return res.status(400).json({
        message: "Chỉ có thể bắt đầu giao khi đơn đang chờ xử lý",
      });
    }

    if (rental.paymentStatus !== "PAID") {
      return res.status(400).json({
        message: "Đơn chưa thanh toán, không thể bắt đầu giao hàng",
      });
    }

    const rentalItems = await RentalItem.find({ rentalId: rental._id });

    if (!rentalItems.length) {
      return res
        .status(400)
        .json({ message: "Đơn không có chi tiết thiết bị" });
    }

    if (!isRentalPeriodStillOpenForDelivery(rentalItems)) {
      return res.status(400).json({
        message:
          "Kỳ thuê đã kết thúc theo lịch đặt. Vui lòng từ chối đơn hoặc liên hệ khách hàng để đặt lại.",
      });
    }

    // 1️⃣ update rental status

    rental.status = "DELIVERING";

    rental.assignedOperationStaffId = null;

    rental.assignmentLockedAt = null;

    await rental.save();

    /** Snapshot chỉ để hiển thị; payout thực tế dùng buildCanonicalPaymentBreakdown khi settle. */
    const paymentBreakdown = buildCanonicalPaymentBreakdown(rental);

    // Use $set to avoid validation issues

    await Rental.updateOne(
      { _id: rentalId },

      {
        $set: {
          status: "DELIVERING",

          paymentBreakdown,
        },
      },
    );

    await sendRentalNotification(
      rental,

      "CUSTOMER",

      "Đơn thuê đang được giao",

      "Nhà cung cấp đã bắt đầu giao hàng. Vui lòng theo dõi trạng thái.",

      "",

      "ORDER",
    );

    // 2️⃣ create contract DELIVERY

    const contract = await Contract.create({
      rentalId: rental._id,

      contractType: "DELIVERY",

      status: "DRAFT",

      deliveryMethod: rental.deliveryFee > 0 ? "SHIP" : "HANDOVER",

      location: rental.deliveryAddress?.fullAddress || "",
    });

    // 3️⃣ create contract items (reuse rentalItems already fetched above)

    const contractItems = rentalItems.map((item) => ({
      contractId: contract._id,

      rentalItemId: item._id,

      deviceId: item.deviceId,

      quantity: item.quantity,

      conditionBefore: item.conditionBeforeRent,
    }));

    await ContractItem.insertMany(contractItems);

    const activeTask = await DeliveryTask.findOne({
      rentalId: rental._id,

      type: "DELIVERY",

      status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
    });

    let task = activeTask;

    if (!task) {
      task = await DeliveryTask.create({
        rentalId: rental._id,

        deviceIds: rentalItems.map((item) => item.deviceId),

        type: "DELIVERY",

        status: "PENDING",
      });
    }

    console.log(`[RentalController] Emitting operationStaffUpdate for rental ${rental._id}`);
    emitOperationStaffUpdate({
      action: "DELIVERY_STARTED",

      message: `Nhà cung cấp đã mở giao hàng — có đơn mới cần xử lý.`,

      rentalId: String(rental._id),

      deliveryTaskId: task?._id ? String(task._id) : undefined,

      deviceLabel: rentalItems[0]?.deviceId?.name || "Thiết bị",

      actorId: supplierId,
    });

    // Gửi thông báo chính thức lưu vào database cho toàn bộ OPERATION_STAFF
    console.log(`[RentalController] Sending notifications to all OPERATION_STAFF for rental ${rental._id}`);
    await NotificationConfig.sendNotificationToRole({
      senderId: supplierId,
      role: "OPERATION_STAFF",
      title: "Nhiệm vụ giao hàng mới",
      message: `Đơn thuê ${rentalId.slice(-6).toUpperCase()} (${rentalItems[0]?.deviceId?.name || "Thiết bị"}) đã sẵn sàng để giao.`,
      link: `/staff/tasks`, // Giả định link cho staff
      type: "ORDER",
    });

    return res.status(200).json({
      message: "Delivery started & contract created",

      contractId: contract._id,

      deliveryTaskId: task?._id,
    });
  } catch (err) {
    console.error("Start delivery error:", err);

    console.error("Error details:", err.message);

    console.error("Error stack:", err.stack);

    res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
};

exports.confirmPickup = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const actorId = req.user?.id;

    const actorRole = req.user?.role;

    const rental = await Rental.findById(rentalId);

    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (actorRole === "OPERATION_STAFF") {
      if (!rental.assignedOperationStaffId) {
        return res
          .status(409)
          .json({ message: "Đơn chưa có staff nhận. Vui lòng nhận đơn trước" });
      }

      if (String(rental.assignedOperationStaffId) !== String(actorId)) {
        return res
          .status(403)
          .json({ message: "Đơn đã được lock cho staff khác" });
      }
    }

    if (rental.status !== "DELIVERING")
      return res

        .status(400)

        .json({ message: "Rental is not in DELIVERING status" });

    if (rental.pickedUpAt)
      return res.status(400).json({ message: "Pickup already confirmed" });

    rental.pickedUpAt = new Date();

    await rental.save();

    const deliveryTask = await DeliveryTask.findOneAndUpdate(
      {
        rentalId: rental._id,

        type: "DELIVERY",

        status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
      },

      {
        $set: {
          deliveryStaffId: rental.assignedOperationStaffId || actorId,

          claimedAt: new Date(),

          status: "IN_TRANSIT",
        },
      },

      { new: true },
    );

    const handover = await ensureDraftForDelivery({
      rentalId: rental._id,

      deliveryTaskId: deliveryTask?._id,

      staffId: rental.assignedOperationStaffId || actorId,

      actorId,
    });

    emitOperationStaffUpdate({
      action: "PICKUP_CONFIRMED",

      message: "Đã xác nhận lấy hàng — danh sách nhiệm vụ cập nhật.",

      rentalId: String(rental._id),

      actorId: String(actorId),
    });

    return res

      .status(200)

      .json({
        message: "Pickup confirmed",

        pickedUpAt: rental.pickedUpAt,

        handoverId: handover?._id,
      });
  } catch (err) {
    console.error(err);

    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Quyết toán trả hàng (payout, hoàn cọc net, biên bản return) — dùng chung.
 * @param {import("mongoose").ClientSession} session
 * @param {boolean} [options.requireApprovedCompensation] — bắt buộc đã có CompensationProposal ADMIN_APPROVED (bước đóng sau bồi thường)
 */
async function executeConfirmReturnSettlement(session, req, options = {}) {
  const { requireApprovedCompensation = false } = options;

  const { rentalId } = req.params;

  const rental = await Rental.findById(rentalId).session(session);

  const actorId = req.user?.id;

  const actorRole = req.user?.role;

  if (!rental) throw new Error("Không tìm thấy đơn thuê");

  if (actorRole === "OPERATION_STAFF") {
    if (!rental.assignedOperationStaffId) {
      throw new Error("Đơn chưa có staff được phân công");
    }

    if (String(rental.assignedOperationStaffId) !== String(actorId)) {
      throw new Error("Đơn đang được lock cho staff khác");
    }
  }

  if (requireApprovedCompensation) {
    const approvedExists = await CompensationProposal.findOne({
      rentalId: rental._id,
      flowStatus: "ADMIN_APPROVED",
    })
      .select("_id")
      .session(session)
      .lean();
    if (!approvedExists) {
      throw new Error(
        "Chưa có đề xuất bồi thường ở trạng thái admin đã duyệt. Hãy duyệt bồi thường trước, hoặc dùng POST /confirm-return thay cho bước này."
      );
    }
    compensationAuditLog("CONFIRM_RETURN_AFTER_COMPENSATION", {
      rentalId: String(rental._id),
    });
  }

  if (rental.status !== "RETURNING") {
    throw new Error("Đơn chưa ở trạng thái trả hàng");
  }

  const parsedBody = req.body || {};

  const requestedInspection = tryParseJsonField(parsedBody.inspection);

  const requestedSettlement = tryParseJsonField(parsedBody.settlement);

  const uploadedUrls = extractUploadedUrls(req.files);

  const returnDraft = await ensureDraftForReturn({
    rentalId: rental._id,

    staffId: actorId,

    actorId,

    session,
  });

  // Giả sử đã kiểm tra thiết bị OK (không hỏng, không forfeit deposit)

  // → Payout tiền thuê cho supplier (sau trừ phí nền tảng): luôn tính lại từ field gốc, không tin paymentBreakdown DB
  const canonicalBreakdown = buildCanonicalPaymentBreakdown(rental);
  const platformFee = canonicalBreakdown.platformFee;
  const supplierReceive = canonicalBreakdown.supplierReceive;

  const escrowReleaseAmount = supplierReceive;

  const supplierWallet = await Wallet.findOne({
    user: rental.supplierId,
  }).session(session);

  if (!supplierWallet) throw new Error("Không tìm thấy ví supplier");

  const supBefore = supplierWallet.balance;

  supplierWallet.balance += supplierReceive;

  await supplierWallet.save({ session });

  await WalletTransaction.create(
    [
      {
        wallet: supplierWallet._id,

        type: "PAYOUT",

        amount: supplierReceive,

        balanceBefore: supBefore,

        balanceAfter: supplierWallet.balance,

        referenceType: "RENTAL",

        referenceId: rental._id,

        description: `Payout tiền thuê đơn #${rental._id

          .toString()

          .slice(-6)}`,

        status: "SUCCESS",
      },
    ],

    { session, ordered: true },
  );

  // Tổng cọc đã chuyển cho NCC khi admin duyệt bồi thường (REQUEST_GX_REVIEW + cọc HELD) — khớp compensationWalletSettlementService
  const [depositCompRow] = await CompensationProposal.aggregate([
    { $match: { rentalId: rental._id, flowStatus: "ADMIN_APPROVED" } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$deductedFromDepositAmount", 0] } } } },
  ]).session(session);
  const totalDepositUsedForCompensation = Math.max(0, depositCompRow?.total || 0);
  const depositRefundToCustomer = Math.max(
    0,
    rental.depositAmount - totalDepositUsedForCompensation
  );
  compensationAuditLog("CONFIRM_RETURN_DEPOSIT", {
    rentalId: String(rental._id),
    depositOnRecord: rental.depositAmount,
    totalDepositUsedForCompensation,
    depositRefundToCustomer,
  });

  // Hoàn cọc cho khách (nếu không forfeit) — phần còn trong escrow sau trừ bồi thường từ cọc (nếu có)

  if (depositRefundToCustomer > 0) {
    const customerWallet = await Wallet.findOne({
      user: rental.customerId,
    }).session(session);

    if (customerWallet) {
      const custBefore = customerWallet.balance;

      customerWallet.balance += depositRefundToCustomer;

      await customerWallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: customerWallet._id,

            type: "DEPOSIT_REFUND",

            amount: depositRefundToCustomer,

            balanceBefore: custBefore,

            balanceAfter: customerWallet.balance,

            referenceType: "RENTAL",

            referenceId: rental._id,

            description:
              totalDepositUsedForCompensation > 0
                ? `Hoàn cọc còn lại (đã trừ bồi thường từ cọc) đơn #${rental._id.toString().slice(-6)}`
                : `Hoàn cọc đơn #${rental._id.toString().slice(-6)}`,

            status: "SUCCESS",
          },
        ],
        { session, ordered: true },
      );
    }
  }

  // TRỪ tiền từ ví admin (escrow) để trả cho supplier và hoàn cọc khách

  const adminWallet = await Wallet.findOne({ isSystem: true }).session(
    session,
  );

  if (!adminWallet) throw new Error("Không tìm thấy ví hệ thống (admin)");

  const totalDeductFromAdmin = supplierReceive + depositRefundToCustomer;

  const adminBefore = adminWallet.balance;

  if (adminWallet.balance < totalDeductFromAdmin) {
    throw new Error("Số dư ví admin không đủ để thực hiện thanh toán");
  }

  // Kinh phí admin thực nhận (Phí sàn + Phí vận chuyển)
  const adminEarned = (platformFee || 0) + (rental.deliveryFee || 0);

  // LUỒNG DI CHUYỂN TIỀN:
  // 1. Trừ tiền payout/refund khỏi ví admin (tiền rời khỏi hệ thống)
  // 2. Phần phí admin (Phí sàn + Ship) vẫn nằm trong balance, chỉ cần chuyển sang availableBalance
  
  adminWallet.balance -= totalDeductFromAdmin; 
  const oldAvailable = adminWallet.availableBalance || 0;
  adminWallet.availableBalance = oldAvailable + adminEarned;

  await adminWallet.save({ session });

  // Cập nhật các bút toán treo cũ (tạo từ lúc checkout) thành đã thực thu
  // Điều này giúp tránh tạo duplicate transaction mà vẫn hạch toán đúng doanh thu
  await WalletTransaction.updateMany(
    { 
      referenceType: "RENTAL", 
      referenceId: rental._id, 
      type: { $in: ["PLATFORM_FEE", "SHIPPING_FEE", "ESCROW_HOLD", "DEPOSIT_HOLD"] },
      isEarned: false 
    },
    { 
      $set: { 
        isEarned: true, 
        rentalStatus: "COMPLETED" 
      } 
    },
    { session }
  );

  // Ví hệ thống: một dòng giải phóng escrow tiền thuê (net sau phí) + một dòng giải phóng cọc.
  // Không ghi thêm PAYOUT trên ví admin: tiền đó đã rời escrow ở ESCROW_RELEASE; PAYOUT (+) chỉ trên ví supplier.
  const afterEscrow = adminBefore - escrowReleaseAmount;

  await WalletTransaction.create(
    [
      {
        wallet: adminWallet._id,

        type: "ESCROW_RELEASE",

        amount: -escrowReleaseAmount,

        balanceBefore: adminBefore,

        balanceAfter: afterEscrow,

        referenceType: "RENTAL",

        referenceId: rental._id,

        description: `Giải phóng tiền thuê tạm giữ (trả NCC) đơn #${rental._id.toString().slice(-6)}`,

        status: "SUCCESS",
      },

      {
        wallet: adminWallet._id,

        type: "DEPOSIT_RELEASE",

        amount: -depositRefundToCustomer,

        balanceBefore: afterEscrow,

        balanceAfter: adminWallet.balance,

        referenceType: "RENTAL",

        referenceId: rental._id,

        description:
          totalDepositUsedForCompensation > 0
            ? `Giải phóng tiền cọc còn lại (đã chuyển bồi thường) đơn #${rental._id.toString().slice(-6)}`
            : `Giải phóng tiền cọc đơn #${rental._id.toString().slice(-6)}`,

        status: "SUCCESS",
      },
    ],
    { session, ordered: true },
  );

  // Cập nhật trạng thái cuối
  rental.status = "COMPLETED";

  rental.depositStatus = "REFUNDED";

  rental.supplierPayoutStatus = "PAID";

  rental.escrowStatus = "RELEASED";

  rental.paymentBreakdown = {
    rentAmount: canonicalBreakdown.rentAmount,

    depositAmount: canonicalBreakdown.depositAmount,

    platformFee,

    supplierReceive,
  };

  await rental.save({ session });

  // Cộng điểm thưởng và cập nhật rank cho khách hàng (10,000đ = 100 điểm)
  const rankUpdateResult = await updatePointsAndRank(rental.customerId, canonicalBreakdown.rentAmount, session);
  rental._rankUpdate = rankUpdateResult; // Lưu tạm để dùng cho notification ở ngoài

  // Cập nhật trạng thái DeviceItems sang AVAILABLE

  const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(
    session,
  );

  for (const rItem of rentalItems) {
    if (rItem.deviceItemIds && rItem.deviceItemIds.length > 0) {
      await DeviceItem.updateMany(
        { _id: { $in: rItem.deviceItemIds } },

        { $set: { status: "AVAILABLE" } },

        { session },
      );
    }
  }

  const settlementPayload = requireApprovedCompensation
    ? {
      depositOutcome:
        rental.depositAmount > 0
          ? totalDepositUsedForCompensation > 0
            ? "REFUND_PARTIAL"
            : "REFUND_FULL"
          : undefined,
      deductedAmount: totalDepositUsedForCompensation,
      disputeReason: "",
      operatorNote: "Hoàn tất thu hồi sau khi admin đã chốt bồi thường (đóng case).",
      ...(requestedSettlement || {}),
    }
    : {
      depositOutcome: rental.depositAmount > 0 ? "REFUND_FULL" : undefined,
      deductedAmount: 0,
      disputeReason: "",
      operatorNote: "Hoàn tất thu hồi - không phát hiện bất thường.",
      ...(requestedSettlement || {}),
    };

  await completeReturn({
    returnRecordId: returnDraft._id,

    inspection: {
      ...(returnDraft?.inspection || {}),

      ...(requestedInspection || {}),

      actualReturnedAt: requestedInspection?.actualReturnedAt || new Date(),

      evidenceUrls: [
        ...(Array.isArray(requestedInspection?.evidenceUrls)
          ? requestedInspection.evidenceUrls
          : []),

        ...uploadedUrls,
      ],
    },

    settlement: settlementPayload,

    staffId: actorId,

    actorId,

    session,
  });

  return {
    rental,
    returnDraft,
    supplierReceive,
    depositRefundToCustomer,
    totalDepositUsedForCompensation,
    actorId,
    requireApprovedCompensation,
  };
}

exports.turn = exports.confirmReturn = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const out = await executeConfirmReturnSettlement(session, req, {
      requireApprovedCompensation: false,
    });
    const { rental, returnDraft, supplierReceive } = out;
    const actorId = out.actorId;

    let customerMessage = `Thiết bị đã được thu hồi thành công. Cọc đã được hoàn về ví của bạn.`;
    if (rental._rankUpdate) {
      customerMessage += ` Bạn đã nhận được ${rental._rankUpdate.pointsToAdd} điểm thưởng.`;
      if (rental._rankUpdate.isRankUp) {
        customerMessage += ` Chúc mừng bạn đã thăng hạng lên ${rental._rankUpdate.newRank}!`;
      }
    }
    customerMessage += ` Cảm ơn bạn!`;

    await sendRentalNotification(
      rental,

      "CUSTOMER",

      "Đơn thuê đã hoàn thành",

      customerMessage,
    );

    await sendRentalNotification(
      rental,

      "SUPPLIER",

      "Đơn hoàn tất - Đã nhận tiền thuê",

      `Bạn đã nhận được ${supplierReceive.toLocaleString(
        "vi-VN",
      )}₫ tiền thuê từ đơn #${rental._id.toString().slice(-6)}.`,
    );

    await session.commitTransaction();

    emitOperationStaffUpdate({
      action: "RETURN_COMPLETED",

      message: "Một đơn vừa hoàn tất thu hồi.",

      rentalId: String(rental._id),

      actorId: String(actorId),
    });

    res.status(200).json({
      message: "Đơn thuê đã hoàn tất thành công",

      rentalId: rental._id,

      status: "COMPLETED",

      returnRecordId: returnDraft._id,
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Confirm Return Error:", err);

    res

      .status(400)

      .json({ message: err.message || "Xác nhận trả hàng thất bại" });
  } finally {
    session.endSession();
  }
};

/** Giống confirm-return nhưng bắt buộc đã có bồi thường admin duyệt — dùng khi muốn “đóng case” rõ ràng sau bồi thường. */
exports.confirmReturnAfterCompensation = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const out = await executeConfirmReturnSettlement(session, req, {
      requireApprovedCompensation: true,
    });
    const { rental, returnDraft, supplierReceive, totalDepositUsedForCompensation } = out;
    const actorId = out.actorId;

    let customerBody = totalDepositUsedForCompensation > 0
        ? `Thiết bị đã thu hồi. Phần cọc còn lại (sau bồi thường admin đã duyệt) đã hoàn về ví.`
        : `Thiết bị đã được thu hồi thành công. Cọc đã được hoàn về ví của bạn.`;
    
    if (rental._rankUpdate) {
      customerBody += ` Bạn đã nhận được ${rental._rankUpdate.pointsToAdd} điểm thưởng.`;
      if (rental._rankUpdate.isRankUp) {
        customerBody += ` Chúc mừng bạn đã thăng hạng lên ${rental._rankUpdate.newRank}!`;
      }
    }
    customerBody += ` Cảm ơn bạn!`;

    await sendRentalNotification(
      rental,

      "CUSTOMER",

      "Đơn thuê đã hoàn thành (sau bồi thường)",

      customerBody,
    );

    await sendRentalNotification(
      rental,

      "SUPPLIER",

      "Đơn hoàn tất - Đã nhận tiền thuê",

      `Bạn đã nhận được ${supplierReceive.toLocaleString(
        "vi-VN",
      )}₫ tiền thuê từ đơn #${rental._id.toString().slice(-6)}.`,
    );

    await session.commitTransaction();

    emitOperationStaffUpdate({
      action: "RETURN_COMPLETED",

      message: "Hoàn tất thu hồi (đóng case sau bồi thường).",

      rentalId: String(rental._id),

      actorId: String(actorId),
    });

    res.status(200).json({
      message: "Đã đóng case: quyết toán thu hồi sau khi admin duyệt bồi thường.",

      rentalId: rental._id,

      status: "COMPLETED",

      returnRecordId: returnDraft._id,

      afterCompensationClosure: true,
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Confirm Return After Compensation Error:", err);

    res

      .status(400)

      .json({ message: err.message || "Đóng case sau bồi thường thất bại" });
  } finally {
    session.endSession();
  }
};

exports.repayRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    const customerId = req.user.id;

    // Tìm rental đại diện

    const rental = await Rental.findOne({
      _id: rentalId,

      customerId,

      paymentStatus: "UNPAID",

      status: "PENDING",
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn chờ thanh toán hợp lệ");
    }

    let rentalsToRepay = [rental];

    let totalAmount = rental.totalAmount;

    // Nếu có orderCode cũ (từ checkout group) → tìm toàn bộ group

    if (rental.orderCode) {
      rentalsToRepay = await Rental.find({
        orderCode: rental.orderCode,

        customerId,

        paymentStatus: "UNPAID",
      }).session(session);

      // Tính tổng amount của group

      totalAmount = rentalsToRepay.reduce((sum, r) => sum + r.totalAmount, 0);
    }

    // Tạo orderCode mới (riêng cho lần repay này)

    const newOrderCode = Number(String(Date.now()).slice(-9));

    // Tạo payment link PayOS

    const paymentLinkData = await payos.paymentRequests.create({
      orderCode: newOrderCode,

      amount: totalAmount,

      description: `GXP repay #${rental._id.toString().slice(-6)}



 



      `,

      returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${rental._id}`,

      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${rental._id}`,
    });

    if (!paymentLinkData?.checkoutUrl) {
      throw new Error("Không thể tạo link thanh toán PayOS");
    }

    // Cập nhật orderCode mới cho TOÀN BỘ group (hoặc single)

    await Rental.updateMany(
      { _id: { $in: rentalsToRepay.map((r) => r._id) } },

      { orderCode: newOrderCode },

      { session },
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,

      message: `Đã tạo link thanh toán mới cho ${rentalsToRepay.length} đơn`,

      paymentLink: paymentLinkData.checkoutUrl,

      amount: totalAmount,

      orderCode: newOrderCode,

      rentalId: rental._id, // đại diện

      isGroup: rentalsToRepay.length > 1,
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Repay Rental Error:", err);

    res.status(400).json({
      success: false,

      message: err.message || "Không thể tạo thanh toán lại",
    });
  } finally {
    session.endSession();
  }
};

exports.cancelPayRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    const customerId = req.user.id;

    // Tìm rental đại diện

    const rental = await Rental.findOne({
      _id: rentalId,

      customerId,
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    // Tìm toàn bộ group (nếu có orderCode)

    let rentalsToCancel = [rental];

    if (rental.orderCode) {
      rentalsToCancel = await Rental.find({
        orderCode: rental.orderCode,

        customerId,

        status: { $in: ["PENDING", "UNPAID"] },
      }).session(session);
    }

    if (rentalsToCancel.length === 0) {
      throw new Error("Không có đơn hàng nào có thể hủy");
    }

    // Chỉ cập nhật status CANCELLED cho toàn bộ group

    await Rental.updateMany(
      { _id: { $in: rentalsToCancel.map((r) => r._id) } },

      {
        status: "CANCELLED",

        cancelledAt: new Date(),

        cancelReason: "Khách hàng hủy từ trang thanh toán thất bại",
      },

      { session },
    );

    await session.commitTransaction();

    for (const item of rentalsToCancel) {
      try {
        await syncCancelledRental({
          rentalId: item._id,

          actorId: customerId,
        });
      } catch (syncError) {
        console.error("SYNC CANCEL HANDOVER ERROR:", syncError.message);
      }

      try {
        await syncClosedRental({
          rentalId: item._id,

          actorId: customerId,
        });
      } catch (syncError) {
        console.error("SYNC CANCEL RETURN ERROR:", syncError.message);
      }
    }

    res.json({
      success: true,

      message: `Đã hủy thành công ${rentalsToCancel.length} đơn hàng`,
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Cancel Rental Error:", err);

    res.status(400).json({
      success: false,

      message: err.message || "Hủy đơn thất bại",
    });
  } finally {
    session.endSession();
  }
};

exports.repaySingleRental = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const { rentalId } = req.params;

    const customerId = req.user.id;

    // Tìm rental cụ thể, đảm bảo UNPAID + PENDING

    const rental = await Rental.findOne({
      _id: rentalId,

      customerId,

      paymentStatus: "UNPAID",

      status: "PENDING",
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn chờ thanh toán hợp lệ");
    }

    // Luôn chỉ xử lý single rental

    const rentalsToRepay = [rental];

    const totalAmount = rental.totalAmount;

    // Tạo orderCode mới riêng cho rental này

    const newOrderCode = Number(String(Date.now()).slice(-9));

    // Tạo payment link PayOS chỉ cho rental này

    const paymentLinkData = await payos.paymentRequests.create({
      orderCode: newOrderCode,

      amount: totalAmount,

      description: `GXP repay single #${rental._id.toString().slice(-6)}`,

      returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${rental._id}`,

      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${rental._id}`,
    });

    if (!paymentLinkData?.checkoutUrl) {
      throw new Error("Không thể tạo link thanh toán PayOS");
    }

    // Cập nhật orderCode mới CHỈ cho rental này

    // Lưu ý: dùng updateOne để tránh trigger validation full-doc (một số rental cũ có thể thiếu paymentBreakdown)

    await Rental.updateOne(
      { _id: rental._id },

      { $set: { orderCode: newOrderCode } },

      { session },
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,

      message: "Đã tạo link thanh toán mới cho đơn lẻ này",

      paymentLink: paymentLinkData.checkoutUrl,

      amount: totalAmount,

      orderCode: newOrderCode,

      rentalId: rental._id,

      isGroup: false,
    });
  } catch (err) {
    await session.abortTransaction();

    console.error("Repay Single Rental Error:", err);

    res.status(400).json({
      success: false,

      message: err.message || "Không thể tạo thanh toán lại cho đơn lẻ",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Cập nhật điểm thưởng và hạng thành viên khi đơn hàng hoàn tất.
 * 10,000 VND = 100 điểm (tương đương 100đ = 1 điểm).
 */
async function updatePointsAndRank(customerId, rentAmount, session) {
  try {
    const pointsToAdd = Math.floor(rentAmount / 100);
    if (pointsToAdd <= 0) return null;

    const user = await User.findById(customerId).session(session);
    if (!user) return null;

    const oldPoints = user.rewardPoints || 0;
    user.rewardPoints = oldPoints + pointsToAdd;

    let newRank = 'BRONZE';
    const totalPoints = user.rewardPoints;
    
    if (totalPoints >= 20000) newRank = 'DIAMOND';
    else if (totalPoints >= 10000) newRank = 'PLATINUM';
    else if (totalPoints >= 5000) newRank = 'GOLD';
    else if (totalPoints >= 1000) newRank = 'SILVER';

    const oldRank = user.rank;
    const isRankUp = oldRank !== newRank;
    if (isRankUp) {
      user.rank = newRank;
      console.log(`[RankUp] User ${user.fullName} (${customerId}) promoted from ${oldRank} to ${newRank}`);
    }

    await user.save({ session });
    console.log(`[Points] Added ${pointsToAdd} points to User ${customerId}. Total: ${user.rewardPoints}, Rank: ${user.rank}`);
    
    return {
      pointsToAdd,
      oldRank,
      newRank,
      isRankUp,
      totalPoints: user.rewardPoints
    };
  } catch (error) {
    console.error("Error updating points/rank:", error);
    return null;
  }
}

// Export helper function for cron jobs

exports.sendRentalNotification = sendRentalNotification;
exports.executeConfirmReturnSettlement = executeConfirmReturnSettlement;
