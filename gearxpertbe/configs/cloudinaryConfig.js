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
  params: {
    folder: 'gearxpert',
    allowed_formats: ['pdf', 'docx', 'doc', 'jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi'],
    public_id: (req, file) => `file-${Date.now()}-${file.originalname}`,
    resource_type: 'auto',
  },
});

const uploadCloud = multer({ storage: storage });

module.exports = uploadCloud;
