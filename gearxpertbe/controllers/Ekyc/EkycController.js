const axios = require('axios');
const FormData = require('form-data');

// --- LẤY KEY TỪ FILE .ENV ---
const FACEPP_API_KEY = process.env.FACEPP_API_KEY;
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET;
const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";

const verifyIdentity = async (req, res) => {
  try {
    // [DEBUG] Kiểm tra xem đã load được Key chưa (Chỉ bật khi lỗi)
    // console.log("Current Key:", FACEPP_API_KEY ? "Đã có" : "Chưa có");

    if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
         return res.status(500).json({ 
            success: false, 
            message: "Lỗi Server: Chưa cấu hình API Key Face++ trong file .env" 
         });
    }

    // 2. Lấy URL ảnh từ Cloudinary
    const cccdUrl = req.files.cccd[0].path;
    const selfieUrl = req.files.selfie[0].path;


    // 3. Chuẩn bị dữ liệu gửi sang Face++
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('image_url1', cccdUrl);   // Ảnh 1: CCCD
    formData.append('image_url2', selfieUrl); // Ảnh 2: Selfie

    // 4. Gọi API
    const response = await axios.post(FACEPP_URL, formData, {
        headers: {
            ...formData.getHeaders() // Header bắt buộc cho form-data
        }
    });

    // 5. Xử lý kết quả trả về
    const data = response.data;
    const confidence = data.confidence; // Điểm giống nhau (0 -> 100)
    
    // Ngưỡng xác thực: Trên 70 điểm là cùng 1 người
    const isMatch = confidence > 70; 

    // console.log(`✅ Kết quả so sánh: ${confidence}%`);

    return res.status(200).json({
      success: isMatch,
      confidence: confidence,
      message: isMatch 
        ? "Xác thực thành công! Khuôn mặt trùng khớp." 
        : "Xác thực thất bại! Khuôn mặt không khớp."
    });

  } catch (error) {
    // Log lỗi chi tiết để dễ debug
    const errorMsg = error.response ? error.response.data.error_message : error.message;
    // console.error("❌ Lỗi Face++:", errorMsg);

    // Dịch lỗi tiếng Anh của Face++ sang tiếng Việt cho dễ hiểu
    let vnMessage = "Lỗi Server xử lý AI";
    if (errorMsg && errorMsg.includes("IMAGE_ERROR")) vnMessage = "Không tải được ảnh (Link lỗi hoặc ảnh quá mờ)";
    if (errorMsg && errorMsg.includes("NO_FACE_FOUND")) vnMessage = "Không tìm thấy khuôn mặt trong ảnh";
    
    return res.status(500).json({ 
      success: false, 
      message: vnMessage,
      debug_info: errorMsg
    });
  }
};

module.exports = {
  verifyIdentity
};