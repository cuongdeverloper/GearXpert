const express = require('express');
const router = express.Router();
const passport = require('passport');
const { createRefreshToken, createJWT } = require('../middleware/JWTAction');
const FRONTEND_URL = process.env.FRONTEND_URL

router.get('/auth/google', (req, res, next) => {
    const isMobile = req.query.mobile === 'true';
    const state = isMobile ? 'mobile' : 'web';
    passport.authenticate('google', { scope: ['profile', 'email'], state: state })(req, res, next);
});

router.get('/google/redirect', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        const isMobile = req.query.state === 'mobile';
        if (err) {
            console.error("Google auth error:", err);
            const errorMessage = encodeURIComponent(err.message || 'Xác thực thất bại');
            if (isMobile) {
                return res.redirect(`gearxpertmobile://oauth2/callback?error=${errorMessage}`);
            }
            return res.redirect(`${FRONTEND_URL}/signin?error=${errorMessage}`);
        }
        if (!user) {
            if (isMobile) {
                return res.redirect(`gearxpertmobile://oauth2/callback?error=user_not_found`);
            }
            return res.redirect(`${FRONTEND_URL}/signin`);
        }

        // success logic (must manually log in if using custom callback)
        req.logIn(user, (loginErr) => {
            if (loginErr) return next(loginErr);

            const payload = {
                email: user.email,
                name: user.fullName,
                role: user.role,
                id: user.id
            };
            const accessToken = createJWT(payload);
            const refreshToken = createRefreshToken(payload);

            const isMobile = req.query.state === 'mobile';

            let redirectUrl;
            if (isMobile) {
                redirectUrl = `gearxpertmobile://oauth2/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${encodeURIComponent(JSON.stringify(user))}`;
            } else {
                redirectUrl = `${FRONTEND_URL}/auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${encodeURIComponent(JSON.stringify(user))}`;
            }
            res.redirect(redirectUrl);
        });
    })(req, res, next);
});
module.exports = router;