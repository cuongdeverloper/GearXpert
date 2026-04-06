const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const User = require("../../models/User");
const WithdrawRequest = require("../../models/WithdrawRequest");
const mongoose = require("mongoose");
const { Parser } = require("json2csv");

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
    const transactionType = parseFloat(amount) > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const transaction = await WalletTransaction.create([{
      wallet: adminWallet._id,
      type: transactionType,
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
    res.status(500).json({ message: "Lỗi khi điều chỉnh số dư" });
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
      targetWalletId 
    } = req.body;
    const adminId = req.user.id;

    // Validate
    if (!type || !amount || !description) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const validTypes = ["PLATFORM_FEE", "SERVICE_FEE", "PENALTY_FEE", "TOP_UP", 
                       "REFUND", "ADJUSTMENT", "ESCROW_HOLD", "DEPOSIT_HOLD"];
    if (!validTypes.includes(type)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Loại giao dịch không hợp lệ" });
    }

    let walletId;
    let wallet;

    // If target wallet specified, use it; otherwise use system wallet
    if (targetWalletId) {
      wallet = await Wallet.findById(targetWalletId).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Không tìm thấy ví đích" });
      }
      walletId = targetWalletId;
    } else {
      wallet = await Wallet.findOne({ isSystem: true }).session(session);
      if (!wallet) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Không tìm thấy ví hệ thống" });
      }
      walletId = wallet._id;
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + parseFloat(amount);

    // Update wallet balance if it's a system wallet or if amount affects balance
    if (wallet.isSystem || type === "TOP_UP" || type === "REFUND") {
      wallet.balance = balanceAfter;
      await wallet.save({ session });
    }

    // Create transaction
    const transaction = await WalletTransaction.create([{
      wallet: walletId,
      type,
      amount: parseFloat(amount),
      balanceBefore,
      balanceAfter,
      referenceType: referenceType || "SYSTEM",
      referenceId: referenceId || null,
      description,
      status: "SUCCESS",
      metadata: {
        createdBy: adminId,
        isManual: true,
        createdAt: new Date()
      }
    }], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Tạo giao dịch thành công",
      transaction: transaction[0]
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create manual transaction error:", error);
    res.status(500).json({ message: "Lỗi khi tạo giao dịch" });
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
function getTransactionTypeLabel(type) {
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
    console.log("Request user:", req.user);
    console.log("Request params:", req.query);
    const { type, dateRange } = req.query;
    
    // Find system wallet first
    const adminWallet = await Wallet.findOne({ isSystem: true });
    if (!adminWallet) {
      return res.status(404).json({ message: "Admin wallet not found" });
    }
    
    console.log("Found system wallet for transactions:", adminWallet._id);
    
    // Build filter for system wallet transactions
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

    // Include all transaction types from the system
    const allTransactionTypes = [
      "PLATFORM_FEE", "ESCROW_HOLD", "DEPOSIT_HOLD", 
      "SUPPLIER_PAYOUT", "CUSTOMER_REFUND", "SERVICE_FEE", "PENALTY_FEE",
      "TOP_UP", "WITHDRAW", "PAYMENT", "REFUND"
    ];

    if (type && type !== "ALL") {
      filter.type = type;
    } else {
      // If no specific type, include all financial transaction types
      if (!filter.type) {
        filter.type = { $in: allTransactionTypes };
      }
    }

    console.log("Transaction filter:", filter);

    const transactions = await WalletTransaction.find(filter)
      .populate('referenceType', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    console.log("Found transactions:", transactions.length);

    res.json({
      transactions,
      total: transactions.length,
    });
  } catch (error) {
    console.error("Get admin wallet transactions error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    
    // Find the withdrawal transaction
    const withdrawal = await WalletTransaction.findById(id).session(session);
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
    
    // Check if supplier has sufficient balance
    if (supplierWallet.balance < Math.abs(withdrawal.amount)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    // Update withdrawal status
    withdrawal.status = "APPROVED";
    withdrawal.processedAt = new Date();
    await withdrawal.save({ session });
    
    // Create withdrawal completion transaction
    await WalletTransaction.create([{
      wallet: supplierWallet._id,
      type: "WITHDRAWAL_COMPLETED",
      amount: withdrawal.amount, // Negative amount for money out
      balanceBefore: supplierWallet.balance,
      balanceAfter: supplierWallet.balance + withdrawal.amount,
      referenceType: "WITHDRAWAL",
      referenceId: withdrawal._id,
      description: `Withdrawal completed - ${withdrawal.description}`,
      status: "SUCCESS"
    }], { session });
    
    await session.commitTransaction();
    
    res.json({
      message: "Withdrawal request approved successfully",
      withdrawalId: withdrawal._id
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Approve withdrawal error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    
    // Find the withdrawal transaction
    const withdrawal = await WalletTransaction.findById(id).session(session);
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
    
    // Update withdrawal status
    withdrawal.status = "REJECTED";
    withdrawal.processedAt = new Date();
    withdrawal.description = `Rejected: ${reason} - ${withdrawal.description}`;
    await withdrawal.save({ session });
    
    // Since withdrawal was rejected, money goes back to supplier wallet
    // The withdrawal request was already deducted from available balance, so we need to restore it
    supplierWallet.balance += Math.abs(withdrawal.amount);
    await supplierWallet.save({ session });
    
    // Create rejection transaction
    await WalletTransaction.create([{
      wallet: supplierWallet._id,
      type: "WITHDRAWAL_REJECTED",
      amount: Math.abs(withdrawal.amount), // Positive amount for money back
      balanceBefore: supplierWallet.balance - Math.abs(withdrawal.amount),
      balanceAfter: supplierWallet.balance,
      referenceType: "WITHDRAWAL",
      referenceId: withdrawal._id,
      description: `Withdrawal rejected: ${reason}`,
      status: "SUCCESS"
    }], { session });
    
    await session.commitTransaction();
    
    res.json({
      message: "Withdrawal request rejected successfully",
      withdrawalId: withdrawal._id
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Reject withdrawal error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    session.endSession();
  }
};
