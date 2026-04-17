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



// ====================== BUILD DATA FOR PREVIEW (FRONTEND DATA) ======================

const buildPreviewContractData = async (rentalData) => {

  const today = new Date();



  // For preview, we need to get actual supplier info from first item's device

  let supplierInfo = {

    name: "Shop Supplier",

    cccd: "N/A",

    address: "N/A",

    phone: "N/A",

    email: "N/A",

    username: "N/A"

  };



  if (rentalData.items && rentalData.items.length > 0) {

    try {

      // Get device to find supplier

      const Device = require('../../models/Device');

      const device = await Device.findById(rentalData.items[0].deviceId).populate('supplierId');



      if (device && device.supplierId) {

        // Get supplier profile

        const SupplierProfile = require('../../models/SupplierProfile');

        const supplierProfile = await SupplierProfile.findOne({ userId: device.supplierId._id });



        supplierInfo = {

          name: device.supplierId.fullName || "Shop Supplier",

          cccd: device.supplierId.identityInfo?.cccdNumber || "N/A",

          address: supplierProfile?.warehouseAddress?.fullAddress ||

            supplierProfile?.warehouseAddress?.street + ", " +

            supplierProfile?.warehouseAddress?.district + ", " +

            supplierProfile?.warehouseAddress?.city || "N/A",

          phone: supplierProfile?.contactPhone || device.supplierId.phone || "N/A",

          email: device.supplierId.email || "N/A",

          username: device.supplierId.email || "N/A"

        };




      }

    } catch (error) {

      console.warn("[PREVIEW CONTRACT] Could not fetch supplier info:", error.message);

    }

  }



  // For preview, rentalData comes directly from frontend

  return {

    contract_number: `GX-RENT-PREVIEW`,

    contract_date: today.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),



    // Bên Cho Thuê (Supplier) - Populated from actual supplier

    supplier_name: supplierInfo.name,

    supplier_cccd: supplierInfo.cccd,

    supplier_address: supplierInfo.address,

    supplier_phone: supplierInfo.phone,

    supplier_email: supplierInfo.email,

    supplier_gearxpert_account: supplierInfo.username,



    // Bên Thuê (Customer) - From frontend data

    customer_name: rentalData.customerName || "",

    customer_cccd: rentalData.customerCCCD || "",

    customer_address: rentalData.deliveryAddress?.fullAddress || "",

    customer_phone: rentalData.phoneNumber || "",

    customer_email: rentalData.customerEmail || "",

    customer_gearxpert_account: rentalData.customerEmail || "", // Use email as account



    // === HÔ TRË NHIÊU SÃN PHÃM ===

    device_name: rentalData.items

      ?.map(item => `${item.deviceName || "Thiêt bi diên tu"} x${item.quantity || 1}`)

      .join("\n") || "Thiêt bi diên tu",



    device_serial: rentalData.items

      ?.map(item => item.deviceSerial || "N/A")

      .join("\n") || "N/A",



    device_condition: rentalData.items

      ?.map(item => item.deviceCondition || "Tót, không hû hông")

      .join("\n") || "Tót, không hû hông",



    quantity: rentalData.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,



    // Thôi gian

    rental_start: rentalData.items?.[0]?.rentalStartDate

      ? new Date(rentalData.items[0].rentalStartDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })

      : "",

    rental_end: rentalData.items?.[0]?.rentalEndDate

      ? new Date(rentalData.items[0].rentalEndDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })

      : "",

    rental_duration: `${rentalData.items?.[0]?.totalDays || 0} ngày`,



    // Tài chính

    rent_price: (rentalData.subtotal || 0).toLocaleString("vi-VN") + " VNÐ",

    deposit: (rentalData.totalDeposit || 0).toLocaleString("vi-VN") + " VNÐ",

    delivery_fee: (rentalData.shippingFee || 0).toLocaleString("vi-VN") + " VNÐ",

    total_payment: (rentalData.total || 0).toLocaleString("vi-VN") + " VNÐ",

  };

};

