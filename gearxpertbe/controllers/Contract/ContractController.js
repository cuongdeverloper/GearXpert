// ==================== IMPORTS ====================
const { PDFDocument } = require("pdf-lib");
const fs = require("fs/promises");
const path = require("path");
const fontkit = require("@pdf-lib/fontkit");

// DOCX generation imports
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");

const Contract = require("../../models/Contract");
const ContractFile = require("../../models/ContractFile");
const Rental = require("../../models/Rental");
const ContractItem = require("../../models/ContractItem");
const SupplierProfile = require("../../models/SupplierProfile");
const DeviceItem = require("../../models/DeviceItem"); // ← Lấy serial từ đây

const cloudinary = require("cloudinary").v2;

// ====================== PATHS ======================
const TEMPLATE_PATH = path.resolve(__dirname, "../../templatesContract/template_contract_final.pdf");
const DOCX_TEMPLATE_PATH = path.resolve(__dirname, "../../templatesContract/template_contract.docx");
const FONT_PATH = path.resolve(__dirname, "../../fonts/DejaVuSans.ttf");

// ====================== BUILD DATA (ĐÃ SỬA ĐẦY ĐỦ) ======================
const buildContractData = async (rental) => {
  const today = new Date();

  // Xử lý supplierId - có thể là object (populate) hoặc string ID
  const supplierUserId = rental.supplierId?._id || rental.supplierId;
  
  // Lấy thông tin Shop của Supplier
  let supplierProfile = null;
  if (supplierUserId && typeof supplierUserId === 'string') {
    supplierProfile = await SupplierProfile.findOne({ userId: supplierUserId });
  }

  // Lấy serial numbers từ DeviceItem nếu có deviceId
  const deviceSerials = [];
  if (rental.items && rental.items.length > 0) {
    for (const item of rental.items) {
      const deviceId = item.deviceId?._id || item.deviceId;
      if (deviceId) {
        // Tìm deviceItem AVAILABLE đầu tiên cho device này
        const deviceItem = await DeviceItem.findOne({ 
          deviceId: deviceId, 
          status: "AVAILABLE" 
        }).select("serialNumber imei");
        
        deviceSerials.push(deviceItem?.serialNumber || deviceItem?.imei || item.serialNumber || "");
      } else {
        deviceSerials.push(item.serialNumber || "");
      }
    }
  }

  return {
    contract_number: `GX-RENT-${rental._id ? rental._id.toString().slice(-8).toUpperCase() : "PREVIEW"}`,
    contract_date: today.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),

    // Bên Cho Thuê (Supplier)
    supplier_name: rental.supplierInfo?.fullName || rental.supplierId?.fullName || "",
    supplier_cccd: rental.supplierInfo?.cccd || rental.supplierId?.cccd || "",
    supplier_address: supplierProfile?.warehouseAddress?.fullAddress || rental.supplierInfo?.address || "",
    supplier_phone: rental.supplierInfo?.phone || rental.supplierId?.phone || "",
    supplier_email: rental.supplierInfo?.email || rental.supplierId?.email || "",
    supplier_gearxpert_account: rental.supplierInfo?.username || rental.supplierId?.username || "",

    // Bên Thuê (Customer)
    customer_name: rental.customerInfo?.fullName || rental.customerId?.fullName || "",
    customer_cccd: rental.customerInfo?.cccd || rental.customerId?.cccd || "",
    customer_address: rental.deliveryAddress?.fullAddress || rental.customerInfo?.address || rental.customerId?.address || "",
    customer_phone: rental.phoneNumber || rental.customerInfo?.phone || rental.customerId?.phone || "",
    customer_email: rental.customerInfo?.email || rental.customerId?.email || "",
    customer_gearxpert_account: rental.customerInfo?.username || rental.customerId?.username || "",

    // === HỖ TRỢ NHIỀU SẢN PHẨM (multi-line) ===
    device_name: rental.items
      ?.map(item => `${item.deviceName || item.deviceId?.name} x${item.quantity || 1}`)
      .join("\n") || "Thiết bị điện tử",

    device_serial: deviceSerials.join("\n") || "",

    device_condition: rental.items
      ?.map(item => item.conditionBefore || "Tốt, không hư hỏng")
      .join("\n") || "Tốt, không hư hỏng",

    quantity: rental.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,

    // Thời gian (lấy item đầu tiên)
    rental_start: rental.items?.[0]?.rentalStartDate
      ? new Date(rental.items[0].rentalStartDate).toLocaleString("vi-VN")
      : "",
    rental_end: rental.items?.[0]?.rentalEndDate
      ? new Date(rental.items[0].rentalEndDate).toLocaleString("vi-VN")
      : "",
    rental_duration: `${rental.items?.[0]?.totalDays || 0} ngày`,

    // Tài chính
    rent_price: (rental.subtotal || 0).toLocaleString("vi-VN") + " VNĐ",
    deposit: (rental.totalDeposit || 0).toLocaleString("vi-VN") + " VNĐ",
    delivery_fee: (rental.shippingFee || 0).toLocaleString("vi-VN") + " VNĐ",
    total_payment: (rental.total || 0).toLocaleString("vi-VN") + " VNĐ",
  };
};

