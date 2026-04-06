const SupplierContract = require('../../models/SupplierContract');
const User = require('../../models/User');
const fs = require("fs/promises");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
require("../../configs/cloudinaryConfig"); 
const cloudinary = require("cloudinary").v2;

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip;
};

const loadFirstExistingFile = async (paths) => {
  for (const p of paths) {
    try {
      await fs.stat(p);
      return p;
    } catch (e) {
      // ignore
    }
  }
  return null;
};

const base64DataURLToArrayBuffer = (dataURL) => {
  const base64Regex = /^data:image\/(png|jpg|jpeg|svg|svg\+xml);base64,/;
  if (!base64Regex.test(dataURL)) {
    return false;
  }
  const stringBase64 = dataURL.replace(base64Regex, "");
  const binaryString = Buffer.from(stringBase64, "base64").toString("binary");
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const buildSupplierContractDocx = async (data) => {
  const templatePath = path.join(
    __dirname,
    "../../../gearxpertfe/public/contracts/GearXpert_Contact_Supplier.docx"
  );
  
  const content = await fs.readFile(templatePath, "binary");
  const zip = new PizZip(content);

  const opts = {
    centered: false,
    fileType: "docx",
    getImage: function (tagValue, tagName) {
      if (tagValue && tagValue.startsWith("data:image")) {
        return base64DataURLToArrayBuffer(tagValue);
      }
      return Buffer.from("");
    },
    getSize: function (img, tagValue, tagName) {
      return [180, 70]; 
    },
  };
  const imageModule = new ImageModule(opts);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    modules: [imageModule],
    delimiters: { start: '{{', end: '}}' },
  });

  doc.render({
    ...data,
    signatureImage: data.signatureDataUrl, // Chạy qua {%signatureImage}
  });

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  return buf;
};

const uploadSignedSupplierDocxToCloudinary = async (docxBytes, userId) => {
  const publicId = `supplier-contract-${userId}-${Date.now()}`;
  const docxBuffer = Buffer.isBuffer(docxBytes) ? docxBytes : Buffer.from(docxBytes);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // DOCX must be uploaded as raw
        folder: "gearxpert/supplier-contracts",
        public_id: `${publicId}.docx`,
        overwrite: true,
        invalidate: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    uploadStream.end(docxBuffer);
  });
};

exports.previewSupplierContract = async (req, res) => {
  try {
    const { 
      supplierType, fullName, taxCode, idNumber, issueDate, issuePlace, 
      address, representative, position, phone, email, bankAccount,
      signerName, currentDate, signatureDataUrl 
    } = req.body;
    
    if (!signatureDataUrl) {
      return res.status(400).json({ message: "Vui lòng cung cấp chữ ký điện tử." });
    }

    const docxBuf = await buildSupplierContractDocx({
      supplierType, fullName, taxCode, idNumber, issueDate, issuePlace,
      address, representative, position, phone, email, bankAccount,
      signerName, currentDate, signatureDataUrl
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="HopDongThuCungCapThietBi.docx"'
    );
    res.send(docxBuf);
  } catch (error) {
    console.error("Preview supplier contract error:", error);
    
    // Bắt lỗi syntax file Word từ docxtemplater
    if (error.properties && error.properties.errors) {
      const errorMessages = error.properties.errors
        .map((e) => e.properties.explanation)
        .join("; ");
      return res.status(400).json({ 
        message: "Lỗi định dạng cấu trúc file Word (Mẫu hợp đồng): " + errorMessages 
      });
    }

    res.status(500).json({
      message: "Lỗi tạo preview hợp đồng supplier",
      error: error.message,
    });
  }
};

exports.requestToBecomeSupplier = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { 
      agreedToTerms, signerName, signatureDataUrl,
      supplierType, fullName, taxCode, idNumber, issueDate, issuePlace, 
      address, representative, position, phone, email, bankAccount 
    } = req.body;

    const user = await User.findById(userId);
    if (user.role === 'SUPPLIER') {
      return res.status(400).json({ success: false, message: 'Bạn đã là Nhà cung cấp rồi.' });
    }

    if (!user.isVerifiedEkyc) {
      return res.status(403).json({ 
        success: false, 
        message: 'Vui lòng hoàn thành xác thực danh tính (eKYC) trước khi ký hợp đồng.' 
      });
    }

    const existingContract = await SupplierContract.findOne({ user: userId, status: 'PENDING' });
    if (existingContract) {
      return res.status(400).json({ 
        success: false, 
        message: 'Yêu cầu của bạn đang được xử lý. Vui lòng chờ phản hồi từ hệ thống.' 
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ success: false, message: 'Bạn phải đồng ý với các điều khoản của hợp đồng.' });
    }

    if (!signatureDataUrl) {
      return res.status(400).json({
        success: false,
        message: "Bạn phải ký chữ ký điện tử (vẽ chữ ký) trước khi gửi yêu cầu.",
      });
    }

    const effectiveSignerName = (signerName || user.fullName || "").trim();
    const currentDate = new Date().toLocaleDateString("vi-VN");

    const signedDocxBytes = await buildSupplierContractDocx({
      supplierType, fullName, taxCode, idNumber, issueDate, issuePlace,
      address, representative, position, phone, email, bankAccount,
      signerName: effectiveSignerName,
      currentDate,
      signatureDataUrl,
    });

    const uploadResult = await uploadSignedSupplierDocxToCloudinary(
      signedDocxBytes,
      userId
    );

    const newContract = new SupplierContract({
      user: userId,
      agreedToTerms,
      signerName: effectiveSignerName,
      signatureDataUrl,
      signedPdfUrl: uploadResult?.secure_url || uploadResult?.url,
      signedPdfPublicId: uploadResult?.public_id,
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || "",
      contractVersion: "v1",
      status: "PENDING",
    });

    await newContract.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Gửi yêu cầu thành công. Vui lòng chờ Admin phê duyệt.',
      signedPdfUrl: newContract.signedPdfUrl,
    });
  } catch (error) {
    console.error("Lỗi requestToBecomeSupplier:", error);
    
    if (error.properties && error.properties.errors) {
      const errorMessages = error.properties.errors
        .map((e) => e.properties.explanation)
        .join("; ");
      return res.status(400).json({ 
        success: false,
        message: "Lỗi định dạng cấu trúc file Word (Mẫu hợp đồng): " + errorMessages 
      });
    }

    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
