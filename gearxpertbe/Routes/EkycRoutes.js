const express = require('express');
const router = express.Router();
const { verifyIdentity } = require('../controllers/Ekyc/EkycController');
const { checkAccessToken } = require('../middleware/JWTAction');
const { uploadOriginal } = require('../configs/cloudinaryConfig');

const cpUpload = uploadOriginal.fields([
    { name: 'cccdFront', maxCount: 1 },
    { name: 'cccdBack', maxCount: 1 },  
    { name: 'selfie', maxCount: 1 }   
]);

router.post('/verify', checkAccessToken, cpUpload, verifyIdentity);

module.exports = router;