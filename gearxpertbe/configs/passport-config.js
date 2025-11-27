const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { upsertSocialMedia } = require('../controller/social/LoginRegisterSocial');
const User = require('../modal/User');
require('dotenv').config();

// Serialize user ID into the session
passport.serializeUser((user, done) => {
    done(null, user._id); // Store user ID in session
});

// Deserialize user ID from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id); // Fetch user by ID
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// Configure Google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_APP_CLIENT_ID,
    clientSecret: process.env.GOOGLE_APP_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_APP_CLIENT_REDIRECT_LOGIN
}, async (accessToken, refreshToken, profile, done) => {
    const typeAcc = 'GOOGLE';
        let dataRaw = {
            name: profile.displayName,
            email: profile.emails[0].value,
            profileImage: profile.photos[0].value,
            googleId: profile.id,
        }
        // Handle user upsertion
       let user = await upsertSocialMedia(typeAcc,dataRaw)
        done(null, user);
    
}));

module.exports = passport;