// ====================== GENERATE PDF BUFFER ======================
const generatePdfBuffer = async (rental) => {
  const templateBytes = await fs.readFile(TEMPLATE_PATH);
  const fontBytes = await fs.readFile(FONT_PATH);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  const form = pdfDoc.getForm();
  const data = await buildContractData(rental);

  // Debug fields
  console.log("\n=== DANH SÁCH FORM FIELDS ===");
  form.getFields().forEach((f, i) => console.log(`${i + 1}. ${f.getName()}`));
  console.log("========================\n");

  const safeSetText = (name, value) => {
    try {
      const field = form.getTextField(name);
      if (field) {
        field.setText(String(value || ""));
        console.log(`✓ Điền thành công: ${name}`);
      } else {
        console.warn(`⚠ Field "${name}" không tồn tại`);
      }
    } catch (e) {
      console.warn(`⚠ Lỗi field ${name}`);
    }
  };

  // Mapping Text1 → Text25 theo template mới
  safeSetText("Text1", data.contract_number);
  safeSetText("Text2", data.contract_date);

  // Bên Cho Thuê
  safeSetText("Text3", data.supplier_name);
  safeSetText("Text4", data.supplier_cccd);
  safeSetText("Text5", data.supplier_address);           // Địa chỉ shop
  safeSetText("Text6", data.supplier_phone);
  safeSetText("Text7", data.supplier_email);
  safeSetText("Text8", data.supplier_gearxpert_account); // Tài khoản

  // Bên Thuê
  safeSetText("Text9", data.customer_name);
  safeSetText("Text10", data.customer_cccd);
  safeSetText("Text11", data.customer_address);
  safeSetText("Text12", data.customer_phone);
  safeSetText("Text13", data.customer_email);
  safeSetText("Text14", data.customer_gearxpert_account);

  // Thiết bị (multi-line)
  safeSetText("Text15", data.device_name);
  safeSetText("Text16", data.device_serial);
  safeSetText("Text17", data.device_condition);
  safeSetText("Text18", String(data.quantity));

  // Thời gian
  safeSetText("Text19", data.rental_start);
  safeSetText("Text20", data.rental_end);
  safeSetText("Text21", data.rental_duration);

  // Tài chính
  safeSetText("Text22", data.rent_price);
  safeSetText("Text23", data.deposit);
  safeSetText("Text24", data.delivery_fee);
  safeSetText("Text25", data.total_payment);

  // ====================== MERGE CHỮ KÝ ======================
  if (rental.signatureData || rental.customerSignature) {
    try {
      const signatureDataUrl = rental.signatureData || rental.customerSignature;
      const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const signatureBytes = Buffer.from(base64Data, "base64");
      
      // Embed PNG signature
      const signatureImage = await pdfDoc.embedPng(signatureBytes);
      
      // Get page 5 (index 4) to draw signature
      const pages = pdfDoc.getPages();
      const targetPage = pages[4] || pages[pages.length - 1]; // Page 5 hoặc trang cuối nếu không đủ
      
      // Vị trí chữ ký BÊN THUÊ (đã điều chỉnh qua phải)
      targetPage.drawImage(signatureImage, {
        x: 400,  // Qua phải (từ 350 → 400)
        y: 100,  // Vị trí Y
        width: 150,
        height: 60,
      });
      
      console.log("✓ Đã merge chữ ký vào PDF");
    } catch (sigError) {
      console.warn("⚠ Lỗi khi merge chữ ký:", sigError.message);
    }
  }

  // Update font cho tất cả fields
  form.getFields().forEach((field) => {
    if (field.constructor.name === "PDFTextField") {
      field.updateAppearances(font);
    }
  });

};

