const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const User = require("../../models/User");
const WithdrawRequest = require("../../models/WithdrawRequest");
const Payment = require("../../models/Payment");
const Payment = require("../../models/Payment");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");
const { transferMoney } = require("../Wallet/PayOsController");
const { PayOS } = require("@payos/node");

// Init PayOS for admin
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);
const { PayOS } = require("@payos/node");

// Init PayOS for admin
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// Helper function to get transaction type label
function getTransactionTypeLabel(type, metadata) {
  // Check if this is a transfer transaction with metadata
  if (metadata?.transferType) {
    const transferLabels = {
      'TRANSFER': 'Chuyển tiền',
      'SUPPLIER_PAYOUT': 'Trả tiền NCC',
      'CUSTOMER_REFUND': 'Hoàn tiền KH',
      'BONUS': 'Thưởng'
    };
    return transferLabels[metadata.transferType] || metadata.transferType;
  }
  
  const labels = {
    'TOP_UP': 'Nạp tiền',
    'PAYMENT': 'Thanh toán',
    'REFUND': 'Hoàn tiền',
    'WITHDRAW': 'Rút tiền',
    'ADJUSTMENT': 'Điều chỉnh',
    'PLATFORM_FEE': 'Phí nền tảng',
    'PLATFORM_FEE_REFUND': 'Hoàn phí nền tảng',
    'PAYOUT': 'Chi trả',
    'DEPOSIT_REFUND': 'Hoàn tiền cọc'
  };
  return labels[type] || type;
}

/**
 * POST /api/admin/wallet/adjust-balance
 * Manually adjust admin wallet balance (for corrections)
 */
