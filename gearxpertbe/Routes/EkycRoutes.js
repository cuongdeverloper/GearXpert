const express = require('express');
const router = express.Router();
const { verifyIdentity } = require('../controllers/Ekyc/EkycController');
const { checkAccessToken } = require('../middleware/JWTAction');
const uploadCloud = require('../configs/cloudinaryConfig');

const cpUpload = uploadCloud.fields([
    { name: 'cccdFront', maxCount: 1 },
    { name: 'cccdBack', maxCount: 1 },  
    { name: 'selfie', maxCount: 1 }   
]);

router.post('/verify', checkAccessToken, cpUpload, verifyIdentity);

module.exports = router;