// ====================== GENERATE DOCX BUFFER ======================
const generateDocxBuffer = async (rental) => {
  console.log("[DEBUG] Starting generateDocxBuffer");
  
  const templatePath = path.resolve(__dirname, "../../templatesContract/template_contract.docx");
  
  let templateBuffer;
  try {
    templateBuffer = await fs.readFile(templatePath, "binary");
    console.log("[DEBUG] Template loaded, size:", templateBuffer.length);
  } catch (templateError) {
    console.error("[DEBUG] Template file không tìm tìm:", templateError.message);
    throw new Error("Template file không tìm tìm: " + templateError.message);
  }
  
  const data = await buildContractData(rental);
  console.log("[DEBUG] Contract data built:", Object.keys(data));
  
  // Add signature if provided - same as supplier contract
  const sigUrl = rental.signatureData || rental.customerSignature;
  if (sigUrl && sigUrl.startsWith("data:image")) {
    data.signatureDataUrl = sigUrl;
  } else {
    data.signatureDataUrl = "";
  }
  
  try {
    // Image module config - exactly like supplier contract
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
        return [180, 70]; // Same as supplier contract
      },
    };
    const imageModule = new ImageModule(opts);
    
    // Use docxtemplater - exactly like supplier contract
    const zip = new PizZip(templateBuffer);
    
    // Debug: Check template placeholders
    try {
      const content = zip.file("word/document.xml")?.asText();
      if (content) {
        console.log("[DEBUG] Template placeholders found:");
        // Extract placeholders from Word XML
        const placeholderMatches = content.match(/\{\{[^}]*\}\}/g) || [];
        const cleanPlaceholders = placeholderMatches.map(p => {
          // Remove Word XML tags and extract clean placeholder name
          const cleanMatch = p.match(/\{\{([^<]+)\}\}/);
          return cleanMatch ? `{{${cleanMatch[1].trim()}}}` : p;
        });
        
        // Remove duplicates and log
        const uniquePlaceholders = [...new Set(cleanPlaceholders)];
        uniquePlaceholders.forEach(p => console.log("  -", p));
        
        // Check if all data keys have placeholders
        const missingPlaceholders = Object.keys(data).filter(key => 
          !uniquePlaceholders.some(p => p.includes(key))
        );
        
        if (missingPlaceholders.length > 0) {
          console.warn("[DEBUG] Missing placeholders in template:", missingPlaceholders);
        }
      }
    } catch (zipError) {
      console.warn("[DEBUG] Could not read template content:", zipError.message);
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule],
      delimiters: { start: '{{', end: '}}' },
    });
    
    // Render data - exactly like supplier contract
    doc.render({
      ...data,
      signatureImage: data.signatureDataUrl, // Chuy qua {%signatureImage}
    });
    
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
    
    console.log("[DEBUG] DOCX generated, size:", buf.length);
    return buf;
    
  } catch (docxError) {
    console.error("[DEBUG] DOCX generation error:", docxError);
    
    // Handle docxtemplater syntax errors - exactly like supplier contract
    if (docxError.properties && docxError.properties.errors) {
      const errorMessages = docxError.properties.errors
        .map((e) => e.properties.explanation)
        .join("; ");
      throw new Error("Lõi khuyn dng cu trúc file Word (Mau h dng): " + errorMessages);
    }
    
    throw new Error("L khi tao DOCX: " + docxError.message);
  }
};