exports.adjustWalletBalance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, reason, type } = req.body;
    const adminId = req.user.id;


    // Validate input
    if (!amount || isNaN(amount) || amount === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    if (!reason || reason.trim().length < 5) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Lý do điều chỉnh phải có ít nhất 5 ký tự" });
    }

    // Find system wallet
    let adminWallet = await Wallet.findOne({ isSystem: true }).session(session);
    
    if (!adminWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy ví hệ thống" });
    }

    const balanceBefore = adminWallet.balance;
    const balanceAfter = balanceBefore + parseFloat(amount);


    // Update wallet balance
    adminWallet.balance = balanceAfter;
    await adminWallet.save({ session });

    // Create adjustment transaction
    const transaction = await WalletTransaction.create([{
      wallet: adminWallet._id,
      type: "ADJUSTMENT", // Use existing enum value
      amount: parseFloat(amount),
      balanceBefore,
      balanceAfter,
      referenceType: "SYSTEM",
      description: `Điều chỉnh số dư: ${reason}`,
      status: "SUCCESS",
      metadata: {
        adminId,
        adjustmentReason: reason,
        adjustmentType: type || "MANUAL"
      }
    }], { session, ordered: true });


    await session.commitTransaction();

    res.json({
      success: true,
      message: "Điều chỉnh số dư thành công",
      transaction: transaction[0],
      newBalance: balanceAfter
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Adjust wallet balance error:", error);
    res.status(500).json({ message: "Lỗi khi điều chỉnh số dư", error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/admin/wallet/manual-transaction
 * Create a manual transaction entry
 */
exports.createManualTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      type, 
      amount, 
      description, 
      referenceType, 
      referenceId,
      targetWalletId,
      updateBalance = true // Default: update wallet balance
    } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!type || !amount || !description) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Thiếu thông tin bắt buộc",
        required: ["type", "amount", "description"]
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    // Validate transaction type against model enum
    const validTypes = [
      "TOP_UP", "PAYMENT", "REFUND", "WITHDRAW", "ADJUSTMENT",
      "PLATFORM_FEE", "PLATFORM_FEE_REFUND", "PAYOUT", "DEPOSIT_REFUND"
    ];
    if (!validTypes.includes(type)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Loại giao dịch không hợp lệ",
        validTypes
      });
    }

    // Validate reference type if provided
    const validReferenceTypes = ["ORDER", "RENTAL", "MAINTENANCE", "SYSTEM"];
    if (referenceType && !validReferenceTypes.includes(referenceType)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Loại tham chiếu không hợp lệ",
        validReferenceTypes
      });
    }

    // Find target wallet
    let wallet;
    if (targetWalletId) {
      wallet = await Wallet.findById(targetWalletId).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Không tìm thấy ví đích" });
      }
    } else {
      // Default to system wallet
      wallet = await Wallet.findOne({ isSystem: true }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Không tìm thấy ví hệ thống" });
      }
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + parsedAmount;
    // Validate balance for negative amounts
    if (parsedAmount < 0 && Math.abs(parsedAmount) > balanceBefore) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Số dư không đủ cho giao dịch này",
        currentBalance: balanceBefore,
        attemptedAmount: Math.abs(parsedAmount)
      });
    }

    // Update wallet balance if requested
    if (updateBalance) {
      wallet.balance = balanceAfter;
      await wallet.save({ session });
    }

    // Validate reference ID if reference type provided
    let validReferenceId = null;
    if (referenceType && referenceId) {
      // Basic ObjectId validation
      if (mongoose.Types.ObjectId.isValid(referenceId)) {
        validReferenceId = referenceId;
      } else {
        console.warn("[DEBUG] Invalid referenceId format:", referenceId);
      }
    }

    // Create transaction
    const transaction = await WalletTransaction.create([{
      wallet: wallet._id,
      type,
      amount: parsedAmount,
      balanceBefore,
      balanceAfter,
      referenceType: referenceType || "SYSTEM",
      referenceId: validReferenceId,
      description: description.trim(),
      status: "SUCCESS",
      metadata: {
        createdBy: adminId,
        isManual: true,
        updateBalance,
        createdAt: new Date(),
        // Additional metadata for different transaction types
        ...(type === 'ADJUSTMENT' && { adjustmentType: 'MANUAL' }),
        ...(type.includes('FEE') && { feeType: type }),
        ...(referenceType && { originalReferenceId: referenceId })
      }
    }], { session, ordered: true });


    await session.commitTransaction();

    res.json({
      success: true,
      message: "Tạo giao dịch thành công",
      transaction: transaction[0],
      wallet: {
        id: wallet._id,
        balanceBefore,
        balanceAfter,
        balanceUpdated: updateBalance
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create manual transaction error:", error);
    res.status(500).json({ 
      message: "Lỗi khi tạo giao dịch", 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/admin/wallet/export-transactions
 * Export transactions to CSV
 */
exports.exportTransactions = async (req, res) => {
  try {
    const { type, dateRange, format = "csv" } = req.query;

    // Find system wallet
    const adminWallet = await Wallet.findOne({ isSystem: true });
    if (!adminWallet) {
      return res.status(404).json({ message: "Admin wallet not found" });
    }

    // Build filter
    let filter = { wallet: adminWallet._id };

    // Date range filtering
    if (dateRange) {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    if (type && type !== "ALL") {
      filter.type = type;
    }

    // Get transactions
    const transactions = await WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Format data for export
    const formattedData = transactions.map(t => ({
      "ID": t._id.toString(),
      "Loại giao dịch": getTransactionTypeLabel(t.type),
      "Số tiền": t.amount,
      "Số dư trước": t.balanceBefore,
      "Số dư sau": t.balanceAfter,
      "Mô tả": t.description,
      "Trạng thái": t.status === "SUCCESS" ? "Thành công" : "Đang xử lý",
      "Ngày tạo": new Date(t.createdAt).toLocaleString("vi-VN"),
      "Reference Type": t.referenceType || "",
      "Reference ID": t.referenceId ? t.referenceId.toString() : ""
    }));

    if (format === "csv") {
      const fields = [
        "ID", "Loại giao dịch", "Số tiền", "Số dư trước", "Số dư sau",
        "Mô tả", "Trạng thái", "Ngày tạo", "Reference Type", "Reference ID"
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(formattedData);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=wallet-transactions-${Date.now()}.csv`);
      res.send("\uFEFF" + csv); // Add BOM for UTF-8
    } else {
      res.json({
        success: true,
        total: formattedData.length,
        data: formattedData
      });
    }
  } catch (error) {
    console.error("Export transactions error:", error);
    res.status(500).json({ message: "Lỗi khi xuất dữ liệu" });
  }
};

// Helper function to translate transaction types
function getTransactionTypeLabel2(type) {
  const labels = {
    "PLATFORM_FEE": "Phí nền tảng",
    "ESCROW_HOLD": "Tiền thuê tạm giữ",
    "DEPOSIT_HOLD": "Tiền đặt cọc",
    "SUPPLIER_PAYOUT": "Trả tiền nhà cung cấp",
    "CUSTOMER_REFUND": "Hoàn tiền khách hàng",
    "SERVICE_FEE": "Phí dịch vụ",
    "PENALTY_FEE": "Phí phạt",
    "TOP_UP": "Nạp tiền",
    "WITHDRAW": "Rút tiền",
    "PAYMENT": "Thanh toán",
    "REFUND": "Hoàn tiền",
    "ADJUSTMENT_IN": "Điều chỉnh tăng",
    "ADJUSTMENT_OUT": "Điều chỉnh giảm"
  };
  return labels[type] || type;
}

/**
 * GET /api/admin/wallet
 * Get admin wallet information with comprehensive financial data
 */
exports.getAdminWallet = async (req, res) => {
  try {
    // Find system wallet (this is where platform fees go)
    let adminWallet = await Wallet.findOne({ 
      isSystem: true 
    }).populate('user', 'fullName email');
    
    // If system wallet doesn't exist, create one
    if (!adminWallet) {
      adminWallet = new Wallet({
        isSystem: true,
        balance: 0,
        availableBalance: 0,
        frozenAmount: 0,
        status: 'ACTIVE'
      });
      await adminWallet.save();
      await adminWallet.populate('user', 'fullName email');
    }

    // Calculate totals by transaction type using aggregation for the system wallet
    const [
      platformFees,
      platformFeeRefunds,
      platformFeeRefunds,
      escrowHolds,
      depositHolds,
      supplierPayouts,
      customerRefunds,
      refunds,
      refunds,
      serviceFees,
      penaltyFees
    ] = await Promise.all([
      // Platform fees (positive amounts - revenue)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "PLATFORM_FEE", amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Platform fee refunds (negative amounts - deducted from revenue on cancellations)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "PLATFORM_FEE_REFUND", amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
      ]),
      
      // Escrow holds (NET: ESCROW_HOLD - ESCROW_RELEASE)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: { $in: ["ESCROW_HOLD", "ESCROW_RELEASE"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Deposit holds (NET: DEPOSIT_HOLD - DEPOSIT_RELEASE)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: { $in: ["DEPOSIT_HOLD", "DEPOSIT_RELEASE"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Supplier payouts (negative amounts - money paid out)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "SUPPLIER_PAYOUT", amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
      ]),
      
      // Customer refunds (negative amounts - money refunded)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "CUSTOMER_REFUND", amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
      ]),
      
      // Refunds for cancelled orders (positive amounts from system wallet perspective - money going out)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "REFUND", amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
      ]),
      
      // Refunds for cancelled orders (positive amounts from system wallet perspective - money going out)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "REFUND", amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
      ]),
      
      // Service fees (positive amounts)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "SERVICE_FEE", amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Penalty fees (positive amounts)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "PENALTY_FEE", amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    // Calculate monthly revenue (current month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Calculate monthly revenue - CHỈ tính phí nền tảng và phí dịch vụ (doanh thu thực)
    // Không tính ESCROW_HOLD và DEPOSIT_HOLD vì đó là tiền tạm giữ, không phải doanh thu
    // Calculate monthly revenue - CHỈ tính phí nền tảng và phí dịch vụ (doanh thu thực)
    // Không tính ESCROW_HOLD và DEPOSIT_HOLD vì đó là tiền tạm giữ, không phải doanh thu
    const monthlyRevenue = await WalletTransaction.aggregate([
      {
        $match: {
          wallet: adminWallet._id,
          type: { $in: ["PLATFORM_FEE", "SERVICE_FEE", "PENALTY_FEE"] },
          amount: { $gt: 0 },
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // Calculate total expenses (absolute values of payouts and refunds)
    const totalExpenses = (supplierPayouts[0]?.total || 0) + 
                          (customerRefunds[0]?.total || 0) + 
                          (refunds[0]?.total || 0); // REFUND for cancelled orders

    // Calculate total holds (escrow + deposits)
    const totalHolds = (escrowHolds[0]?.total || 0) + (depositHolds[0]?.total || 0);

    // Calculate net profit with cancellation refunds
    const grossPlatformFees = (platformFees[0]?.total || 0);
    const platformFeeRefundsTotal = (platformFeeRefunds[0]?.total || 0);
    const netPlatformFees = grossPlatformFees - platformFeeRefundsTotal;
    
    const totalFees = netPlatformFees + (serviceFees[0]?.total || 0) + (penaltyFees[0]?.total || 0);
    const netProfit = totalFees - totalExpenses;

    // Calculate different balance types
    const grossEscrow = (escrowHolds[0]?.total || 0);
    const grossDeposits = (depositHolds[0]?.total || 0);
    
    // Tính phí nền tảng đã kiếm (isEarned: true) và đang chờ (isEarned: false)
    const earnedPlatformFees = await WalletTransaction.aggregate([
      { 
        $match: { 
          wallet: adminWallet._id, 
          type: "PLATFORM_FEE",
          isEarned: true
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const pendingPlatformFees = await WalletTransaction.aggregate([
      { 
        $match: { 
          wallet: adminWallet._id, 
          type: "PLATFORM_FEE",
          isEarned: false,
          $or: [
            { isRefunded: false },
            { isRefunded: { $exists: false } }  // Xử lý dữ liệu cũ chưa có field
          ]
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    // Tính phí vận chuyển đã kiếm (isEarned: true) và đang chờ (isEarned: false)
    const earnedShippingFees = await WalletTransaction.aggregate([
      { 
        $match: { 
          wallet: adminWallet._id, 
          type: "SHIPPING_FEE",
          isEarned: true
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const pendingShippingFees = await WalletTransaction.aggregate([
      { 
        $match: { 
          wallet: adminWallet._id, 
          type: "SHIPPING_FEE",
          isEarned: false,
          $or: [
            { isRefunded: false },
            { isRefunded: { $exists: false } }
          ]
        } 
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const earnedFeeBalance = earnedPlatformFees[0]?.total || 0;
    const pendingFeeBalance = pendingPlatformFees[0]?.total || 0;
    const earnedShippingBalance = earnedShippingFees[0]?.total || 0;
    const pendingShippingBalance = pendingShippingFees[0]?.total || 0;
    
    // Số dư chờ hoàn thành = Tiền thuê tạm giữ đang giữ cho đơn chưa hoàn thành
    // grossEscrow đã là net amount (ESCROW_HOLD đã trừ platformFee)
    const pendingCompletionBalance = Math.max(0, grossEscrow);
    
    // Số dư tổng = Tất cả tiền trong ví (thuê + cọc + phí)
    const totalBalance = adminWallet.balance;
    
    // Số dư thực tế admin có thể dùng = Phí đã kiếm + phí vận chuyển đã kiếm + phí dịch vụ + phí phạt (không bao gồm phí đang chờ)
    const availableBalance = Math.max(0, earnedFeeBalance + earnedShippingBalance + (serviceFees[0]?.total || 0) + (penaltyFees[0]?.total || 0));
    
    res.json({
      wallet: adminWallet,
      totalRevenue: totalFees,
      netProfit: netProfit,
      
      // Các loại số dư
      totalBalance: totalBalance, // Tổng tất cả tiền trong ví
      availableBalance: availableBalance, // Phí đã kiếm + phí dịch vụ + phí vận chuyển (có thể rút)
      earnedFeeBalance: earnedFeeBalance, // Phí nền tảng đã kiếm (từ đơn hoàn thành)
      pendingFeeBalance: pendingFeeBalance, // Phí nền tảng đang chờ (đơn chưa hoàn thành)
      earnedShippingBalance: earnedShippingBalance, // Phí vận chuyển đã kiếm (từ đơn hoàn thành)
      pendingShippingBalance: pendingShippingBalance, // Phí vận chuyển đang chờ (đơn chưa hoàn thành)
      pendingCompletionBalance: pendingCompletionBalance, // Tiền thuê đang tạm giữ (chờ hoàn thành đơn)
      pendingDepositBalance: grossDeposits, // Tiền cọc đang tạm giữ
      
      totalPlatformFees: netPlatformFees,
      totalPlatformFeesGross: grossPlatformFees,
      totalPlatformFeeRefunds: platformFeeRefundsTotal,
      totalEscrow: grossEscrow,
      totalEscrowNet: Math.max(0, grossEscrow - netPlatformFees), // Sau khi trừ phí
      totalDeposits: grossDeposits,
      totalSupplierPayouts: supplierPayouts[0]?.total || 0,
      totalCustomerRefunds: customerRefunds[0]?.total || 0,
      totalServiceFees: serviceFees[0]?.total || 0,
      totalPenaltyFees: penaltyFees[0]?.total || 0,
      totalExpenses: totalExpenses,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      totalHolds: pendingCompletionBalance + grossDeposits
    });
  } catch (error) {
    console.error("Get admin wallet error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/admin/wallet/transactions
 * Get admin wallet transactions with filtering
 */
exports.getAdminWalletTransactions = async (req, res) => {
  try {
    const { type, dateRange, page = 1, limit = 50, search } = req.query;

    // Find system wallet first
    const adminWallet = await Wallet.findOne({ isSystem: true });
    if (!adminWallet) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ví hệ thống"
      });
    }

    // Build base filter - only get transactions for admin wallet
    let filter = { wallet: adminWallet._id };
    
    // Date range filtering
    if (dateRange && dateRange !== "ALL") {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    // Type filtering - include all valid types from model
    const validTypes = [
      'TOP_UP', 'PAYMENT', 'REFUND', 'WITHDRAW', 'ADJUSTMENT',
      'PLATFORM_FEE', 'PLATFORM_FEE_REFUND', 'PAYOUT', 'DEPOSIT_REFUND'
    ];

    if (type && type !== "ALL") {
      filter.type = type;
    }

    // Search by description, reference, user ID, or order/rental ID
    if (search) {
      // Check if search is a valid ObjectId
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      
      const searchConditions = [
        { description: { $regex: search, $options: 'i' } },
        { 'metadata.adjustmentReason': { $regex: search, $options: 'i' } }
      ];
      
      // If search looks like an ObjectId, also search by _id, referenceId, or user._id
      if (isObjectId) {
        searchConditions.push(
          { _id: new mongoose.Types.ObjectId(search) },
          { referenceId: new mongoose.Types.ObjectId(search) }
        );
      }
      
      // Partial match for IDs (last 6 characters of order ID)
      if (search.length >= 6) {
        searchConditions.push(
          { description: { $regex: search, $options: 'i' } },
          { 'metadata.orderCode': { $regex: search, $options: 'i' } }
        );
      }
      
      filter.$or = searchConditions;
      
      // If search looks like an ObjectId, also search by _id, referenceId, or user._id
      if (isObjectId) {
        searchConditions.push(
          { _id: new mongoose.Types.ObjectId(search) },
          { referenceId: new mongoose.Types.ObjectId(search) }
        );
      }
      
      // Partial match for IDs (last 6 characters of order ID)
      if (search.length >= 6) {
        searchConditions.push(
          { description: { $regex: search, $options: 'i' } },
          { 'metadata.orderCode': { $regex: search, $options: 'i' } }
        );
      }
      
      filter.$or = searchConditions;
    }
    // Get transactions with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const transactions = await WalletTransaction.find(filter)
      .populate({
        path: 'wallet',
        populate: {
          path: 'user',
          select: 'fullName email phone username'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await WalletTransaction.countDocuments(filter);

    // Format transactions with additional info
    const formattedTransactions = transactions.map(t => {
      const walletInfo = t.wallet || {};
      const userInfo = walletInfo.user || {};
      
      return {
        _id: t._id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        metadata: t.metadata || {},
        
        // Additional formatted fields
        amountFormatted: Math.abs(t.amount).toLocaleString('vi-VN') + ' VNĐ',
        isPositive: t.amount > 0,
        typeLabel: getTransactionTypeLabel2(t.type),
        statusLabel: t.status === 'SUCCESS' ? 'Thành công' : 
                    t.status === 'PENDING' ? 'Đang xử lý' : 
                    t.status === 'FAILED' ? 'Thất bại' : 'Đã hủy',
        
        // Wallet and user info
        wallet: {
          _id: walletInfo._id,
          balance: walletInfo.balance,
          isSystem: walletInfo.isSystem || false
        },
        user: userInfo ? {
          _id: userInfo._id,
          fullName: userInfo.fullName,
          email: userInfo.email,
          phone: userInfo.phone,
          username: userInfo.username
        } : null
      };
    });

    // Calculate statistics
    const stats = {
      totalTransactions: total,
      totalIncome: formattedTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpense: Math.abs(formattedTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)),
      netBalance: formattedTransactions
        .reduce((sum, t) => sum + t.amount, 0)
    };

    res.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats,
      filters: {
        type,
        dateRange,
        search
      }
    });
  } catch (error) {
    console.error("Get admin wallet transactions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message 
    });
  }
};

/**
 * GET /api/admin/withdrawals
 * Get all withdrawal requests with filtering
 */
exports.getWithdrawalRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    // Build filter for withdrawal requests
    let filter = {};
    
    if (status && status !== "ALL") {
      filter.status = status;
    }
    
    // Find all withdrawal requests and populate user info
    const withdrawals = await WithdrawRequest.find(filter)
      .populate({
        path: 'user',
        select: 'fullName email phone avatar role'
      })
      .populate({
        path: 'wallet',
        select: 'balance status'
      })
      .sort({ createdAt: -1 });

    // Apply search filter if provided
    let filteredWithdrawals = withdrawals;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredWithdrawals = withdrawals.filter(withdrawal => {
        const user = withdrawal.user;
        return (
          user?.fullName?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower) ||
          user?.phone?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Transform data for frontend
    const transformedWithdrawals = filteredWithdrawals.map(withdrawal => ({
      _id: withdrawal._id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.updatedAt, // Use updatedAt as processed time
      notes: withdrawal.adminNote || 'Yêu cầu rút tiền',
      rejectionReason: withdrawal.adminNote || (withdrawal.status === 'REJECTED' ? 'Rejected by admin' : null),
      supplierId: withdrawal.user, // User info is populated
      bankInfo: withdrawal.bankInfo || {},
      referenceId: withdrawal._id.toString().slice(-6), // Use last 6 chars of ID
      walletBalance: withdrawal.wallet?.balance || 0
    }));

    res.json({
      withdrawals: transformedWithdrawals,
      total: transformedWithdrawals.length,
      stats: {
        total: withdrawals.length,
        pending: withdrawals.filter(w => w.status === 'PENDING').length,
        approved: withdrawals.filter(w => w.status === 'APPROVED').length,
        rejected: withdrawals.filter(w => w.status === 'REJECTED').length,
        totalPendingAmount: withdrawals
          .filter(w => w.status === 'PENDING')
          .reduce((sum, w) => sum + w.amount, 0)
      }
    });
    
  } catch (error) {
    console.error("Get withdrawal requests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/admin/withdrawals/:id/approve
 * Approve a withdrawal request
 */
exports.approveWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    // Find the withdrawal request (not WalletTransaction)
    const withdrawal = await WithdrawRequest.findById(id).session(session);    
    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Withdrawal request not found" });
    }
    
    if (withdrawal.status !== "PENDING") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Withdrawal request already processed" });
    }
    
    // Find the supplier wallet
    const supplierWallet = await Wallet.findById(withdrawal.wallet).session(session);
    
    if (!supplierWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Supplier wallet not found" });
    }
    
    // Find supplier user to get bank info
    const supplier = await User.findById(withdrawal.user).session(session);
    
    // Use bank info from withdrawal request, not user
    const bankInfo = withdrawal.bankInfo;
    
    if (!supplier || !bankInfo) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Supplier or bank information not found" });
    }
    
    // Check if supplier has sufficient balance
    if (supplierWallet.balance < Math.abs(withdrawal.amount)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Prepare PayOS transfer data
    const transferData = {
      amount: Math.abs(withdrawal.amount), // Convert negative to positive for transfer
      description: `Rút tiền GearXpert - Yêu cầu #${withdrawal._id.toString().slice(-6)}`,
      accountNumber: bankInfo.accountNumber,
      accountName: bankInfo.accountName,
      bankCode: bankInfo.bankCode || bankInfo.bankName, // Use bankName if bankCode not available
    };       
    // Execute PayOS transfer
    let transferResult;
    try {
      transferResult = await transferMoney(transferData);
      // Check if manual transfer is required
      if (transferResult.requiresManualTransfer) {        
        // Update withdrawal status but mark for manual transfer
        withdrawal.status = "APPROVED";
        withdrawal.processedAt = new Date();
        withdrawal.adminNote = "Đã duyệt - Chờ chuyển tiền thủ công";
        withdrawal.payosTransferId = "MANUAL_TRANSFER_REQUIRED";
        await withdrawal.save({ session });
        
        // Update wallet balance (deduct amount)
        supplierWallet.balance += withdrawal.amount; // withdrawal.amount is negative
        await supplierWallet.save({ session });
        
        // Create withdrawal completion transaction with manual flag
        await WalletTransaction.create([{
          wallet: supplierWallet._id,
          type: "WITHDRAW", // Use correct enum value
          amount: withdrawal.amount,
          balanceBefore: supplierWallet.balance - withdrawal.amount,
          balanceAfter: supplierWallet.balance,
          referenceType: "SYSTEM", // Use correct enum value
          referenceId: withdrawal._id,
          description: `Withdrawal approved - Manual transfer required - ${withdrawal.adminNote || 'Rút tiền'}`,
          status: "SUCCESS",
          payosTransferId: "MANUAL_TRANSFER_REQUIRED",
          metadata: {
            requiresManualTransfer: true,
            transferData: transferResult.transferData
          }
        }], { session, ordered: true });
        
        await session.commitTransaction();               
        return res.json({
          success: true,
          message: "Duyệt rút tiền thành công - Cần chuyển tiền thủ công",
          data: {
            withdrawalId: withdrawal._id,
            transferId: "MANUAL_TRANSFER_REQUIRED",
            amount: Math.abs(withdrawal.amount),
            processedAt: withdrawal.processedAt,
            supplierInfo: {
              name: supplier.fullName || supplier.username,
              bankAccount: bankInfo.accountNumber,
              bankName: bankInfo.bankName
            },
            requiresManualTransfer: true,
            transferData: transferResult.transferData
          }
        });
      }
      
    } catch (transferError) {
      console.error("[WITHDRAWAL] PayOS transfer failed:", transferError);
      await session.abortTransaction();
      return res.status(500).json({ 
        success: false,
        message: "Chuyển tiền PayOS thất bại", 
        error: transferError.message,
        details: {
          withdrawalId: withdrawal._id,
          amount: Math.abs(withdrawal.amount),
          supplierBank: {
            accountNumber: bankInfo.accountNumber,
            accountName: bankInfo.accountName,
            bankName: bankInfo.bankName
          }
        }
      });
    }
    
    // Update withdrawal status
    withdrawal.status = "APPROVED";
    withdrawal.processedAt = new Date();
    withdrawal.payosTransferId = transferResult.transferId || transferResult.id;
    await withdrawal.save({ session });
    
    // Update wallet balance
    supplierWallet.balance += withdrawal.amount; // withdrawal.amount is negative
    await supplierWallet.save({ session });
    
    // Create withdrawal completion transaction
    await WalletTransaction.create([{
      wallet: supplierWallet._id,
      type: "WITHDRAW", // Use correct enum value
      amount: withdrawal.amount, // Negative amount for money out
      balanceBefore: supplierWallet.balance - withdrawal.amount,
      balanceAfter: supplierWallet.balance,
      referenceType: "SYSTEM", // Use correct enum value
      referenceId: withdrawal._id,
      description: `Withdrawal completed via PayOS - ${withdrawal.adminNote || 'Rút tiền'}`,
      status: "SUCCESS",
      payosTransferId: transferResult.transferId || transferResult.id
    }], { session, ordered: true });
    
    await session.commitTransaction();    
    res.json({
      success: true,
      message: "Duyệt rút tiền và chuyển tiền thành công",
      data: {
        withdrawalId: withdrawal._id,
        transferId: transferResult.id || transferResult.orderCode,
        amount: Math.abs(withdrawal.amount),
        processedAt: withdrawal.processedAt,
        supplierInfo: {
          name: supplier.fullName || supplier.username,
          bankAccount: bankInfo.accountNumber,
          bankName: bankInfo.bankName
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[WITHDRAWAL APPROVE] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/admin/withdrawals/:id/reject
 * Reject a withdrawal request
 */
exports.rejectWithdrawal = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    
    if (!reason) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    // Find the withdrawal request (not WalletTransaction)
    const withdrawal = await WithdrawRequest.findById(id).session(session);
    
    if (!withdrawal) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Withdrawal request not found" });
    }
    
    if (withdrawal.status !== "PENDING") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Withdrawal request already processed" });
    }
    
    // Update withdrawal status
    withdrawal.status = "REJECTED";
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = reason;
    await withdrawal.save({ session });
    
    await session.commitTransaction();
        
    res.json({
      success: true,
      message: "Withdrawal request rejected successfully",
      withdrawalId: withdrawal._id
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("[WITHDRAWAL REJECT] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/admin/wallet/topup
 * Admin nạp tiền vào ví hệ thống qua PayOS
 */
exports.topUpAdminWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const adminId = req.user.id;
    
    const cleanAmount = parseInt(amount, 10);
    if (isNaN(cleanAmount) || cleanAmount < 10000) {
      return res.status(400).json({ message: 'Số tiền tối thiểu 10.000đ' });
    }

    // Find or create system wallet
    let adminWallet = await Wallet.findOne({ isSystem: true });
    if (!adminWallet) {
      adminWallet = await Wallet.create({ 
        isSystem: true, 
        balance: 0,
        status: 'ACTIVE'
      });
    }

    // Create orderCode
    const orderCode = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

    // Create Payment record for admin
    const payment = await Payment.create({
      user: adminId,
      amount: cleanAmount,
      orderCode,
      status: 'INIT',
      metadata: { type: 'ADMIN_TOPUP', walletId: adminWallet._id }
    });

    // Create pending transaction
    await WalletTransaction.create({
      wallet: adminWallet._id,
      type: 'TOP_UP',
      amount: cleanAmount,
      balanceBefore: adminWallet.balance,
      balanceAfter: adminWallet.balance,
      status: 'PENDING',
      referenceType: 'SYSTEM',
      referenceId: payment._id,
      description: `Admin nạp tiền qua PayOS (Mã: ${orderCode})`,
      metadata: { adminId, orderCode }
    });

    const body = {
      orderCode: Number(orderCode),
      amount: Number(cleanAmount),
      description: `Admin nap ${orderCode}`.slice(0, 25),
      returnUrl: `${process.env.FRONTEND_URL}/admin/wallet/success`,
      cancelUrl: `${process.env.FRONTEND_URL}/admin/wallet/cancel`
    };

    let paymentLinkRes;
    if (payos.paymentRequests?.create) {
      paymentLinkRes = await payos.paymentRequests.create(body);
    } else {
      paymentLinkRes = await payos.createPaymentLink(body);
    }

    return res.status(200).json({
      success: true,
      data: paymentLinkRes,
      orderCode
    });
  } catch (err) {
    console.error('[ADMIN TOPUP ERROR]:', err);
    return res.status(500).json({ message: 'Lỗi nạp tiền', error: err.message });
  }
};

/**
 * POST /api/admin/wallet/withdraw
 * Admin rút tiền trực tiếp từ ví hệ thống (không cần request)
 */
exports.withdrawAdminWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, bankInfo } = req.body;
    const adminId = req.user.id;
    
    const cleanAmount = parseInt(amount, 10);
    if (isNaN(cleanAmount) || cleanAmount < 10000) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Số tiền tối thiểu 10.000đ' });
    }

    if (!bankInfo || !bankInfo.accountNumber || !bankInfo.accountName || !bankInfo.bankCode) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Thiếu thông tin ngân hàng' });
    }

    // Find system wallet
    let adminWallet = await Wallet.findOne({ isSystem: true }).session(session);
    if (!adminWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy ví hệ thống' });
    }

    // Calculate available balance (total - escrow holds - deposit holds)
    const escrowHolds = await WalletTransaction.aggregate([
      { $match: { wallet: adminWallet._id, type: { $in: ["ESCROW_HOLD", "ESCROW_RELEASE"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).session(session);
    
    const depositHolds = await WalletTransaction.aggregate([
      { $match: { wallet: adminWallet._id, type: { $in: ["DEPOSIT_HOLD", "DEPOSIT_RELEASE"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).session(session);
    
    const pendingEscrow = Math.max(0, escrowHolds[0]?.total || 0);
    const pendingDeposits = Math.max(0, depositHolds[0]?.total || 0);
    const availableBalance = Math.max(0, adminWallet.balance - pendingEscrow - pendingDeposits);

    // Check available balance (not total balance)
    if (availableBalance < cleanAmount) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Số dư khả dụng không đủ',
        totalBalance: adminWallet.balance,
        pendingEscrow: pendingEscrow,
        pendingDeposits: pendingDeposits,
        availableBalance: availableBalance,
        requestedAmount: cleanAmount
      });
    }

    // Deduct from wallet
    const balanceBefore = adminWallet.balance;
    adminWallet.balance -= cleanAmount;
    await adminWallet.save({ session });

    // Create withdrawal transaction
    const transaction = await WalletTransaction.create([{
      wallet: adminWallet._id,
      type: 'WITHDRAW',
      amount: -cleanAmount,
      balanceBefore,
      balanceAfter: adminWallet.balance,
      referenceType: 'SYSTEM',
      description: `Admin rút tiền về ${bankInfo.bankName} - ${bankInfo.accountNumber}`,
      status: 'SUCCESS',
      metadata: {
        adminId,
        bankInfo,
        initiatedAt: new Date()
      }
    }], { session, ordered: true });

    await session.commitTransaction();

    // Execute PayOS transfer async
    const transferData = {
      amount: cleanAmount,
      description: `Admin rút GearXpert`,
      accountNumber: bankInfo.accountNumber,
      accountName: bankInfo.accountName,
      bankCode: bankInfo.bankCode
    };

    // Start transfer in background
    processAdminWithdrawal(transaction[0]._id, transferData).catch(err => {
      console.error('[ADMIN WITHDRAWAL] Background transfer error:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Yêu cầu rút tiền đã được gửi',
      transactionId: transaction[0]._id,
      amount: cleanAmount,
      newBalance: adminWallet.balance
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('[ADMIN WITHDRAW ERROR]:', err);
    return res.status(500).json({ message: 'Lỗi rút tiền', error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/admin/wallet/lookup-user
 * Tìm kiếm thông tin user theo walletId hoặc email
 */
exports.lookupUserByWallet = async (req, res) => {
  try {
    const { walletId, email } = req.query;
    
    if (!walletId && !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng cung cấp walletId hoặc email' 
      });
    }

    let wallet;
    let user;

    if (walletId) {
      wallet = await Wallet.findById(walletId);
      if (wallet) {
        user = await User.findById(wallet.user);
      }
    } else if (email) {
      // Case-insensitive email search
      user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      if (user) {
        wallet = await Wallet.findOne({ user: user._id });
      }
    }

    if (!user || !wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        fullName: user.fullName || user.username || 'Unknown',
        email: user.email,
        avatar: user.avatar,
        walletId: wallet._id,
        walletBalance: wallet.balance,
        walletStatus: wallet.status
      }
    });
  } catch (err) {
    console.error('[LOOKUP USER ERROR]:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi tìm kiếm', 
      error: err.message 
    });
  }
};

/**
 * POST /api/admin/wallet/transfer
 * Chuyển tiền từ ví hệ thống đến ví cụ thể
 */
exports.transferToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { walletId, userEmail, amount, description, type } = req.body;
    const adminId = req.user.id;

    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    // Find system wallet (source)
    let systemWallet = await Wallet.findOne({ isSystem: true }).session(session);
    if (!systemWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy ví hệ thống' });
    }

    // Find destination wallet
    let destinationWallet;
    if (walletId) {
      destinationWallet = await Wallet.findById(walletId).session(session);
    } else if (userEmail) {
      const user = await User.findOne({ email: userEmail }).session(session);
      if (user) {
        destinationWallet = await Wallet.findOne({ user: user._id }).session(session);
      }
    }

    if (!destinationWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy ví đích' });
    }

    // Check system wallet balance
    if (systemWallet.balance < cleanAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Số dư ví hệ thống không đủ',
        currentBalance: systemWallet.balance,
        requestedAmount: cleanAmount
      });
    }

    // Deduct from system wallet
    const systemBalanceBefore = systemWallet.balance;
    systemWallet.balance -= cleanAmount;
    await systemWallet.save({ session });

    // Add to destination wallet
    const destBalanceBefore = destinationWallet.balance;
    destinationWallet.balance += cleanAmount;
    await destinationWallet.save({ session });

    // Create transaction record for admin (debit only)
    const now = new Date();
    const transferType = type || 'TRANSFER';

    // Transfer type labels for clear categorization
    const transferTypeLabels = {
      'TRANSFER': 'Chuyển tiền',
      'SUPPLIER_PAYOUT': 'Trả tiền NCC',
      'CUSTOMER_REFUND': 'Hoàn tiền KH',
      'BONUS': 'Thưởng'
    };
    const typeLabel = transferTypeLabels[transferType] || 'Chuyển tiền';

    // Only create transaction for admin wallet (debit)
    await WalletTransaction.create([{
      wallet: systemWallet._id,
      type: 'ADJUSTMENT',
      amount: -cleanAmount,
      balanceBefore: systemBalanceBefore,
      balanceAfter: systemWallet.balance,
      referenceType: 'SYSTEM',
      description: description || `${typeLabel} đến ví ${destinationWallet._id}`,
      status: 'SUCCESS',
      metadata: {
        adminId,
        destinationWalletId: destinationWallet._id,
        transferType,
        transferLabel: typeLabel,
        transferredAt: now
      }
    }], { session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: 'Chuyển tiền thành công',
      amount: cleanAmount,
      sourceBalance: systemWallet.balance,
      destinationBalance: destinationWallet.balance
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('[ADMIN TRANSFER ERROR]:', err);
    return res.status(500).json({ message: 'Lỗi chuyển tiền', error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Process admin withdrawal transfer via PayOS
 */
const processAdminWithdrawal = async (transactionId, transferData) => {
  try {
    const transferResult = await transferMoney(transferData);
    
    // Update transaction with transfer result
    await WalletTransaction.findByIdAndUpdate(transactionId, {
      status: transferResult.success ? 'SUCCESS' : 'FAILED',
      payosTransferId: transferResult.transferId || null,
      'metadata.transferResult': transferResult,
      'metadata.completedAt': new Date()
    });

    if (!transferResult.success) {
      // If failed, refund the amount
      const adminWallet = await Wallet.findOne({ isSystem: true });
      if (adminWallet) {
        const transaction = await WalletTransaction.findById(transactionId);
        adminWallet.balance += Math.abs(transaction.amount);
        await adminWallet.save();
        
        await WalletTransaction.create({
          wallet: adminWallet._id,
          type: 'REFUND',
          amount: Math.abs(transaction.amount),
          balanceBefore: adminWallet.balance - Math.abs(transaction.amount),
          balanceAfter: adminWallet.balance,
          referenceType: 'SYSTEM',
          description: `Hoàn tiền do rút tiền thất bại`,
          status: 'SUCCESS',
          metadata: { originalTransactionId: transactionId }
        });
      }
    }
  } catch (err) {
    console.error('[ADMIN WITHDRAWAL PROCESS] Error:', err);
    await WalletTransaction.findByIdAndUpdate(transactionId, {
      status: 'FAILED',
      'metadata.error': err.message
    });
  }
};

/**
 * POST /api/admin/wallet/topup
 * Admin nạp tiền vào ví hệ thống qua PayOS
 */
exports.topUpAdminWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const adminId = req.user.id;
    
    const cleanAmount = parseInt(amount, 10);
    if (isNaN(cleanAmount) || cleanAmount < 10000) {
      return res.status(400).json({ message: 'Số tiền tối thiểu 10.000đ' });
    }

    // Find or create system wallet
    let adminWallet = await Wallet.findOne({ isSystem: true });
    if (!adminWallet) {
      adminWallet = await Wallet.create({ 
        isSystem: true, 
        balance: 0,
        status: 'ACTIVE'
      });
    }

    // Create orderCode
    const orderCode = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

    // Create Payment record for admin
    const payment = await Payment.create({
      user: adminId,
      amount: cleanAmount,
      orderCode,
      status: 'INIT',
      metadata: { type: 'ADMIN_TOPUP', walletId: adminWallet._id }
    });

    // Create pending transaction (nạp tiền mặc định là khả dụng ngay)
    await WalletTransaction.create({
      wallet: adminWallet._id,
      type: 'TOP_UP',
      amount: cleanAmount,
      balanceBefore: adminWallet.balance,
      balanceAfter: adminWallet.balance,
      status: 'PENDING',
      referenceType: 'SYSTEM',
      referenceId: payment._id,
      description: `Admin nạp tiền qua PayOS (Mã: ${orderCode})`,
      isEarned: true,
      metadata: { adminId, orderCode }
    });

    const body = {
      orderCode: Number(orderCode),
      amount: Number(cleanAmount),
      description: `Admin nap ${orderCode}`.slice(0, 25),
      returnUrl: `${process.env.FRONTEND_URL}/admin/wallet/success`,
      cancelUrl: `${process.env.FRONTEND_URL}/admin/wallet/cancel`
    };

    let paymentLinkRes;
    if (payos.paymentRequests?.create) {
      paymentLinkRes = await payos.paymentRequests.create(body);
    } else {
      paymentLinkRes = await payos.createPaymentLink(body);
    }

    return res.status(200).json({
      success: true,
      data: paymentLinkRes,
      orderCode
    });
  } catch (err) {
    console.error('[ADMIN TOPUP ERROR]:', err);
    return res.status(500).json({ message: 'Lỗi nạp tiền', error: err.message });
  }
};

/**
 * POST /api/admin/wallet/withdraw
 * Admin rút tiền trực tiếp từ ví hệ thống (không cần request)
 */
exports.withdrawAdminWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, bankInfo } = req.body;
    const adminId = req.user.id;
    
    const cleanAmount = parseInt(amount, 10);
    if (isNaN(cleanAmount) || cleanAmount < 10000) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Số tiền tối thiểu 10.000đ' });
    }

    if (!bankInfo || !bankInfo.accountNumber || !bankInfo.accountName || !bankInfo.bankCode) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Thiếu thông tin ngân hàng' });
    }

    // Find system wallet
    let adminWallet = await Wallet.findOne({ isSystem: true }).session(session);
    if (!adminWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy ví hệ thống' });
    }

    // Calculate available balance (total - escrow holds - deposit holds)
    const escrowHolds = await WalletTransaction.aggregate([
      { $match: { wallet: adminWallet._id, type: { $in: ["ESCROW_HOLD", "ESCROW_RELEASE"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).session(session);
    
    const depositHolds = await WalletTransaction.aggregate([
      { $match: { wallet: adminWallet._id, type: { $in: ["DEPOSIT_HOLD", "DEPOSIT_RELEASE"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).session(session);
    
    const pendingEscrow = Math.max(0, escrowHolds[0]?.total || 0);
    const pendingDeposits = Math.max(0, depositHolds[0]?.total || 0);
    const availableBalance = Math.max(0, adminWallet.balance - pendingEscrow - pendingDeposits);

    // Check available balance (not total balance)
    if (availableBalance < cleanAmount) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Số dư khả dụng không đủ',
        totalBalance: adminWallet.balance,
        pendingEscrow: pendingEscrow,
        pendingDeposits: pendingDeposits,
        availableBalance: availableBalance,
        requestedAmount: cleanAmount
      });
    }

    // Deduct from wallet
    const balanceBefore = adminWallet.balance;
    adminWallet.balance -= cleanAmount;
    await adminWallet.save({ session });

    // Create withdrawal transaction
    const transaction = await WalletTransaction.create([{
      wallet: adminWallet._id,
      type: 'WITHDRAW',
      amount: -cleanAmount,
      balanceBefore,
      balanceAfter: adminWallet.balance,
      referenceType: 'SYSTEM',
      description: `Admin rút tiền về ${bankInfo.bankName} - ${bankInfo.accountNumber}`,
      status: 'SUCCESS',
      metadata: {
        adminId,
        bankInfo,
        initiatedAt: new Date()
      }
    }], { session, ordered: true });

    await session.commitTransaction();

    // Execute PayOS transfer async
    const transferData = {
      amount: cleanAmount,
      description: `Admin rút GearXpert`,
      accountNumber: bankInfo.accountNumber,
      accountName: bankInfo.accountName,
      bankCode: bankInfo.bankCode
    };

    // Start transfer in background
    processAdminWithdrawal(transaction[0]._id, transferData).catch(err => {
      console.error('[ADMIN WITHDRAWAL] Background transfer error:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Yêu cầu rút tiền đã được gửi',
      transactionId: transaction[0]._id,
      amount: cleanAmount,
      newBalance: adminWallet.balance
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('[ADMIN WITHDRAW ERROR]:', err);
    return res.status(500).json({ message: 'Lỗi rút tiền', error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * GET /api/admin/wallet/lookup-user
 * Tìm kiếm thông tin user theo walletId hoặc email
 */
exports.lookupUserByWallet = async (req, res) => {
  try {
    const { walletId, email } = req.query;
    
    if (!walletId && !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng cung cấp walletId hoặc email' 
      });
    }

    let wallet;
    let user;

    if (walletId) {
      wallet = await Wallet.findById(walletId);
      if (wallet) {
        user = await User.findById(wallet.user);
      }
    } else if (email) {
      // Case-insensitive email search
      user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      if (user) {
        wallet = await Wallet.findOne({ user: user._id });
      }
    }

    if (!user || !wallet) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        fullName: user.fullName || user.username || 'Unknown',
        email: user.email,
        avatar: user.avatar,
        walletId: wallet._id,
        walletBalance: wallet.balance,
        walletStatus: wallet.status
      }
    });
  } catch (err) {
    console.error('[LOOKUP USER ERROR]:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi tìm kiếm', 
      error: err.message 
    });
  }
};

/**
 * POST /api/admin/wallet/transfer
 * Chuyển tiền từ ví hệ thống đến ví cụ thể
 */
exports.transferToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { walletId, userEmail, amount, description, type } = req.body;
    const adminId = req.user.id;

    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    // Find system wallet (source)
    let systemWallet = await Wallet.findOne({ isSystem: true }).session(session);
    if (!systemWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy ví hệ thống' });
    }

    // Find destination wallet
    let destinationWallet;
    if (walletId) {
      destinationWallet = await Wallet.findById(walletId).session(session);
    } else if (userEmail) {
      const user = await User.findOne({ email: userEmail }).session(session);
      if (user) {
        destinationWallet = await Wallet.findOne({ user: user._id }).session(session);
      }
    }

    if (!destinationWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy ví đích' });
    }

    // Check system wallet balance
    if (systemWallet.balance < cleanAmount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Số dư ví hệ thống không đủ',
        currentBalance: systemWallet.balance,
        requestedAmount: cleanAmount
      });
    }

    // Deduct from system wallet
    const systemBalanceBefore = systemWallet.balance;
    systemWallet.balance -= cleanAmount;
    await systemWallet.save({ session });

    // Add to destination wallet
    const destBalanceBefore = destinationWallet.balance;
    destinationWallet.balance += cleanAmount;
    await destinationWallet.save({ session });

    // Create transaction record for admin (debit only)
    const now = new Date();
    const transferType = type || 'TRANSFER';

    // Transfer type labels for clear categorization
    const transferTypeLabels = {
      'TRANSFER': 'Chuyển tiền',
      'SUPPLIER_PAYOUT': 'Trả tiền NCC',
      'CUSTOMER_REFUND': 'Hoàn tiền KH',
      'BONUS': 'Thưởng'
    };
    const typeLabel = transferTypeLabels[transferType] || 'Chuyển tiền';

    // Only create transaction for admin wallet (debit)
    await WalletTransaction.create([{
      wallet: systemWallet._id,
      type: 'ADJUSTMENT',
      amount: -cleanAmount,
      balanceBefore: systemBalanceBefore,
      balanceAfter: systemWallet.balance,
      referenceType: 'SYSTEM',
      description: description || `${typeLabel} đến ví ${destinationWallet._id}`,
      status: 'SUCCESS',
      metadata: {
        adminId,
        destinationWalletId: destinationWallet._id,
        transferType,
        transferLabel: typeLabel,
        transferredAt: now
      }
    }], { session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: 'Chuyển tiền thành công',
      amount: cleanAmount,
      sourceBalance: systemWallet.balance,
      destinationBalance: destinationWallet.balance
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('[ADMIN TRANSFER ERROR]:', err);
    return res.status(500).json({ message: 'Lỗi chuyển tiền', error: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Process admin withdrawal transfer via PayOS
 */
const processAdminWithdrawal = async (transactionId, transferData) => {
  try {
    const transferResult = await transferMoney(transferData);
    
    // Update transaction with transfer result
    await WalletTransaction.findByIdAndUpdate(transactionId, {
      status: transferResult.success ? 'SUCCESS' : 'FAILED',
      payosTransferId: transferResult.transferId || null,
      'metadata.transferResult': transferResult,
      'metadata.completedAt': new Date()
    });

    if (!transferResult.success) {
      // If failed, refund the amount
      const adminWallet = await Wallet.findOne({ isSystem: true });
      if (adminWallet) {
        const transaction = await WalletTransaction.findById(transactionId);
        adminWallet.balance += Math.abs(transaction.amount);
        await adminWallet.save();
        
        await WalletTransaction.create({
          wallet: adminWallet._id,
          type: 'REFUND',
          amount: Math.abs(transaction.amount),
          balanceBefore: adminWallet.balance - Math.abs(transaction.amount),
          balanceAfter: adminWallet.balance,
          referenceType: 'SYSTEM',
          description: `Hoàn tiền do rút tiền thất bại`,
          status: 'SUCCESS',
          metadata: { originalTransactionId: transactionId }
        });
      }
    }
  } catch (err) {
    console.error('[ADMIN WITHDRAWAL PROCESS] Error:', err);
    await WalletTransaction.findByIdAndUpdate(transactionId, {
      status: 'FAILED',
      'metadata.error': err.message
    });
  }
};
