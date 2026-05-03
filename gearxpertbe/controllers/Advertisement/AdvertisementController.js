const Advertisement = require("../../models/Advertisement");
const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const mongoose = require("mongoose");

const createAdvertisement = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { title, description, link, adsType, startDate, endDate, dailyBudget } = req.body;
        const userId = req.user.id; // From auth middleware

        if (!title || !link || !adsType || !startDate || !endDate || !dailyBudget) {
            return res.status(400).json({
                errorCode: 1,
                message: "Vui lòng cung cấp đầy đủ thông tin quảng cáo, lịch trình và ngân sách.",
            });
        }

        const budgetNum = parseInt(dailyBudget);
        const allowedBudgets = [50000, 100000, 200000, 500000];
        if (!allowedBudgets.includes(budgetNum)) {
            return res.status(400).json({
                errorCode: 1,
                message: "Ngân sách hàng ngày không hợp lệ. Vui lòng chọn các mức: 50k, 100k, 200k hoặc 500k.",
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates

        if (diffDays <= 0) {
            return res.status(400).json({
                errorCode: 1,
                message: "Ngày kết thúc phải sau ngày bắt đầu.",
            });
        }

        // adsType parsing
        let typeArray = [];
        if (typeof adsType === 'string') {
            typeArray = [adsType];
        } else if (Array.isArray(adsType)) {
            typeArray = adsType;
        }

        const effectiveDailyBudget = typeArray.length >= 2 ? budgetNum * 2 : budgetNum;

        const totalCost = effectiveDailyBudget * diffDays;

        // 1. Check wallet balance — thu TOÀN BỘ chi phí trước
        const wallet = await Wallet.findOne({ user: userId }).session(session);
        if (!wallet || wallet.balance < totalCost) {
            await session.abortTransaction();
            return res.status(400).json({
                errorCode: 2, // Custom error code for insufficient balance
                message: `Số dư ví không đủ. Bạn cần ít nhất ${totalCost.toLocaleString('vi-VN')}đ để đăng quảng cáo này.`,
            });
        }

        if (!req.file) {
            await session.abortTransaction();
            return res.status(400).json({
                errorCode: 1,
                message: "Vui lòng upload ảnh quảng cáo.",
            });
        }

        const imageUrl = req.file.path;

        // 2. Deduct FULL cost from wallet
        const balanceBefore = wallet.balance;
        wallet.balance -= totalCost;
        await wallet.save({ session });

        // 3. Create wallet transaction
        await WalletTransaction.create([{
            wallet: wallet._id,
            type: 'PAYMENT',
            amount: -totalCost,
            balanceBefore: balanceBefore,
            balanceAfter: wallet.balance,
            status: 'SUCCESS',
            referenceType: 'SYSTEM',
            description: `Thanh toán chi phí quảng cáo: ${title}`
        }], { session, ordered: true });

        // 4. Create Advertisement
        const newAds = new Advertisement({
            userId,
            title,
            description,
            imageUrl,
            link,
            adsType: typeArray,
            startDate: start,
            endDate: end,
            dailyBudget: budgetNum,
            totalCost: totalCost,
            paidAmount: totalCost,
        });

        await newAds.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            errorCode: 0,
            message: "Đăng quảng cáo thành công. Vui lòng chờ quản trị viên phê duyệt.",
            data: newAds,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in createAdvertisement:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi tạo quảng cáo.",
            error: error.message,
        });
    }
};

const getMyAdvertisements = async (req, res) => {
    try {
        const userId = req.user.id;
        const advertisements = await Advertisement.find({ userId }).sort({ createdAt: -1 });
        return res.status(200).json({
            errorCode: 0,
            data: advertisements
        });
    } catch (error) {
        console.error("Error in getMyAdvertisements:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi lấy danh sách quảng cáo của bạn.",
            error: error.message,
        });
    }
};

const getAllAdvertisementsForAdmin = async (req, res) => {
    try {
        const advertisements = await Advertisement.find()
            .populate('userId', 'fullName email phone')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            errorCode: 0,
            data: advertisements
        });
    } catch (error) {
        console.error("Error in getAllAdvertisementsForAdmin:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi lấy danh sách quảng cáo.",
            error: error.message,
        });
    }
};

const updateAdvertisementStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                errorCode: 1,
                message: "Trạng thái không hợp lệ. Chỉ chấp nhận APPROVED hoặc REJECTED.",
            });
        }

        const advertisement = await Advertisement.findById(id).session(session);

        if (!advertisement) {
            await session.abortTransaction();
            return res.status(404).json({
                errorCode: 1,
                message: "Không tìm thấy quảng cáo.",
            });
        }

        // Refund logic khi REJECTED — hoàn tiền chưa sử dụng
        if (status === 'REJECTED' && ['PENDING', 'APPROVED'].includes(advertisement.status) && advertisement.paidAmount > 0) {
            let refundAmount = 0;
            const now = new Date();
            const start = new Date(advertisement.startDate);

            // Tính effectiveDailyBudget (x2 nếu chạy cả BANNER + POPUP)
            const adsTypeCount = Array.isArray(advertisement.adsType) ? advertisement.adsType.length : 1;
            const effectiveDailyBudget = adsTypeCount >= 2 ? advertisement.dailyBudget * 2 : advertisement.dailyBudget;

            if (advertisement.status === 'PENDING' || now < start) {
                // Chưa chạy ngày nào → hoàn 100%
                refundAmount = advertisement.paidAmount;
            } else {
                // Đang chạy → tính số ngày đã dùng, hoàn phần còn lại
                const diffTime = Math.abs(now - start);
                const usedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                const costOfUsedDays = usedDays * effectiveDailyBudget;
                if (advertisement.paidAmount > costOfUsedDays) {
                    refundAmount = advertisement.paidAmount - costOfUsedDays;
                }
            }

            if (refundAmount > 0) {
                const wallet = await Wallet.findOne({ user: advertisement.userId }).session(session);
                if (wallet) {
                    const balanceBefore = wallet.balance;
                    wallet.balance += refundAmount;
                    await wallet.save({ session });

                    await WalletTransaction.create([{
                        wallet: wallet._id,
                        type: 'REFUND',
                        amount: refundAmount,
                        balanceBefore: balanceBefore,
                        balanceAfter: wallet.balance,
                        status: 'SUCCESS',
                        referenceType: 'SYSTEM',
                        description: `Hoàn tiền quảng cáo bị từ chối: ${advertisement.title}`
                    }], { session, ordered: true });
                }
            }
        }

        advertisement.status = status;
        await advertisement.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            errorCode: 0,
            message: `Quảng cáo đã được ${status === 'APPROVED' ? 'phê duyệt' : 'từ chối'}.`,
            data: advertisement,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in updateAdvertisementStatus:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi cập nhật trạng thái quảng cáo.",
            error: error.message,
        });
    }
};

const getApprovedBanners = async (req, res) => {
    try {
        const now = new Date();
        const banners = await Advertisement.find({
            status: 'APPROVED',
            adsType: 'BANNER',
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ dailyBudget: -1, createdAt: -1 });

        return res.status(200).json({
            errorCode: 0,
            data: banners
        });
    } catch (error) {
        console.error("Error in getApprovedBanners:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi lấy danh sách banner.",
            error: error.message,
        });
    }
};

const getApprovedPopups = async (req, res) => {
    try {
        const now = new Date();
        const popups = await Advertisement.find({
            status: 'APPROVED',
            adsType: 'POPUP', // Filter for POPUP type
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ dailyBudget: -1, createdAt: -1 });

        return res.status(200).json({
            errorCode: 0,
            data: popups
        });
    } catch (error) {
        console.error("Error in getApprovedPopups:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi lấy danh sách popup.",
            error: error.message,
        });
    }
};

const deleteAdvertisement = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const advertisement = await Advertisement.findOne({ _id: id, userId }).session(session);

        if (!advertisement) {
            await session.abortTransaction();
            return res.status(404).json({
                errorCode: 1,
                message: "Không tìm thấy quảng cáo hoặc bạn không có quyền xóa quảng cáo này.",
            });
        }

        let refundAmount = 0;
        const now = new Date();

        if (advertisement.status === 'PENDING') {
            // Full refund if still pending
            refundAmount = advertisement.paidAmount;
        } else if (advertisement.status === 'APPROVED') {
            const start = new Date(advertisement.startDate);

            // Tính effectiveDailyBudget (x2 nếu chạy cả BANNER + POPUP)
            const adsTypeCount = Array.isArray(advertisement.adsType) ? advertisement.adsType.length : 1;
            const effectiveDailyBudget = adsTypeCount >= 2 ? advertisement.dailyBudget * 2 : advertisement.dailyBudget;

            if (now < start) {
                // Full refund if hasn't started yet
                refundAmount = advertisement.paidAmount;
            } else {
                // Calculate used days if already started
                const diffTime = Math.abs(now - start);
                const usedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                const costOfUsedDays = usedDays * effectiveDailyBudget;

                // Refund only if they paid more than what they used
                if (advertisement.paidAmount > costOfUsedDays) {
                    refundAmount = advertisement.paidAmount - costOfUsedDays;
                }
            }
        }

        if (refundAmount > 0) {
            const wallet = await Wallet.findOne({ user: userId }).session(session);
            if (wallet) {
                const balanceBefore = wallet.balance;
                wallet.balance += refundAmount;
                await wallet.save({ session });

                await WalletTransaction.create([{
                    wallet: wallet._id,
                    type: 'REFUND',
                    amount: refundAmount,
                    balanceBefore: balanceBefore,
                    balanceAfter: wallet.balance,
                    status: 'SUCCESS',
                    referenceType: 'SYSTEM',
                    description: `Hoàn tiền xóa quảng cáo sớm: ${advertisement.title}`
                }], { session, ordered: true });
            }
        }

        await Advertisement.findByIdAndDelete(id).session(session);

        await session.commitTransaction();
        session.endSession();

        let message = "Xóa quảng cáo thành công.";
        if (refundAmount > 0) {
            message += ` Đã hoàn lại ${refundAmount.toLocaleString('vi-VN')}₫ vào ví của bạn.`;
        }

        return res.status(200).json({
            errorCode: 0,
            message: message,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in deleteAdvertisement:", error);
        return res.status(500).json({
            errorCode: -1,
            message: "Có lỗi xảy ra khi xóa quảng cáo.",
            error: error.message,
        });
    }
};

module.exports = {
    createAdvertisement,
    getMyAdvertisements,
    getAllAdvertisementsForAdmin,
    updateAdvertisementStatus,
    getApprovedBanners,
    getApprovedPopups,
    deleteAdvertisement,
};