const buildContractData = async (rental, providedItems = null) => {


  const today = new Date();



  // Check if rental is already a populated object or just an ID

  let populatedRental;



  // If rental has customerId with fullName property, it's already populated

  const isPopulated = typeof rental.customerId === 'object' && rental.customerId?.fullName;



  if (isPopulated) {
    populatedRental = rental;
  } else {

    try {

      populatedRental = await Rental.findById(rental._id || rental)

        .populate({ path: 'customerId', select: 'fullName email phone identityInfo' })

        .populate({ path: 'supplierId', select: 'fullName email phone identityInfo' })

        .populate({

          path: 'items',

          populate: {

            path: 'deviceId',

            select: 'name images condition'

          }

        });

    } catch (dbError) {

      console.warn("[BUILD CONTRACT] DB query failed, using rental object directly:", dbError.message);

    }



    // If DB query fails or returns null (e.g., during transaction), use rental object directly

    // Also check if items are populated - if not, need to use providedItems

    if (!populatedRental || !populatedRental.items || populatedRental.items.length === 0) {

      // Fetch customer and supplier data since rental object only has IDs

      const User = require('../../models/User');

      const customer = await User.findById(rental.customerId).select('fullName email phone identityInfo address');

      const supplier = await User.findById(rental.supplierId).select('fullName email phone identityInfo');



      // Use provided items if available, otherwise fetch from DB

      let items = providedItems;

      if (!items || items.length === 0) {

        const RentalItem = require('../../models/RentalItem');

        items = await RentalItem.find({ rentalId: rental._id })

          .populate({ path: 'deviceId', select: 'name images condition' });

      }



      // Convert rental to plain object if it's a Mongoose document

      const rentalData = rental.toObject ? rental.toObject() : rental;
      populatedRental = {

        ...rentalData,

        customerId: customer || rentalData.customerId,

        supplierId: supplier || rentalData.supplierId,

        items: items || [],

      };
    }

  }

  // Debug first item structure

  if (populatedRental.items?.length > 0) {

    const firstItem = populatedRental.items[0];



  }

  // Get supplier profile

  let supplierProfile = null;

  if (populatedRental.supplierId) {

    supplierProfile = await SupplierProfile.findOne({ userId: populatedRental.supplierId._id });

  }



  // Get device items for serial numbers

  const deviceSerials = [];

  if (populatedRental.items && populatedRental.items.length > 0) {

    for (const item of populatedRental.items) {

      let serials = [];



      // If deviceItems already provided (from RentalController), use them

      if (item.deviceItems && item.deviceItems.length > 0) {

        serials = item.deviceItems.map(di => di.serialNumber || di.imei || "N/A");

      } else {

        // Otherwise query from DB

        const deviceItems = await DeviceItem.find({

          _id: { $in: item.deviceItemIds || [] }

        }).select("serialNumber imei");



        serials = deviceItems.map(di => di.serialNumber || di.imei || "N/A");
      }



      deviceSerials.push(...serials);



      // If no device items, use fallback

      if (serials.length === 0) {

        deviceSerials.push("N/A");

      }

    }

  }
  // Safely get _id - handle both ObjectId and string

  const rentalIdStr = populatedRental._id ? populatedRental._id.toString() : rental._id.toString();



  const contractData = {

    contract_number: `GX-RENT-${rentalIdStr.slice(-8).toUpperCase()}`,

    contract_date: today.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),



    // Bên Cho Thuê (Supplier)

    supplier_name: populatedRental.supplierId?.fullName || "",

    supplier_cccd: populatedRental.supplierId?.identityInfo?.cccdNumber || "",

    supplier_address: supplierProfile?.warehouseAddress?.fullAddress || "",

    supplier_phone: supplierProfile?.contactPhone || populatedRental.supplierId?.phone || "",

    supplier_email: populatedRental.supplierId?.email || "",

    supplier_gearxpert_account: populatedRental.supplierId?.email || "",



    // Bên Thuê (Customer) - From populated customerId

    customer_name: populatedRental.customerId?.fullName || "",

    customer_cccd: populatedRental.customerId?.identityInfo?.cccdNumber || "",

    customer_address: populatedRental.deliveryAddress?.fullAddress ||
      (populatedRental.deliveryAddress?.street ?
        `${populatedRental.deliveryAddress.street}, ${populatedRental.deliveryAddress.district}, ${populatedRental.deliveryAddress.city}` : "") ||
      populatedRental.customerId?.address?.fullAddress ||
      (populatedRental.customerId?.address?.street ?
        `${populatedRental.customerId.address.street}, ${populatedRental.customerId.address.district}, ${populatedRental.customerId.address.city}` : ""),



    customer_phone: populatedRental.phoneNumber || populatedRental.customerId?.phone || "",

    customer_email: populatedRental.customerId?.email || "",

    customer_gearxpert_account: populatedRental.customerId?.email || "",



    // === HÔ TRâ NHIÊU SÃN PHÃM ===

    device_name: populatedRental.items

      ?.map(item => `${item.deviceId?.name || item.deviceSnapshot?.name || "Thiêt bi diên tu"} x${item.quantity || 1}`)

      .join("\n") || "Thiêt bi diên tu",



    device_serial: deviceSerials.join("\n") || "N/A",



    device_condition: populatedRental.items

      ?.map(item => item.conditionBeforeRent || item.deviceId?.condition || "Tót, không hû hông")

      .join("\n") || "Tót, không hû hông",



    quantity: populatedRental.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,



    // Thôi gian (lây item dâu tiên)

    rental_start: populatedRental.items?.[0]?.rentalStartDate

      ? new Date(populatedRental.items[0].rentalStartDate).toLocaleString("vi-VN")

      : "",

    rental_end: populatedRental.items?.[0]?.rentalEndDate

      ? new Date(populatedRental.items[0].rentalEndDate).toLocaleString("vi-VN")

      : "",

    rental_duration: `${populatedRental.items?.[0]?.totalDays || 0} ngày`,



    // Tài chính

    rent_price: (populatedRental.rentPriceTotal || 0).toLocaleString("vi-VN") + " VNÐ",

    deposit: (populatedRental.depositAmount || 0).toLocaleString("vi-VN") + " VNÐ",

    delivery_fee: (populatedRental.deliveryFee || 0).toLocaleString("vi-VN") + " VNÐ",

    total_payment: (populatedRental.totalAmount || 0).toLocaleString("vi-VN") + " VNÐ",

  };
  return contractData;

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
  const safeSetText = (name, value) => {

    try {

      const field = form.getTextField(name);

      if (field) {

        field.setText(String(value || ""));

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



      // Lấy kích thước trang để tính vị trí tương đối

      const { width: pageWidth, height: pageHeight } = targetPage.getSize();

      // Vị trí chữ ký BÊN THUÊ - cải thiện cho chính xác hơn

      const signatureWidth = 120;  // Giảm width cho phù hợp

      const signatureHeight = 50;  // Giảm height cho prop



      // Đặt vị trí ở góc dưới bên phải của khu vực ký tên

      const signatureX = pageWidth - signatureWidth - 50; // Cách lề phải 50px

      const signatureY = pageHeight - 180; // Cách đáy 180px
      targetPage.drawImage(signatureImage, {

        x: signatureX,

        y: signatureY,

        width: signatureWidth,

        height: signatureHeight,

      });
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



// ====================== GENERATE DOCX BUFFER FROM DATA (FOR PREVIEW) ======================

const generateDocxBufferFromData = async (data) => {

  const templatePath = path.resolve(__dirname, "../../templatesContract/template_contract.docx");



  let templateBuffer;

  try {
    templateBuffer = await fs.readFile(templatePath, "binary");
  } catch (templateError) {

    console.error("[DEBUG] Template file không tìm tìm:", templateError.message);

    throw new Error("Template file không tìm tìm: " + templateError.message);

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
        console.log("[DEBUG] getImage called - tagName:", tagName, "hasValue:", !!tagValue);
        if (tagValue && tagValue.startsWith("data:image")) {
          console.log("[DEBUG] getImage: Returning image buffer");
          return base64DataURLToArrayBuffer(tagValue);
        }
        console.log("[DEBUG] getImage: Returning empty buffer");
        return Buffer.from("");
      },

      getSize: function (img, tagValue, tagName) {
        console.log("[DEBUG] getSize called - tagName:", tagName);
        return [180, 70]; // Same as supplier contract
      },

    };

    const imageModule = new ImageModule(opts);



    // Use docxtemplater - exactly like supplier contract

    const zip = new PizZip(templateBuffer);



    // DEBUG: Check template content before rendering
    try {
      const content = zip.file("word/document.xml")?.asText();
      if (content) {
        console.log("[DEBUG] ========== TEMPLATE CHECK ==========");
        // Find all placeholders with both syntaxes
        const allMatches = content.match(/\{%[^%]*%\}|\{\{[^}]*\}\}/g) || [];
        console.log("[DEBUG] All placeholders found:", allMatches.slice(0, 10));
        
        // Check for signatureImage variations
        const hasImagePlaceholder = content.includes('{%signatureImage%}');
        const hasVarPlaceholder = content.includes('{{signatureImage}}');
        const hasAnySig = content.toLowerCase().includes('signatureimage');
        console.log("[DEBUG] Has {%signatureImage%}:", hasImagePlaceholder);
        console.log("[DEBUG] Has {{signatureImage}}:", hasVarPlaceholder);
        console.log("[DEBUG] Contains 'signatureImage' (any case):", hasAnySig);
        
        // Log raw content around potential signature area
        const sigIndex = content.toLowerCase().indexOf('signature');
        if (sigIndex !== -1) {
          console.log("[DEBUG] Raw content around 'signature':", content.substring(sigIndex - 20, sigIndex + 40));
        }
        
        if (!hasImagePlaceholder && !hasVarPlaceholder) {
          console.warn("[DEBUG] WARNING: No signatureImage placeholder found in template!");
        }
      }
    } catch (e) {
      console.warn("[DEBUG] Could not read template:", e.message);
    }

    // DEBUG: Check data
    console.log("[DEBUG] ========== DATA CHECK ==========");
    console.log("[DEBUG] signatureDataUrl:", data.signatureDataUrl ? "PRESENT" : "MISSING");
    console.log("[DEBUG] signatureDataUrl length:", data.signatureDataUrl?.length || 0);

    const doc = new Docxtemplater(zip, {

      paragraphLoop: true,

      linebreaks: true,

      modules: [imageModule],

      delimiters: { start: '{{', end: '}}' },

    });



    // Render data - exactly like supplier contract

    console.log("[DEBUG] ========== RENDERING ==========");
    console.log("[DEBUG] signatureImage value:", data.signatureDataUrl ? "SET" : "EMPTY");

    doc.render({

      ...data,

      image: data.signatureDataUrl, // Chuy qua {%image}

    });



    const buf = doc.getZip().generate({

      type: "nodebuffer",

      compression: "DEFLATE",

    });
    return buf;
  } catch (docxError) {
    // Handle docxtemplater syntax errors - exactly like supplier contract

    if (docxError.properties && docxError.properties.errors) {

      const errorMessages = docxError.properties.errors

        .map((e) => e.properties.explanation)

        .join("; ");

      throw new Error("Lõi khuyn dng cu trúc file Word (Mau h dng): " + errorMessages);

    }



    throw new Error("Lõi khi tao DOCX: " + docxError.message);

  }

};

