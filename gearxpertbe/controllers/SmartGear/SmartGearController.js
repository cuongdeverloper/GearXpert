const { GoogleGenerativeAI } = require("@google/generative-ai");
const Device = require("../../models/Device");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getSmartGearSuggestion = async (req, res) => {
  try {
    const { prompt, lang = 'vi' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        message: lang === 'en' ? "Please enter your needs." : "Vui lòng nhập nhu cầu của bạn."
      });
    }

    const availableDevices = await Device.find({
      status: "AVAILABLE",
      stockQuantity: { $gt: 0 }
    }).select("_id name category rentPrice depositAmount");

    if (availableDevices.length === 0) {
      return res.status(404).json({
        message: lang === 'en' ? "No devices currently available." : "Hiện không có thiết bị nào khả dụng."
      });
    }

    const deviceListText = availableDevices.map(d =>
      `ID: ${d._id} | Name: ${d.name} | Category: ${d.category} | Price/Day: ${d.rentPrice.perDay} VND`
    ).join("\n");

    const aiPrompt = lang === 'en' ? `
  You are an expert event and photography equipment consultant.
  Customer requirement: "${prompt}".
  
  Below is a list of currently available equipment:
  ${deviceListText}
  
  Please select the most suitable devices to create 3 combos (Basic, Standard, Premium).
  ONLY return a valid JSON string in the format below, do not wrap in markdown (no \`\`\`json), and no further explanation:
  {
    "budget": {
      "comboName": "Basic Bundle",
      "description": "Short description of why this combo was chosen",
      "totalPricePerDay": 0,
      "devices": [ 
        { 
          "deviceId": "DEVICE_ID_FROM_LIST", 
          "name": "Device name from list",
          "price": "Daily price of this device",
          "quantity": 1, 
          "reason": "Reason for choosing..." 
        } 
      ]
    },
    "standard": {
      "comboName": "Standard Bundle",
      "description": "...",
      "totalPricePerDay": 0,
      "devices": [ ... ]
    },
    "premium": {
      "comboName": "Premium Bundle",
      "description": "...",
      "totalPricePerDay": 0,
      "devices": [ ... ]
    }
  }
` : `
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
      "totalPricePerDay": 0, 
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
      message: lang === 'en' ? "Suggestion success" : "Đề xuất thành công",
      data: jsonResult
    });

  } catch (error) {
    console.error("[SmartGear AI Error]:", error);
    res.status(500).json({
      success: false,
      message: req.body.lang === 'en' ? "AI processing error. Please try again later." : "Lỗi khi AI xử lý đề xuất. Vui lòng thử lại sau.",
      error: error.message
    });
  }
};