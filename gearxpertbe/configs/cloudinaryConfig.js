const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    return {
      folder: 'gearxpert',
      allowed_formats: ['pdf', 'docx', 'doc', 'jpg', 'png', 'jpeg', 'webp'],
      public_id: `img-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
      ...(isImage && {
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      }),
    };
  },
});

// Storage without transformation — for eKYC or cases needing original quality
const storageOriginal = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gearxpert',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: (req, file) => `img-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
  },
});

const uploadCloud = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

const uploadOriginal = multer({
  storage: storageOriginal,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for eKYC
});

module.exports = uploadCloud;
module.exports.uploadOriginal = uploadOriginal;