// ====================== GENERATE DOCX BUFFER ======================

const generateDocxBuffer = async (rental, items = null) => {
  const templatePath = path.resolve(__dirname, "../../templatesContract/template_contract.docx");



  let templateBuffer;

  try {

    templateBuffer = await fs.readFile(templatePath, "binary");

  } catch (templateError) {

    console.error("[DEBUG] Template file không tìm tìm:", templateError.message);

    throw new Error("Template file không tìm tìm: " + templateError.message);

  }



  const data = await buildContractData(rental, items);
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
        console.log("[DEBUG] getImage called - tagName:", tagName, "hasValue:", !!tagValue);
        if (tagValue && tagValue.startsWith("data:image")) {
          console.log("[DEBUG] getImage: Returning image buffer");
          return base64DataURLToArrayBuffer(tagValue);
        }
        console.log("[DEBUG] getImage: Returning empty buffer");
        return Buffer.from("");
      },

      getSize: function (img, tagValue, tagName) {
        console.log("[DEBUG] getSize called - tagName:", tagName);
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

      image: data.signatureDataUrl, // Chuy qua {%image}

    });



    const buf = doc.getZip().generate({

      type: "nodebuffer",

      compression: "DEFLATE",

    });




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



    throw new Error("Lõi khi tao DOCX: " + docxError.message);

  }

};



