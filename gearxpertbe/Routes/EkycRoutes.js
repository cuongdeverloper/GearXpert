const express = require('express');
const router = express.Router();
const uploadCloud = require('../configs/cloudinaryConfig');
const { verifyIdentity } = require('../controllers/Ekyc/EkycController');
const { checkAccessToken } = require('../middleware/JWTAction');


// Định nghĩa route POST /verify
// Sử dụng uploadCloud để nhận 2 ảnh: 'cccd' và 'selfie'
router.post('/verify',uploadCloud.fields([
    { name: 'cccd', maxCount: 1 }, 
    { name: 'selfie', maxCount: 1 }
]), verifyIdentity);

module.exports = router;