// ====================== API ENDPOINTS ======================
exports.previewContractWithData = async (req, res) => {
  try {
    const rentalData = req.body;
    if (!rentalData) return res.status(400).json({ message: "Rental data not found" });

    const buf = await generateDocxBuffer(rentalData);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "contracts/preview", public_id: `preview-${Date.now()}`, format: "docx" },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(buf);
    });

    res.json({
      success: true,
      previewUrl: uploadResult.secure_url,
      fileName: `hop-dong-thue-preview-${Date.now()}.docx`,
    });
  } catch (error) {
    console.error("Preview contract error:", error);
    res.status(500).json({ message: "Failed to generate preview", error: error.message });
  }
};

exports.previewContract = async (req, res) => {
  try {
    const rental = req.rental;
    if (!rental) return res.status(400).json({ message: "Rental data not found" });

    const buf = await generatePdfBuffer(rental);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="preview-contract-${rental._id}.pdf"`);
    res.send(buf);
  } catch (error) {
    console.error("Preview contract error:", error);
    res.status(500).json({ message: "Failed to generate preview" });
  }
};

exports.generateContract = async (req, res) => {
  try {
    const rental = req.rental;
    if (!rental) return res.status(400).json({ message: "Rental data not found" });

    const buf = await generatePdfBuffer(rental);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "contracts", public_id: `contract-${rental._id}-${Date.now()}`, format: "pdf" },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(buf);
    });

    const contractRecord = await Contract.create({
      rentalId: rental._id,
      contractType: "DELIVERY",
      status: "DRAFT",
      deliveryMethod: "SHIP",
      location: rental.deliveryAddress?.fullAddress || "",
    });

    await ContractFile.create({
      contractId: contractRecord._id,
      fileUrl: uploadResult.secure_url,
      fileType: "DELIVERY",
      uploadedBy: req.user?._id,
    });

    res.json({
      success: true,
      message: "Hợp đồng PDF đã được tạo thành công",
      contract: contractRecord,
      fileUrl: uploadResult.secure_url,
      fileName: `hop-dong-thue-${rental._id.toString().slice(-8).toUpperCase()}.pdf`,
    });
  } catch (error) {
    console.error("Generate contract error:", error);
    res.status(500).json({ message: "Failed to generate contract", error: error.message });
  }
};

exports.uploadContractFile = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { fileUrl, fileType } = req.body;

    const contract = await Contract.findById(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    await ContractFile.create({ contractId, fileUrl, fileType, uploadedBy: req.user._id });

    contract.status = "SIGNED";
    contract.signedByCustomer = true;
    contract.signedByStaff = true;
    contract.signedAt = new Date();
    await contract.save();

    res.json({ message: "Contract uploaded & signed" });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
};

exports.getContractByRental = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const rental = await Rental.findById(rentalId)
      .populate("customerId", "fullName email phone address cccd username")
      .populate("supplierId", "fullName email phone address cccd username");

    if (!rental) return res.status(404).json({ message: "Rental not found" });

    const contract = await Contract.findOne({ rentalId: rental._id });
    if (!contract) return res.status(404).json({ message: "No contract found" });

    const items = await ContractItem.find({ contractId: contract._id }).populate("deviceId");
    const files = await ContractFile.find({ contractId: contract._id });

    res.json({
      success: true,
      contract,
      items,
      files,
      rental: {
        id: rental._id,
        status: rental.status,
        customer: rental.customerId,
        supplier: rental.supplierId
      }
    });
  } catch (error) {
    console.error("Get contract error:", error);
    res.status(500).json({ message: "Failed to get contract" });
  }
};