// ====================== GENERATE PREVIEW CONTRACT ======================

const generatePreviewContract = async (req, res) => {

  try {
    const rentalData = req.body;
    const data = await buildPreviewContractData(rentalData);
    // Add signature if provided

    if (rentalData.customerSignature && rentalData.customerSignature.startsWith("data:image")) {

      data.signatureDataUrl = rentalData.customerSignature;
    } else {

      data.signatureDataUrl = "";

    }

    const buf = await generateDocxBufferFromData(data);

    const uploadResult = await new Promise((resolve, reject) => {

      cloudinary.uploader.upload_stream(

        {

          resource_type: "raw",

          folder: "contracts/preview",

          public_id: `preview-${Date.now()}`,

          format: "docx",

        },

        (error, result) => (error ? reject(error) : resolve(result))

      ).end(buf);

    });
    res.json({

      success: true,

      previewUrl: uploadResult.secure_url,

      contractData: data,

    });

  } catch (error) {

    console.error("[DEBUG PREVIEW] Error:", error);

    res.status(500).json({

      success: false,

      message: error.message || "Lỗi khi tạo preview hợp đồng",

    });

  }

};



// ====================== GET CONTRACT BY RENTAL ID ======================

const getContractByRentalId = async (req, res) => {

  try {

    const { rentalId } = req.params;

    const rental = await Rental.findById(rentalId)

      .populate("customerId")

      .populate("supplierId");



    if (!rental) return res.status(404).json({ message: "No rental found" });



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



// ====================== ROUTE HANDLERS ======================

const testPreview = generatePreviewContract;

const previewContractWithData = generatePreviewContract;

const previewContract = generatePreviewContract;

const generateContract = generatePreviewContract;

const uploadContractFile = getContractByRentalId;

const getContractByRental = getContractByRentalId;



// ====================== EXPORTS ======================

module.exports = {

  generatePreviewContract,

  generateDocxBuffer,

  generateDocxBufferFromData,

  getContractByRentalId,

  // Route handlers

  testPreview,

  previewContractWithData,

  previewContract,

  generateContract,

  uploadContractFile,

  getContractByRental,

};