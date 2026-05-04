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

    // Lấy danh sách thiết bị khả dụng
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

    let jsonResult;

    // --- BẮT ĐẦU BLOCK XỬ LÝ AI CÓ FALLBACK ---
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(aiPrompt);
      let responseText = result.response.text();

      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      jsonResult = JSON.parse(responseText);

    } catch (aiError) {
      console.warn("[SmartGear Fallback] AI bị lỗi. Kích hoạt fallback thông minh.", aiError.message);
      // 1. Tách các từ khóa khách hàng nhập vào
      const searchTerms = prompt.toLowerCase().split(/\s+/).filter(t => t.length > 1);

      // 2. Lọc danh sách thiết bị có chứa từ khóa trong tên hoặc danh mục
      const matchedDevices = availableDevices.filter(device => {
        const textToSearch = `${device.name} ${device.category}`.toLowerCase();
        // Trả về true nếu có bất kỳ từ khóa nào khớp
        return searchTerms.some(term => textToSearch.includes(term));
      });

      // 3. Nếu tìm thấy đồ khớp thì dùng, nếu khách nhập sai/không có đồ thì mới lấy mặc định
      const sourceList = matchedDevices.length > 0 ? matchedDevices : availableDevices;
      // --- KẾT THÚC NÂNG CẤP ---

      // Lấy an toàn 3 thiết bị từ danh sách đã lọc (sourceList)
      const d1 = sourceList[0];
      const d2 = sourceList.length > 1 ? sourceList[1] : d1;
      const d3 = sourceList.length > 2 ? sourceList[2] : d2;

      jsonResult = {
        "budget": {
          "comboName": lang === 'en' ? "Basic Bundle (Auto)" : "Gói Cơ Bản (Tự động)",
          "description": lang === 'en' ? "Standard suggestion due to high traffic." : "Gợi ý tiêu chuẩn do hệ thống AI đang bận.",
          "totalPricePerDay": d1.rentPrice.perDay,
          "devices": [{
            "deviceId": d1._id,
            "name": d1.name,
            "price": d1.rentPrice.perDay,
            "quantity": 1,
            "reason": lang === 'en' ? "Highly recommended standard choice." : "Lựa chọn tiêu chuẩn được đánh giá cao."
          }]
        },
        "standard": {
          "comboName": lang === 'en' ? "Standard Bundle (Auto)" : "Gói Tiêu Chuẩn (Tự động)",
          "description": lang === 'en' ? "A balanced package for most needs." : "Gói thiết bị cân bằng cho hầu hết các nhu cầu.",
          "totalPricePerDay": d1.rentPrice.perDay + d2.rentPrice.perDay,
          "devices": [
            { "deviceId": d1._id, "name": d1.name, "price": d1.rentPrice.perDay, "quantity": 1, "reason": "Base unit" },
            { "deviceId": d2._id, "name": d2.name, "price": d2.rentPrice.perDay, "quantity": 1, "reason": "Standard addition" }
          ]
        },
        "premium": {
          "comboName": lang === 'en' ? "Premium Bundle (Auto)" : "Gói Cao Cấp (Tự động)",
          "description": lang === 'en' ? "Full setup for professional requirements." : "Bộ thiết bị đầy đủ đáp ứng nhu cầu chuyên nghiệp.",
          "totalPricePerDay": d1.rentPrice.perDay + d2.rentPrice.perDay + d3.rentPrice.perDay,
          "devices": [
            { "deviceId": d1._id, "name": d1.name, "price": d1.rentPrice.perDay, "quantity": 1, "reason": "Base unit" },
            { "deviceId": d2._id, "name": d2.name, "price": d2.rentPrice.perDay, "quantity": 1, "reason": "Enhancement" },
            { "deviceId": d3._id, "name": d3.name, "price": d3.rentPrice.perDay, "quantity": 1, "reason": "Premium quality" }
          ]
        }
      };
    }
    // --- KẾT THÚC BLOCK XỬ LÝ AI ---

    // Luôn trả về 200 OK để frontend hiển thị được dữ liệu (dù là thật hay dự phòng)
    res.status(200).json({
      success: true,
      message: lang === 'en' ? "Suggestion success" : "Đề xuất thành công",
      data: jsonResult
    });

  } catch (error) {
    // Catch này chỉ còn bắt các lỗi đặc biệt nghiêm trọng của Server (vd: mất kết nối Database)
    console.error("[SmartGear Server Error]:", error);
    res.status(500).json({
      success: false,
      message: req.body.lang === 'en' ? "Server processing error. Please try again later." : "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
      error: error.message
    });
  }
};