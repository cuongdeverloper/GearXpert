const passport = require('passport');
const { upsertSocialMedia } = require('./LoginRegisterSocial');
const User = require("../../modal/User");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const doLoginWGoogle = () => {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_APP_CLIENT_ID,
        clientSecret: process.env.GOOGLE_APP_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_APP_CLIENT_REDIRECT_LOGIN
    },
    async (accessToken, refreshToken, profile, cb) => {
        const typeAcc = 'GOOGLE';
        let dataRaw = {
            name: profile.displayName,
            email: profile.emails?.[0]?.value || "",
            photo: profile.photos?.[0]?.value || "",
            googleId: profile.id
        };
        
        try {
            let dataUser = await upsertSocialMedia(typeAcc, dataRaw);
            return cb(null, dataUser);
        } catch (error) {
            return cb(error);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
}

module.exports = doLoginWGoogle;
