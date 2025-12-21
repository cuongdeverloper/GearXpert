require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("Check Key Gemini:", process.env.GEMINI_API_KEY ? "Đã nhận Key" : "CHƯA CÓ KEY!");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const mockProductDB = [
  { id: 1, name: "Chuột Gaming Logitech G102", price: "450.000 VNĐ", status: "Còn hàng", desc: "Led RGB, 8000 DPI, phù hợp tay nhỏ." },
  { id: 2, name: "Bàn phím cơ Keychron K2", price: "1.890.000 VNĐ", status: "Hết hàng", desc: "Layout 75%, kết nối Bluetooth, Switch Gateron." },
  { id: 3, name: "Tai nghe HyperX Cloud II", price: "2.100.000 VNĐ", status: "Còn hàng", desc: "Âm thanh vòm 7.1, mic lọc tạp âm cực tốt." },
  { id: 4, name: "Ghế Công Thái Học Epione", price: "4.500.000 VNĐ", status: "Còn hàng", desc: "Lưới nhập khẩu, piston Class 4." }
];

const handleAIChat = async (req, res) => {
  try {
    const { message } = req.body;

    const query = message ? message.toLowerCase() : "";
    let relevantProducts = mockProductDB.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.desc.toLowerCase().includes(query)
    );

    if (relevantProducts.length === 0) relevantProducts = mockProductDB.slice(0, 3);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Bạn là trợ lý ảo của GearXpert. Chỉ được dùng dữ liệu này để tư vấn: ${JSON.stringify(relevantProducts)}. Trả lời ngắn gọn, thân thiện.` }],
        },
        {
          role: "model",
          parts: [{ text: "Đã rõ! Tôi là GearXpert AI, tôi sẵn sàng hỗ trợ khách hàng dựa trên danh sách sản phẩm bạn cung cấp." }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return res.status(200).json({ success: true, reply: text });

  } catch (error) {
    console.error("LỖI CHI TIẾT:", error);
    return res.status(500).json({
      success: false,
      reply: "Cửa hàng đang bảo trì AI, bạn vui lòng quay lại sau!",
      error: error.message
    });
  }
};

module.exports = { handleAIChat };