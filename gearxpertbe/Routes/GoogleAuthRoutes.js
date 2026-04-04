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
        
        const sendMobileRedirect = (url) => {
            res.send(`
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>Redirecting...</title>
                </head>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <h2>Đang quay lại App...</h2>
                    <p>Đang xử lý đăng nhập, vui lòng chờ.</p>
                    <a href="${url}" style="padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px;">Nhấn vào đây nếu App không tự mở</a>
                    <script>
                        window.location.href = "${url}";
                        setTimeout(() => { window.location.href = "${url}"; }, 1000);
                    </script>
                </body>
            </html>
            `);
        };

        if (err) {
            console.error("Google auth error:", err);
            const errorMessage = encodeURIComponent(err.message || 'Xác thực thất bại');
            if (isMobile) {
                return sendMobileRedirect(`gearxpertmobile://oauth2/callback?error=${errorMessage}`);
            }
            return res.redirect(`${FRONTEND_URL}/signin?error=${errorMessage}`);
        }
        if (!user) {
            if (isMobile) {
                return sendMobileRedirect(`gearxpertmobile://oauth2/callback?error=user_not_found`);
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

            if (isMobile) {
                const redirectUrl = `gearxpertmobile://oauth2/callback?accessToken=${encodeURIComponent(accessToken)}`;
                return sendMobileRedirect(redirectUrl);
            } else {
                const redirectUrl = `${FRONTEND_URL}/auth/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${encodeURIComponent(JSON.stringify(user))}`;
                return res.redirect(redirectUrl);
            }
        });
    })(req, res, next);
});
module.exports = router;