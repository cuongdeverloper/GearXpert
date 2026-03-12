const { GoogleGenerativeAI } = require("@google/generative-ai");
const Device = require("../../models/Device");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getSmartGearSuggestion = async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ message: "Vui lòng nhập nhu cầu của bạn." });
        }

        const availableDevices = await Device.find({
            status: "AVAILABLE",
            stockQuantity: { $gt: 0 }
        }).select("_id name category rentPrice depositAmount");

        if (availableDevices.length === 0) {
            return res.status(404).json({ message: "Hiện không có thiết bị nào khả dụng." });
        }

        const deviceListText = availableDevices.map(d =>
            `ID: ${d._id} | Tên: ${d.name} | Loại: ${d.category} | Giá thuê/ngày: ${d.rentPrice.perDay} VND`
        ).join("\n");

        const aiPrompt = `
  Bạn là một chuyên gia tư vấn thiết bị sự kiện, quay chụp. 
  Khách hàng có nhu cầu: "${prompt}".
  
  Dưới đây là danh sách thiết bị cửa hàng đang có sẵn:
  ${deviceListText}
  
  Hãy chọn ra các thiết bị phù hợp nhất để tạo thành 3 combo (Cơ bản, Tiêu chuẩn, Cao cấp).
  CHỈ trả về ĐÚNG 1 chuỗi JSON theo định dạng dưới đây, không bọc trong markdown (không dùng \`\`\`json), không giải thích thêm:
  {
    "budget": {
      "comboName": "Gói Cơ Bản",
      "description": "Mô tả ngắn vì sao chọn combo này",
      "totalPricePerDay": 0, // Tổng giá thuê 1 ngày của combo này
      "devices": [ 
        { 
          "deviceId": "ID_THIET_BI_Ở_TRÊN", 
          "name": "Tên thiết bị lấy từ danh sách",
          "price": "Giá thuê 1 ngày của thiết bị này",
          "quantity": 1, 
          "reason": "Lý do chọn..." 
        } 
      ]
    },
    "standard": {
      "comboName": "Gói Tiêu Chuẩn",
      "description": "...",
      "totalPricePerDay": 0,
      "devices": [ ... ]
    },
    "premium": {
      "comboName": "Gói Cao Cấp",
      "description": "...",
      "totalPricePerDay": 0,
      "devices": [ ... ]
    }
  }
`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(aiPrompt);
        let responseText = result.response.text();

        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonResult = JSON.parse(responseText);

        res.status(200).json({
            success: true,
            message: "Đề xuất thành công",
            data: jsonResult
        });

    } catch (error) {
        console.error("[SmartGear AI Error]:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi AI xử lý đề xuất. Vui lòng thử lại sau.",
            error: error.message
        });
    }
};