const axios = require('axios');
const FormData = require('form-data');
const User = require('../../models/User');
const fs = require('fs');

const FACEPP_API_KEY = process.env.FACEPP_API_KEY;
const FACEPP_API_SECRET = process.env.FACEPP_API_SECRET;
const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3/compare";
const FACEPP_OCR_URL = "https://api-us.faceplusplus.com/facepp/v3/ocr/idcard";

const verifyIdentity = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
        if (!FACEPP_API_KEY) return res.status(500).json({ message: "Missing API Key" });

        if (!req.files || !req.files.cccdFront || !req.files.cccdBack || !req.files.selfie) {
            return res.status(400).json({ success: false, message: "Vui lòng tải lên đủ: Mặt trước, Mặt sau và ảnh Selfie" });
        }

        const cccdFrontUrl = req.files.cccdFront[0].path;
        const cccdBackUrl = req.files.cccdBack[0].path;
        const selfieUrl = req.files.selfie[0].path;
        try {
            const ocrResponse = await axios.post(FACEPP_OCR_URL, ocrFormData, {
                headers: { ...ocrFormData.getHeaders() },
                timeout: 30000
            });

            const ocrData = ocrResponse.data;

            if (!ocrData.cards || ocrData.cards.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Ảnh mặt trước không hợp lệ. Không tìm thấy thông tin giấy tờ tùy thân."
                });
            }

            const cardType = ocrData.cards[0].type; 
            console.log("Loại giấy tờ phát hiện:", cardType);


        } catch (ocrError) {
            console.error("Lỗi OCR:", ocrError.response?.data || ocrError.message);
            return res.status(400).json({
                success: false,
                message: "Không thể đọc thông tin trên ảnh. Vui lòng chụp rõ nét CCCD."
            });
        }
        const ocrFormData = new FormData();
        ocrFormData.append('api_key', FACEPP_API_KEY);
        ocrFormData.append('api_secret', FACEPP_API_SECRET);
        ocrFormData.append('image_url', cccdFrontUrl);

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

        const isMatch = confidence >= 65;

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
        const errorMsg = error.response?.data?.error_message || error.message;
        console.error(errorMsg);

        let vnMessage = "Lỗi hệ thống khi xử lý AI. Vui lòng thử lại.";

        if (errorMsg.includes("CONCURRENCY_LIMIT_EXCEEDED")) {
            vnMessage = "Hệ thống đang bận (Quá tải yêu cầu). Vui lòng đợi 5 giây rồi thử lại.";
        }
        else if (errorMsg.includes("IMAGE_ERROR")) {
            vnMessage = "Không tải được ảnh hoặc link ảnh bị lỗi.";
        }
        else if (errorMsg.includes("INVALID_IMAGE_SIZE")) {
            vnMessage = "Kích thước ảnh quá lớn hoặc quá nhỏ.";
        }
        else if (errorMsg.includes("NO_FACE_FOUND")) {
            vnMessage = "Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp rõ nét hơn.";
        }
        else if (errorMsg.includes("AUTHENTICATION_ERROR")) {
            vnMessage = "Lỗi cấu hình Server (Sai API Key/Secret).";
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