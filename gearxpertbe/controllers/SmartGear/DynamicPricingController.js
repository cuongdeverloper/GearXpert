const { GoogleGenerativeAI } = require("@google/generative-ai");
const Device = require("../../models/Device");
const RentalItem = require("../../models/RentalItem");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GET AI Discount Suggestions (Transient / On-Demand)
 */
exports.getDiscountSuggestions = async (req, res) => {
    try {
        const supplierId = req.user.id;

        // Fetch current active discount IDs to exclude them from suggestions
        const mongoose = require("mongoose");
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const allStats = await Device.aggregate([
            {
                // 1. Lọc thiết bị khả dụng của supplier và CHƯA có giảm giá
                $match: {
                    supplierId: new mongoose.Types.ObjectId(supplierId),
                    status: "AVAILABLE",
                    $or: [
                        { discountPrice: { $exists: false } },
                        { discountPrice: 0 },
                        { discountPrice: null }
                    ]
                }
            },
            {
                // 2. JOIN với bảng RentalItem để lấy các đơn thuê trong 30 ngày
                $lookup: {
                    from: "rentalitems",
                    let: { devId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$deviceId", "$$devId"] },
                                createdAt: { $gte: thirtyDaysAgo }
                            }
                        }
                    ],
                    as: "recentRentals"
                }
            },
            {
                // 3. Format dữ liệu và TÍNH TỔNG QUANITY thay vì đếm số dòng
                $project: {
                    _id: 0,
                    deviceId: "$_id",
                    name: 1,
                    slug: 1,
                    category: 1,
                    originalPrice: "$rentPrice.perDay",
                    rentalCount: {
                        $reduce: {
                            input: "$recentRentals",
                            initialValue: 0,
                            in: { $add: ["$$value", "$$this.quantity"] }
                        }
                    }
                }
            }
        ]);

        if (!allStats || allStats.length === 0) {
            return res.status(200).json({ success: true, suggestions: [], message: "No items available for new suggestions." });
        }

        let candidates = allStats.filter(s => s.rentalCount < 5);
        if (candidates.length === 0) {
            candidates = allStats.sort((a, b) => a.rentalCount - b.rentalCount).slice(0, 3);
        } else {
            candidates = candidates.sort((a, b) => a.rentalCount - b.rentalCount).slice(0, 5);
        }

        const baseSuggestions = candidates.map(s => {
            let discountPercent = 10;
            if (s.rentalCount === 0) discountPercent = 15;
            else if (s.rentalCount < 3) discountPercent = 12;
            return {
                ...s,
                discountPercent,
                suggestedPrice: Math.floor(s.originalPrice * (1 - discountPercent / 100))
            };
        });

        const aiPrompt = `
        Bạn là Chuyên gia Tư vấn Tối ưu Doanh thu (Revenue Optimization) cho nền tảng GearXpert - chuyên cho thuê thiết bị Media chuyên nghiệp (Camera, Studio, Lighting...).
        
        MỤC TIÊU: Viết lời khuyên (Marketing Reason) cực kỳ thuyết phục để Supplier đồng ý giảm giá, giúp giải phóng hàng tồn hoặc tăng độ phủ thương hiệu. Lời khuyên đóng vai trò như một chuyên gia tư vấn chiến lược kinh doanh chứ không phải là lời chào mời đơn thuần.
        
        DANH SÁCH THIẾT BỊ:
        ${baseSuggestions.map(s => `- ID: ${s.deviceId} | Tên: ${s.name} | Danh mục: ${s.category} | Lượt thuê: ${s.rentalCount}/tháng`).join("\n")}

        HƯỚNG DẪN VIẾT THEO DANH MỤC:
        1. Máy ảnh/Flycam: Tập trung vào việc "Bắt trọn khoảnh khắc chuyên nghiệp", phù hợp cho mùa sự kiện.
        2. Ống kính (Lenses): Nhấn mạnh vào "Độ sắc nét tuyệt đối", là nâng cấp đáng giá cho các nhiếp ảnh gia.
        3. Ánh sáng/Studio: Tập trung vào "Vibe chuyên nghiệp", giúp dự án của khách hàng trông điện ảnh hơn.
        4. Audio/Mic: Nhấn mạnh "Âm thanh sạch, chuẩn ghi âm", nâng tầm chất lượng hậu kỳ.
        5. Phụ kiện khác: Nhấn mạnh sự "Tiện lợi, tối ưu chi phí" khi thuê kèm.

        CHIẾN THUẬT THEO HIỆU SUẤT (Vận dụng lý do kinh doanh & Tâm lý học định giá):
        - Lượt thuê = 0 (Hàng tồn/Cold Start): Thuyết phục Supplier xem đây là khoản "chi phí đầu tư Marketing bắt buộc" để có đơn hàng đầu tiên và thu hút đánh giá (Review). Đưa ra lý do: Chấp nhận giảm biên độ lợi nhuận ngắn hạn để 'phá băng', đưa thiết bị vào thuật toán đề xuất của nền tảng, giúp xoay vòng vốn thay vì để máy móc phủ bụi và chịu chi phí hao mòn vô ích.
        - Lượt thuê 1-4 (Sản phẩm chậm/Underperforming): Thuyết phục Supplier rằng thiết bị có tiềm năng nhưng đang thiếu sức bật hiển thị để leo top. Đưa ra lý do: Cần một 'cú hích' (Sale Nudge) để tăng năng lực cạnh tranh, luân chuyển thiết bị liên tục, và mục tiêu lớn nhất là biến những khách hàng 'thuê thử' này thành tệp khách hàng trung thành, mang lại dòng tiền đều đặn.

        YÊU CẦU KỸ THUẬT:
        - Mỗi lý do viết tối đa 35-50 từ, hành văn bằng tiếng Việt tự nhiên, thuyết phục, mang đậm ngôn ngữ kinh doanh (có thể dùng từ ngữ như: vòng quay vốn, độ phủ, thị phần, hao mòn, ROI).
        - Trả về JSON mảng đối tượng: [{"deviceId": "...", "reason": "..."}]
        - Chỉ trả về dữ liệu JSON duy nhất, tuyệt đối không kèm markdown code block (như \`\`\`json) và không có bất kỳ văn bản giải thích nào khác.
        `;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(aiPrompt);
            let responseText = result.response.text();

            // Sử dụng Regex để trích xuất mảng JSON từ văn bản (phòng trường hợp AI trả về markdown)
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            } else {
                throw new Error("Could not find JSON array in AI response");
            }

            const aiReasons = JSON.parse(responseText);
            const finalSuggestions = baseSuggestions.map(s => {
                const aiMatch = aiReasons.find(r => String(r.deviceId) === String(s.deviceId));
                return {
                    ...s,
                    reason: aiMatch ? aiMatch.reason : `Sản phẩm đang có lượt thuê thấp (${s.rentalCount} lượt/tháng). Hãy áp dụng ưu đãi này để kích cầu!`
                };
            });

            return res.status(200).json({ success: true, suggestions: finalSuggestions });
        } catch (aiError) {
            const fallbackSuggestions = baseSuggestions.map(s => ({
                ...s,
                reason: `Sản phẩm đang có lượt thuê thấp (${s.rentalCount} lượt/tháng). Hãy áp dụng ưu đãi này để kích cầu!`
            }));
            return res.status(200).json({ success: true, suggestions: fallbackSuggestions });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
};

