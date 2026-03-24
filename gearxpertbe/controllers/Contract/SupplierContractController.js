const SupplierContract = require('../../models/SupplierContract');
const User = require('../../models/User');

exports.requestToBecomeSupplier = async (req, res) => {
  try {
    const userId = req.user._id; 
    const { agreedToTerms, contractSignature } = req.body;

    const user = await User.findById(userId);

    if (user.role === 'SUPPLIER') {
      return res.status(400).json({ success: false, message: 'Bạn đã là Nhà cung cấp rồi.' });
    }

    if (!user.isVerifiedEkyc) {
      return res.status(403).json({ 
        success: false, 
        message: 'Vui lòng hoàn thành xác thực danh tính (eKYC) trước khi ký hợp đồng.' 
      });
    }

    const existingContract = await SupplierContract.findOne({ user: userId, status: 'PENDING' });
    if (existingContract) {
      return res.status(400).json({ 
        success: false, 
        message: 'Yêu cầu của bạn đang được xử lý. Vui lòng chờ phản hồi từ hệ thống.' 
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ success: false, message: 'Bạn phải đồng ý với các điều khoản của hợp đồng.' });
    }

    const newContract = new SupplierContract({
      user: userId,
      agreedToTerms,
      contractSignature 
    });

    await newContract.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Gửi yêu cầu thành công. Vui lòng chờ Admin phê duyệt.' 
    });

  } catch (error) {
    console.error("Lỗi requestToBecomeSupplier:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};