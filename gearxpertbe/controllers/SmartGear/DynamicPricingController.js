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
        const currentActiveDiscounts = await Device.find({ 
            supplierId, 
            discountPrice: { $gt: 0 } 
        }).select("_id");
        const excludedIds = currentActiveDiscounts.map(d => d._id);

        const devices = await Device.find({ 
            supplierId, 
            status: "AVAILABLE",
            _id: { $nin: excludedIds }
        }).select("_id name category rentPrice stockQuantity slug");

        if (!devices || devices.length === 0) {
            return res.status(200).json({ success: true, suggestions: [], message: "No items available for new suggestions." });
        }

        let allStats = [];
        for (const device of devices) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const rentalCount = await RentalItem.countDocuments({
                deviceId: device._id,
                createdAt: { $gte: thirtyDaysAgo }
            });

            allStats.push({
                deviceId: device._id,
                name: device.name,
                slug: device.slug,
                originalPrice: device.rentPrice.perDay,
                rentalCount: rentalCount,
                category: device.category
            });
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
        Bạn là chuyên gia Marketing cho GearXpert.
        Mục tiêu: Đưa ra lý do thuyết phục bằng tiếng Việt để Supplier giảm giá thiết bị nhằm tăng lượt thuê.
        
        Sản phẩm:
        ${baseSuggestions.map(s => `- ID: ${s.deviceId}, Tên: ${s.name}, Lượt thuê/tháng: ${s.rentalCount}`).join("\n")}

        Yêu cầu:
        1. Viết 1 câu lý do cực ngắn gọn (max 15 từ), hấp dẫn.
        2. Trả về JSON mảng đối tượng: [{"deviceId": "...", "reason": "..."}]
        3. CHỈ trả về JSON nguyên bản, không bọc markdown.
        `;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(aiPrompt);
            let responseText = result.response.text();
            
            responseText = responseText.replace(/```json/g, "").replace(/```/g, "").replace(/JSON/g, "").trim();
            const startIdx = responseText.indexOf("[");
            const endIdx = responseText.lastIndexOf("]");
            if (startIdx !== -1 && endIdx !== -1) {
                responseText = responseText.substring(startIdx, endIdx + 1);
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
