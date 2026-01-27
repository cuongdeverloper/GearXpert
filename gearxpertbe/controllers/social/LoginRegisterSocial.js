const User = require("../../models/User");
const { ensureUserWallet } = require("../../services/WalletService");

const upsertSocialMedia = async (typeAcc, dataRaw) => {
    try {
        let dataUser = await User.findOne({ email: dataRaw.email });

        if (dataUser) {
            if (dataUser.status === 'BLOCKED') {
                throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.');
            }

            // Chỉ cập nhật type và socialLogin nếu tài khoản chưa có mật khẩu (tức là tài khoản thuần social trước đó)
            // Nếu đã có mật khẩu (tài khoản Local), giữ nguyên để user có thể dùng mật khẩu/đổi mật khẩu
            if (!dataUser.password) {
                dataUser.type = typeAcc;
                dataUser.socialLogin = true;
            }

            // Chỉ cập nhật avatar nếu user chưa có avatar
            if (!dataUser.avatar) {
                dataUser.avatar = dataRaw.photo;
            }

            if (dataRaw.googleId) dataUser.googleId = dataRaw.googleId;

            await dataUser.save();
        } else {
            dataUser = new User({
                fullName: dataRaw.name,
                email: dataRaw.email,
                type: typeAcc,
                avatar: dataRaw.photo,
                socialLogin: true,
                googleId: dataRaw.googleId,
                isVerified: true,
                role: 'CUSTOMER'
            });

            await dataUser.save();
        }

        // Đảm bảo người dùng có ví (tạo mới nếu chưa có)
        await ensureUserWallet(dataUser._id);

        return dataUser;
    } catch (error) {
        console.error('Error in upsertSocialMedia:', error);
        throw error;
    }
};

module.exports = { upsertSocialMedia };