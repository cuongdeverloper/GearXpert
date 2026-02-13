const axios = require('axios');
const FormData = require('form-data');
const User = require('../../models/User');

const FACEPP_API_KEY = process.env.FACEPP_API_KEY;
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET;
const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";

const FPT_API_KEY = process.env.FPT_API_KEY; 
const FPT_OCR_URL = "https://api.fpt.ai/vision/idr/vnm";

const verifyIdentity = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({message: "Unauthorized"});
    
    if (!FACEPP_API_KEY || !FPT_API_KEY) {
        return res.status(500).json({message: "Missing API Keys config"});
    }

    if (!req.files || !req.files.cccdFront || !req.files.cccdBack || !req.files.selfie) {
        return res.status(400).json({ success: false, message: "Vui lòng tải lên đủ: Mặt trước, Mặt sau và ảnh Selfie" });
    }

    const cccdFrontUrl = req.files.cccdFront[0].path; 
    const cccdBackUrl = req.files.cccdBack[0].path;   
    const selfieUrl = req.files.selfie[0].path;       

    console.log("🔍 Đang kiểm tra CCCD bằng FPT.AI...");
    
    const imageResponse = await axios.get(cccdFrontUrl, { responseType: 'stream' });
    
    const fptFormData = new FormData();
    fptFormData.append('image', imageResponse.data);

    const fptResponse = await axios.post(FPT_OCR_URL, fptFormData, {
        headers: { 
            'api-key': FPT_API_KEY,
            ...fptFormData.getHeaders() 
        },
        timeout: 30000 
    });

    const fptData = fptResponse.data;

    if (fptData.errorCode !== 0 || !fptData.data || fptData.data.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Không nhận diện được thẻ. Vui lòng đảm bảo ảnh chụp là mặt trước CCCD/CMND."
        });
    }

    const cccdInfo = fptData.data[0];
    const idNumber = cccdInfo.id ? cccdInfo.id.replace(/\D/g, '') : '';

    if (idNumber.length !== 12) {
        return res.status(400).json({
            success: false,
            message: "Ảnh không hợp lệ. Đây không phải là CCCD (yêu cầu định dạng đúng 12 số)."
        });
    }

    if (!cccdInfo.name) {
         return res.status(400).json({
            success: false,
            message: "Ảnh quá mờ hoặc bị lóa sáng, không đọc được họ tên. Vui lòng chụp lại."
        });
    }

    console.log(`✅ Xác thực giấy tờ OK - FPT đọc số CCCD: ${idNumber}`);
    console.log("🔍 Đang đối chiếu khuôn mặt bằng Face++...");

    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('image_url1', cccdFrontUrl); 
    formData.append('image_url2', selfieUrl); 

    const response = await axios.post(FACEPP_URL, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 30000 
    });

    const data = response.data;
    const confidence = data.confidence; 
    
    console.log(`🎯 ĐIỂM ĐỘ GIỐNG NHAU: ${confidence}%`);

    const isMatch = confidence >= 60;

    let updatedUser = null;
    if (isMatch) {
        const userId = req.user.id;
        updatedUser = await User.findByIdAndUpdate(userId, {
            $set: {
                isVerifiedEkyc: true,
                "identityInfo.cccdFrontImage": cccdFrontUrl,
                "identityInfo.cccdBackImage": cccdBackUrl,
                "identityInfo.faceMatchScore": confidence,
                "identityInfo.verifiedAt": new Date()
            }
        }, { new: true });
    }

    return res.status(200).json({
      success: isMatch,
      confidence: confidence,
      user: updatedUser,
      message: isMatch 
        ? "Xác thực thành công!" 
        : "Khuôn mặt không khớp. Vui lòng thử lại."
    });

  } catch (error) {
    const errorMsg = error.response?.data?.error_message || error.response?.data?.errorMessage || error.message;
    console.error(errorMsg);

    let vnMessage = "Lỗi hệ thống khi xử lý AI. Vui lòng thử lại.";

    if (errorMsg.includes("CONCURRENCY_LIMIT_EXCEEDED")) {
        vnMessage = "Hệ thống đang bận (Quá tải yêu cầu). Vui lòng đợi 5 giây rồi thử lại.";
    } 
    else if (errorMsg.includes("IMAGE_ERROR") || errorMsg.includes("bad_image")) {
        vnMessage = "Không tải được ảnh hoặc link ảnh bị lỗi.";
    }
    else if (errorMsg.includes("INVALID_IMAGE_SIZE")) {
        vnMessage = "Kích thước ảnh quá lớn hoặc quá nhỏ.";
    }
    else if (errorMsg.includes("NO_FACE_FOUND")) {
        vnMessage = "Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp rõ nét hơn.";
    }
    else if (errorMsg.includes("AUTHENTICATION_ERROR") || error.response?.status === 401) {
        vnMessage = "Lỗi cấu hình Server (Sai API Key/Secret của FPT hoặc Face++).";
    }
    else if (errorMsg.includes("ECONNRESET") || errorMsg.includes("timeout")) {
        vnMessage = "Mạng không ổn định hoặc ảnh quá nặng. Vui lòng kiểm tra lại đường truyền.";
    }

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