/**
 * GET All Active Discounts for Supplier
 */
exports.getActiveDiscounts = async (req, res) => {
    try {
        const supplierId = req.user.id;
        const now = new Date();

        const activeDiscounts = await Device.find({
            supplierId,
            discountPrice: { $gt: 0 },
            $or: [
                { discountExpiry: { $exists: false } },
                { discountExpiry: null },
                { discountExpiry: { $gt: now } }
            ]
        }).select("_id name category rentPrice discountPrice discountReason discountExpiry slug");

        const formatted = activeDiscounts.map(d => ({
            deviceId: d._id,
            name: d.name,
            slug: d.slug,
            category: d.category,
            originalPrice: d.rentPrice.perDay,
            discountPrice: d.discountPrice,
            reason: d.discountReason,
            expiry: d.discountExpiry,
            discountPercent: Math.round((1 - d.discountPrice / d.rentPrice.perDay) * 100)
        }));

        res.status(200).json({ success: true, activeDiscounts: formatted });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách giảm giá" });
    }
};

/**
 * Apply AI Suggested Discount
 */
exports.applyDiscount = async (req, res) => {
    try {
        const { deviceId, discountPrice, reason, durationInDays } = req.body;
        const supplierId = req.user.id;

        const device = await Device.findOne({ _id: deviceId, supplierId });
        if (!device) return res.status(404).json({ message: "Thiết bị không tồn tại" });

        device.discountPrice = discountPrice;
        device.discountReason = reason;

        if (durationInDays && durationInDays > 0) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + parseInt(durationInDays));
            device.discountExpiry = expiryDate;
        } else {
            device.discountExpiry = null;
        }

        await device.save();
        res.status(200).json({ success: true, message: "Đã áp dụng giảm giá thành công!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi áp dụng giảm giá" });
    }
};

/**
 * Revoke/Remove Discount
 */
exports.removeDiscount = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const supplierId = req.user.id;

        const device = await Device.findOne({ _id: deviceId, supplierId });
        if (!device) return res.status(404).json({ message: "Thiết bị không tồn tại" });

        device.discountPrice = 0;
        device.discountReason = "";
        device.discountExpiry = null;

        await device.save();
        res.status(200).json({ success: true, message: "Đã hủy giảm giá cho sản phẩm." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi hủy giảm giá" });
    }
};
