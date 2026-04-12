const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const User = require("../../models/User");
const WithdrawRequest = require("../../models/WithdrawRequest");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");
const { transferMoney } = require("../Wallet/PayOsController");

// Helper function to get transaction type label
function getTransactionTypeLabel(type) {
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

    console.log("[DEBUG] Adjust wallet balance request:", { amount, reason, type, adminId });

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
    console.log("[DEBUG] Found system wallet:", adminWallet ? adminWallet._id : "Not found");
    
    if (!adminWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy ví hệ thống" });
    }

    const balanceBefore = adminWallet.balance;
    const balanceAfter = balanceBefore + parseFloat(amount);

    console.log("[DEBUG] Balance change:", { before: balanceBefore, amount, after: balanceAfter });

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
    }], { session });

    console.log("[DEBUG] Transaction created:", transaction[0]._id);

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

    console.log("[DEBUG] Create manual transaction:", {
      type, amount, description, referenceType, referenceId, targetWalletId, updateBalance, adminId
    });

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

    console.log("[DEBUG] Wallet balance change:", {
      walletId: wallet._id,
      before: balanceBefore,
      change: parsedAmount,
      after: balanceAfter,
      updateBalance
    });

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
      console.log("[DEBUG] Wallet balance updated");
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
    }], { session });

    console.log("[DEBUG] Transaction created:", transaction[0]._id);

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
      escrowHolds,
      depositHolds,
      supplierPayouts,
      customerRefunds,
      serviceFees,
      penaltyFees
    ] = await Promise.all([
      // Platform fees (positive amounts)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "PLATFORM_FEE", amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Escrow holds (positive amounts - money held)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "ESCROW_HOLD", amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Deposit holds (positive amounts - money held)
      WalletTransaction.aggregate([
        { $match: { wallet: adminWallet._id, type: "DEPOSIT_HOLD", amount: { $gt: 0 } } },
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
    const totalExpenses = (supplierPayouts[0]?.total || 0) + (customerRefunds[0]?.total || 0);

    // Calculate total holds (escrow + deposits)
    const totalHolds = (escrowHolds[0]?.total || 0) + (depositHolds[0]?.total || 0);

    // Calculate total revenue (all positive fee transactions)
    const totalFees = (platformFees[0]?.total || 0) + (serviceFees[0]?.total || 0) + (penaltyFees[0]?.total || 0);
    const netProfit = totalFees - totalExpenses;

    // Calculate available balance (excluding holds)
    const availableBalance = Math.max(0, adminWallet.balance - totalHolds);

    res.json({
      wallet: adminWallet,
      totalRevenue: totalFees,
      netProfit: netProfit,
      availableBalance: availableBalance,
      totalPlatformFees: platformFees[0]?.total || 0,
      totalEscrow: escrowHolds[0]?.total || 0,
      totalDeposits: depositHolds[0]?.total || 0,
      totalSupplierPayouts: supplierPayouts[0]?.total || 0,
      totalCustomerRefunds: customerRefunds[0]?.total || 0,
      totalServiceFees: serviceFees[0]?.total || 0,
      totalPenaltyFees: penaltyFees[0]?.total || 0,
      totalExpenses: totalExpenses,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      totalHolds: totalHolds
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
    console.log("=== GET ADMIN WALLET TRANSACTIONS CALLED ===");
    const { type, dateRange, page = 1, limit = 50, search } = req.query;
    
    // Build base filter
    let filter = {};
    
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

    // Search by description or reference
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'metadata.adjustmentReason': { $regex: search, $options: 'i' } }
      ];
    }

    console.log("Transaction filter:", filter);

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
    console.log("[WITHDRAWAL APPROVE] Starting approval for ID:", id);
    
    // Find the withdrawal request (not WalletTransaction)
    const withdrawal = await WithdrawRequest.findById(id).session(session);
    console.log("[WITHDRAWAL APPROVE] Found withdrawal:", withdrawal?._id);
    
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
    console.log("[WITHDRAWAL APPROVE] Found supplier wallet:", supplierWallet?._id);
    
    if (!supplierWallet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Supplier wallet not found" });
    }
    
    // Find supplier user to get bank info
    const supplier = await User.findById(withdrawal.user).session(session);
    console.log("[WITHDRAWAL APPROVE] Found supplier user:", supplier?._id);
    
    // Use bank info from withdrawal request, not user
    const bankInfo = withdrawal.bankInfo;
    console.log("[WITHDRAWAL APPROVE] Bank info from withdrawal request:", bankInfo);
    
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
    
    console.log("[WITHDRAWAL] Processing PayOS transfer:", transferData);
    
    // Execute PayOS transfer
    let transferResult;
    try {
      transferResult = await transferMoney(transferData);
      console.log("[WITHDRAWAL] PayOS transfer successful:", transferResult);
      
      // Check if manual transfer is required
      if (transferResult.requiresManualTransfer) {
        console.log("[WITHDRAWAL] Manual transfer required");
        
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
        }], { session });
        
        await session.commitTransaction();
        
        console.log("[WITHDRAWAL APPROVE] Manual transfer approval completed");
        
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
    }], { session });
    
    await session.commitTransaction();
    
    console.log("[WITHDRAWAL APPROVE] Approval completed successfully");
    
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
    
    console.log("[WITHDRAWAL REJECT] Starting rejection for ID:", id);
    
    if (!reason) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Rejection reason is required" });
    }
    
    // Find the withdrawal request (not WalletTransaction)
    const withdrawal = await WithdrawRequest.findById(id).session(session);
    console.log("[WITHDRAWAL REJECT] Found withdrawal:", withdrawal?._id);
    
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
    
    console.log("[WITHDRAWAL REJECT] Rejection completed successfully");
    
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
