const express = require('express');
const router = express.Router();
const authController = require('../controllers/Auth/authController');
const { checkAccessToken } = require('../middleware/JWTAction');


router.post('/register', authController.apiRegister);

router.post('/login', authController.apiLogin);

router.get('/verify-account', authController.verifyAccountByLink);

router.post('/verify-otp', authController.verifyOtp);

router.post('/resend-otp', authController.resendOTPVerificationCode);

router.post('/forgot-password', authController.requestPasswordReset);

router.post('/reset-password', authController.resetPassword);


router.post('/decode-token', (req, res) => {
    const { token } = req.body;
    const data = decodeToken(token);
    if (data) {
        res.json({ data });
    } else {
        res.status(400).json({ error: 'Invalid token' });
    }
});


router.post('/change-password', checkAccessToken, authController.changePassword);

module.exports = router;