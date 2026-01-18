const axios = require('axios');
const FormData = require('form-data');
const User = require('../../models/User');

// --- LẤY KEY TỪ FILE .ENV ---
const FACEPP_API_KEY = process.env.FACEPP_API_KEY;
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET;
const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";

const verifyIdentity = async (req, res) => {
  try {

    // if (!req.user || !req.user.id) {
    //     return res.status(401).json({
    //         success: false,
    //         message: "Bạn chưa đăng nhập hoặc Token không hợp lệ."
    //     });
    // }

    // Kiểm tra Key
    if (!FACEPP_API_KEY || !FACEPP_API_SECRET) {
         return res.status(500).json({ 
            success: false, 
            message: "Lỗi Server: Chưa cấu hình API Key Face++" 
         });
    }

    // 2. Lấy URL ảnh từ Cloudinary (Đã upload qua Middleware Multer)
    if (!req.files || !req.files.cccd || !req.files.selfie) {
        return res.status(400).json({ success: false, message: "Thiếu ảnh CCCD hoặc ảnh Selfie" });
    }
    const cccdUrl = req.files.cccd[0].path;
    const selfieUrl = req.files.selfie[0].path;


    // 3. Chuẩn bị dữ liệu gửi sang Face++
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('image_url1', cccdUrl);   
    formData.append('image_url2', selfieUrl); 

    // 4. Gọi API Face++
    const response = await axios.post(FACEPP_URL, formData, {
        headers: { ...formData.getHeaders() }
    });

    // 5. Xử lý kết quả trả về
    const data = response.data;
    const confidence = data.confidence; 
    
    // Ngưỡng xác thực: > 70 điểm
    const isMatch = confidence > 70; 

    // 🔥 [MỚI]: CẬP NHẬT DATABASE NẾU THÀNH CÔNG 🔥
    if (isMatch) {
        const userId = req.user.id; // Lấy ID từ Token

        await User.findByIdAndUpdate(userId, {
            isVerified: true, // Đánh dấu đã xác thực
            
            // Cập nhật object identityInfo theo Schema mới
            identityInfo: {
                cccdFrontImage: cccdUrl, // Lưu ảnh bằng chứng
                // cccdNumber: null,     // Chưa có OCR nên để null (Schema có sparse: true nên không lỗi)
                faceMatchScore: confidence,
                verifiedAt: new Date()
            },

            // Bonus: Tăng điểm uy tín hoặc Rank (nếu muốn)
            // $inc: { rewardPoints: 100 } 
        });
    }

    return res.status(200).json({
      success: isMatch,
      confidence: confidence,
      message: isMatch 
        ? "Xác thực thành công! Tài khoản của bạn đã được nâng cấp." 
        : "Xác thực thất bại! Khuôn mặt không khớp với CCCD."
    });

  } catch (error) {
    // Log lỗi chi tiết
    const errorMsg = error.response ? error.response.data.error_message : error.message;
    console.error("❌ Lỗi eKYC:", errorMsg);

    let vnMessage = "Lỗi Server xử lý AI";
    if (errorMsg && errorMsg.includes("IMAGE_ERROR")) vnMessage = "Ảnh lỗi hoặc không tải được";
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