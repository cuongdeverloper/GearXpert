const express = require('express');
const router = express.Router();
const passport = require('passport');
const { createRefreshToken, createJWT } = require('../middleware/JWTAction');

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/redirect',
    passport.authenticate('google', { failureRedirect: 'http://localhost:2468/signin' }),
    (req, res) => {
        // Create a payload for JWT
        const payload = {
            email: req.user.email,
            name: req.user.fullName,
            role: req.user.role,
            id: req.user.id
        };
        // Generate access and refresh tokens
        const accessToken = createJWT(payload);
        const refreshToken = createRefreshToken(payload);

        // Construct the redirect URL
        const redirectUrl = `http://localhost:2468/auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${encodeURIComponent(JSON.stringify(req.user))}`;

        res.redirect(redirectUrl);
    }
);
module.exports = router;