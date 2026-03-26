const SupplierContract = require('../../models/SupplierContract');
const User = require('../../models/User');
const fs = require("fs/promises");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
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

const embedSignatureImage = async (pdfDoc, signatureDataUrl) => {
  if (!signatureDataUrl) return null;

  const match = signatureDataUrl.match(/^data:image\/(\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Chữ ký không đúng định dạng (data URL).");
  }

  const type = match[1]?.toLowerCase();
  const base64Data = match[2];
  const bytes = Buffer.from(base64Data, "base64");

  if (type === "png") return pdfDoc.embedPng(bytes);
  if (type === "jpg" || type === "jpeg") return pdfDoc.embedJpg(bytes);

  throw new Error("Định dạng chữ ký không hỗ trợ. Vui lòng dùng PNG/JPG.");
};

const buildSupplierContractPdf = async ({
  signerName,
  currentDate,
  signatureDataUrl,
}) => {
  const templateCandidates = [
    // Preferred: keep template close to backend (if you later add it there)
    path.join(__dirname, "../../templatesContract/GearXpert_Contact_Supplier.pdf"),
    path.join(__dirname, "../../templatesContract/GearXpert_Supplier_Contract.pdf"),

    // Fallback: use FE public contract in this monorepo
    path.join(
      __dirname,
      "../../../gearxpertfe/public/contracts/GearXpert_Contact_Supplier.pdf"
    ),
  ];

  const templatePath = await loadFirstExistingFile(templateCandidates);
  if (!templatePath) {
    throw new Error(
      "Không tìm thấy file hợp đồng mẫu supplier. Vui lòng thêm PDF template vào backend."
    );
  }

  const fontPath = path.join(__dirname, "../../fonts/DejaVuSans.ttf");
  const pdfBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(await fs.readFile(fontPath));

  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width: pageWidth } = page.getSize();

  const safeName = (signerName || "").trim() || "Người ký";
  const safeDate = (currentDate || "").trim() || new Date().toLocaleDateString("vi-VN");

  // Place signature at bottom-right of last page (works even if template has no form fields)
  const sigWidth = 180;
  const sigHeight = 70;
  const sigX = Math.max(40, pageWidth - sigWidth - 70);
  const sigY = 80;

  page.drawText(safeName, {
    x: sigX,
    y: sigY + sigHeight + 18,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(safeDate, {
    x: sigX,
    y: sigY + sigHeight + 4,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  const signatureImage = await embedSignatureImage(pdfDoc, signatureDataUrl);
  if (signatureImage) {
    page.drawImage(signatureImage, {
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
    });
  }

  return pdfDoc.save();
};

const uploadSignedSupplierPdfToCloudinary = async (pdfBytes, userId) => {
  const publicId = `supplier-contract-${userId}-${Date.now()}`;
  const pdfBuffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);

  // NOTE: Upload as `image` resource type (Cloudinary default for PDFs) for best compatibility with PDF delivery.
  // Uploading as `raw` can lead to delivery restrictions or unsupported format errors on some accounts/settings.
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "gearxpert/supplier-contracts",
        public_id: publicId,
        format: "pdf",
        overwrite: true,
        invalidate: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    uploadStream.end(pdfBuffer);
  });
};

exports.previewSupplierContract = async (req, res) => {
  try {
    const { signerName, currentDate, signatureDataUrl } = req.body;
    if (!signatureDataUrl) {
      return res.status(400).json({ message: "Vui lòng cung cấp chữ ký điện tử." });
    }

    const pdf = await buildSupplierContractPdf({
      signerName,
      currentDate,
      signatureDataUrl,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="preview-supplier-contract.pdf"'
    );
    res.send(Buffer.from(pdf));
  } catch (error) {
    console.error("Preview supplier contract error:", error);
    res.status(500).json({
      message: "Lỗi tạo preview hợp đồng supplier",
      error: error.message,
    });
  }
};

exports.requestToBecomeSupplier = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { agreedToTerms, signerName, signatureDataUrl } = req.body;

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

    const signedPdfBytes = await buildSupplierContractPdf({
      signerName: effectiveSignerName,
      currentDate,
      signatureDataUrl,
    });

    const uploadResult = await uploadSignedSupplierPdfToCloudinary(
      signedPdfBytes,
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
    });

    await newContract.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Gửi yêu cầu thành công. Vui lòng chờ Admin phê duyệt.',
      signedPdfUrl: newContract.signedPdfUrl,
    });

  } catch (error) {
    console.error("Lỗi requestToBecomeSupplier:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
