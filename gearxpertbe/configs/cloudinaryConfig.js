const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Storage chính — hỗ trợ cả file, video, ảnh (có transform)
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    const isVideo = /\.(mp4|mov|avi)$/i.test(file.originalname);

    const sanitizedName = file.originalname
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with _
      .toLowerCase();

    return {
      folder: 'gearxpert',
      allowed_formats: ['pdf', 'docx', 'doc', 'jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi'],
      public_id: `file-${Date.now()}-${sanitizedName}`,
      resource_type: isVideo ? 'video' : 'auto',
      ...(isImage && {
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      }),
    };
  },
});

// Storage gốc — dùng cho eKYC hoặc trường hợp cần ảnh chất lượng cao
const storageOriginal = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const sanitizedName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    return {
      folder: 'gearxpert',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: `img-${Date.now()}-${sanitizedName}`,
    };
  },
});

const uploadCloud = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB cho video và file
});

const uploadOriginal = multer({
  storage: storageOriginal,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cho eKYC
});

module.exports = uploadCloud;
module.exports.uploadOriginal = uploadOriginal;