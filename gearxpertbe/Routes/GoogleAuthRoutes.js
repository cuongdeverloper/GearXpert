const express = require('express');
const router = express.Router();
const passport = require('passport');
const { createRefreshToken, createJWT } = require('../middleware/JWTAction');

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/redirect', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        if (err) {
            console.error("Google auth error:", err);
            const errorMessage = encodeURIComponent(err.message || 'Xác thực thất bại');
            return res.redirect(`http://localhost:2468/signin?error=${errorMessage}`);
        }
        if (!user) {
            return res.redirect('http://localhost:2468/signin');
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

            const redirectUrl = `http://localhost:2468/auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${encodeURIComponent(JSON.stringify(user))}`;
            res.redirect(redirectUrl);
        });
    })(req, res, next);
});
module.exports = router;