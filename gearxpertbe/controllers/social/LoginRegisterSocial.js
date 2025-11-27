const User = require("../../modal/User");

const upsertSocialMedia = async (typeAcc, dataRaw) => {
    try {
        let dataUser = await User.findOne({ email: dataRaw.email });

        if (dataUser) {
            if (dataUser.type !== typeAcc) {
                dataUser.type = typeAcc;
                dataUser.googleId = dataRaw.googleId;
                dataUser.profileImage = dataRaw.photo;
                dataUser.image = dataRaw.photo;
                dataUser.socialLogin = true;
                await dataUser.save();
            }
        } else {
            dataUser = new User({
                email: dataRaw.email,
                username: dataRaw.name,
                type: typeAcc,
                profileImage: dataRaw.photo,
                image: dataRaw.photo,
                socialLogin: true,
                googleId: dataRaw.googleId
            });
            await dataUser.save();
        }

        return dataUser;
    } catch (error) {
        console.error('Error in upsertSocialMedia:', error);
        throw error;
    }
};

module.exports = { upsertSocialMedia };
