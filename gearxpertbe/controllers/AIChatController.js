require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Device = require("../models/Device"); 

console.log("Check Key Gemini:", process.env.GEMINI_API_KEY ? "Đã nhận Key" : "CHƯA CÓ KEY!");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const handleAIChat = async (req, res) => {
  try {
    const { message } = req.body;
    const queryText = message ? message.toLowerCase().trim() : "";

    let relevantProducts = await Device.find({
      $or: [
        { name: { $regex: queryText, $options: "i" } },
        { category: { $regex: queryText, $options: "i" } }
      ]
    })
    .select("name rentPrice status description category specs stockQuantity")
    .limit(5); 
    if (!relevantProducts || relevantProducts.length === 0) {
      relevantProducts = await Device.find({ status: 'AVAILABLE' })
        .sort({ createdAt: -1 })
        .limit(20) 
        .select("name rentPrice description status category specs stockQuantity");
    }

    const productContext = relevantProducts.map(p => {
      const priceDay = p.rentPrice?.perDay ? p.rentPrice.perDay.toLocaleString() + " VNĐ" : "Liên hệ";
      
      let specsText = "Cơ bản";
      if (p.specs && p.specs instanceof Map) {
         specsText = JSON.stringify(Object.fromEntries(p.specs));
      } else if (typeof p.specs === 'object') {
         specsText = JSON.stringify(p.specs);
      }

      return `
      - Tên: ${p.name}
      - Giá: ${priceDay}/ngày
      - Kho: ${p.stockQuantity} cái
      - Trạng thái: ${p.status}
      - Cấu hình: ${specsText}
      `;
    }).join("\n"); 

  
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Bạn là nhân viên tư vấn GearXpert.
          
          DỮ LIỆU KHO HÀNG HIỆN TẠI:
          ${productContext}
          
          KHÁCH HỎI: "${message}"
          
          YÊU CẦU:
          1. Tìm trong dữ liệu kho hàng xem có món khách cần không.
          2. Nếu có: Báo giá và số lượng tồn kho.
          3. Nếu KHÔNG có: Gợi ý sản phẩm tương tự trong danh sách, hoặc báo hết hàng.
          4. Trả lời ngắn gọn, thân thiện, dùng Icon.` }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return res.status(200).json({ success: true, reply: text });

  } catch (error) {
    console.error("LỖI AI:", error);
    return res.status(500).json({
      success: false,
      reply: "Hệ thống đang bảo trì AI, bạn vui lòng quay lại sau!",
      error: error.message
    });
  }
};

module.exports = { handleAIChat };