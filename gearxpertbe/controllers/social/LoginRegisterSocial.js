const User = require("../../models/User");
const { ensureUserWallet } = require("../../services/WalletService");

const upsertSocialMedia = async (typeAcc, dataRaw) => {
    try {
        let dataUser = await User.findOne({ email: dataRaw.email });

        if (dataUser) {
            dataUser.type = typeAcc;
            dataUser.avatar = dataRaw.photo || dataUser.avatar;
            dataUser.socialLogin = true;
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