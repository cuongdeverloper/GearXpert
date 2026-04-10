require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Device = require("../models/Device");

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const normalizeQueryFromMessage = (message) => {
  if (!message) return "";

  const text = String(message).trim();
  const lower = text.toLowerCase();

  // If FE sends a structured prefix, prefer extracting after ":"
  // Example: "Tìm sản phẩm: Sony FX3"
  const colonIdx = text.indexOf(":");
  if (colonIdx !== -1) {
    const after = text.slice(colonIdx + 1).trim();
    if (after.length >= 2) return after;
  }

  // Common Vietnamese/English intent words - strip them if message is short.
  const prefixes = [
    "tìm",
    "tìm kiếm",
    "search",
    "mình muốn tìm",
    "cho mình tìm",
    "gợi ý",
    "recommend",
    "mua",
    "thuê",
  ];

  for (const p of prefixes) {
    if (lower.startsWith(p + " ")) {
      const after = text.slice(p.length).trim();
      if (after.length >= 2) return after;
    }
  }

  return text;
};

const isLikelyProductIntent = (message) => {
  const text = String(message || "").trim();
  if (!text) return false;

  const lower = text.toLowerCase();

  // Explicit structured prefix from FE / power users
  const explicitPrefixes = [
    "tìm sản phẩm:",
    "tim san pham:",
    "search product:",
    "find product:",
    "product:",
    "tìm:",
    "search:",
  ];
  if (explicitPrefixes.some((p) => lower.startsWith(p))) return true;

  // Common product keywords / categories / brands (lightweight heuristic)
  const keywords = [
    "sản phẩm",
    "thiet bi",
    "thiết bị",
    "gear",
    "camera",
    "máy ảnh",
    "ống kính",
    "lens",
    "gimbal",
    "drone",
    "đèn",
    "lighting",
    "micro",
    "mic",
    "audio",
    "sony",
    "canon",
    "nikon",
    "dji",
    "ronin",
    "aputure",
    "sennheiser",
    "rode",
    "gopro",
  ];
  if (keywords.some((k) => lower.includes(k))) return true;

  // Model-like short queries (e.g. "FX3", "A7S III", "Ronin RS3")
  if (text.length <= 60 && /[a-zA-Z0-9]/.test(text) && /\d/.test(text)) return true;

  return false;
};

const searchDevicesForChat = async (queryText) => {
  const q = (queryText || "").trim();

  const baseQuery = {
    isAddon: false,
    $expr: { $gt: ["$stockQuantity", "$rentedQuantity"] },
  };

  const inferCategory = (raw) => {
    const s = String(raw || "").toLowerCase();
    if (!s) return null;

    const map = [
      { cat: "CAMERA", keys: ["camera", "máy ảnh", "may anh", "sony", "canon", "nikon", "fx3", "a7", "r5", "bmpcc", "blackmagic"] },
      { cat: "LIGHTING", keys: ["lighting", "đèn", "den", "aputure", "amaran", "nanlite", "godox"] },
      { cat: "AUDIO", keys: ["audio", "mic", "micro", "rode", "sennheiser", "tascam", "zoom h"] },
      { cat: "ACCESSORY", keys: ["gimbal", "ronin", "tripod", "chân máy", "chan may", "rig", "cage", "monitor"] },
      { cat: "DRONE", keys: ["drone", "dji", "mavic", "air 2", "mini 3"] },
    ];

    for (const row of map) {
      if (row.keys.some((k) => s.includes(k))) return row.cat;
    }
    return null;
  };

  const inferredCategory = inferCategory(q);

  const baseSelect =
    "name rentPrice status description category specs stockQuantity rentedQuantity images location ratingAvg reviewCount supplierId createdAt";

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const buildRecommendations = (devicesList) =>
    (devicesList || []).map((p) => {
      const supplierId = p?.supplierId?._id
        ? String(p.supplierId._id)
        : p?.supplierId
          ? String(p.supplierId)
          : null;
      const availableQuantity = (p.stockQuantity || 0) - (p.rentedQuantity || 0);

      return {
        id: String(p._id),
        name: p.name,
        category: p.category,
        city: p.location?.city || "",
        pricePerDay: p.rentPrice?.perDay ?? null,
        availableQuantity,
        ratingAvg: p.ratingAvg ?? 0,
        reviewCount: p.reviewCount ?? 0,
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        deviceUrl: `/device/${p._id}`,
        seller: supplierId
          ? {
            id: supplierId,
            name: p.supplierId?.fullName || "Supplier",
            url: `/supplier/${supplierId}`,
          }
          : null,
      };
    });

  // 1) Best effort: MongoDB full-text search (uses Device text index)
  let devices = [];
  if (q.length >= 2) {
    const sanitized = q.replace(/["']/g, " ").trim();

    try {
      devices = await Device.find({ ...baseQuery, $text: { $search: sanitized } })
        .select({ ...Object.fromEntries(baseSelect.split(" ").map((f) => [f, 1])), score: { $meta: "textScore" } })
        .populate("supplierId", "fullName")
        .sort({ score: { $meta: "textScore" }, ratingAvg: -1, reviewCount: -1, createdAt: -1 })
        .limit(5)
        .lean();
    } catch (e) {
      // If text index isn't ready or query invalid, we'll fallback below.
      console.error("[AI] $text search error:", e?.message || e);
      devices = [];
    }
  }

  // 2) Token regex fallback (helps when $text yields nothing)
  if (!devices || devices.length === 0) {
    if (q.length >= 2) {
      const phraseRx = new RegExp(escapeRegex(q), "i");
      devices = await Device.find({
        ...baseQuery,
        $or: [{ name: phraseRx }, { category: phraseRx }, { description: phraseRx }],
      })
        .select(baseSelect)
        .populate("supplierId", "fullName")
        .sort({ ratingAvg: -1, reviewCount: -1, createdAt: -1 })
        .limit(5)
        .lean();
    }
  }

  if (!devices || devices.length === 0) {
    const tokens = q
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .slice(0, 6);

    if (tokens.length > 0) {
      const or = [];
      for (const t of tokens) {
        const rx = new RegExp(escapeRegex(t), "i");
        or.push({ name: rx }, { category: rx }, { description: rx });
      }

      devices = await Device.find({ ...baseQuery, $or: or })
        .select(baseSelect)
        .populate("supplierId", "fullName")
        .sort({ ratingAvg: -1, reviewCount: -1, createdAt: -1 })
        .limit(5)
        .lean();
    }
  }

  // 3) Category fallback (still relevant-ish, not "default newest")
  if ((!devices || devices.length === 0) && inferredCategory) {
    devices = await Device.find({ ...baseQuery, category: inferredCategory })
      .select(baseSelect)
      .populate("supplierId", "fullName")
      .sort({ ratingAvg: -1, reviewCount: -1, createdAt: -1 })
      .limit(5)
      .lean();
  }

  // 4) If still none, do not return random "default" products
  if (!devices || devices.length === 0) {
    return { devices: [], recommendations: [] };
  }

  const recommendations = buildRecommendations(devices);

  return { devices, recommendations };
};

const buildFallbackReply = (originalMessage, recommendations) => {
  const query = normalizeQueryFromMessage(originalMessage);
  if (!recommendations || recommendations.length === 0) {
    return "Hiện mình chưa tìm thấy thiết bị phù hợp. Bạn thử nhập thêm hãng/mẫu cụ thể (ví dụ: “Sony FX3”, “Aputure 120D”, “Ronin”) nhé.";
  }

  const top = recommendations.slice(0, 3);
  const lines = top.map((r, idx) => {
    const price = r.pricePerDay ? `${Number(r.pricePerDay).toLocaleString()}đ/ngày` : "Liên hệ";
    const stock = typeof r.availableQuantity === "number" ? `Còn ${r.availableQuantity}` : "";
    return `${idx + 1}) ${r.name} — ${price}${stock ? ` • ${stock}` : ""}`;
  });

  const first = top[0];
  const deviceLink = first?.deviceUrl ? `[Link sản phẩm](${first.deviceUrl})` : "";
  const sellerLink = first?.seller?.url ? `[Link nhà cung cấp](${first.seller.url})` : "";
  const linkLine =
    deviceLink || sellerLink
      ? `\n\nBạn có thể tham khảo chi tiết về sản phẩm tại đây: ${deviceLink}${deviceLink && sellerLink ? " hoặc " : ""}${sellerLink}.`
      : "";

  return `Mình đã tìm thấy vài gợi ý cho “${query}”:\n${lines.join("\n")}${linkLine}`;
};

const handleAIChat = async (req, res) => {
  try {
    const { message } = req.body;
    const productIntent = isLikelyProductIntent(message);
    const normalizedQuery = normalizeQueryFromMessage(message);
    const queryText = normalizedQuery ? normalizedQuery.toLowerCase().trim() : "";

    let relevantProducts = [];
    let recommendations = [];

    if (productIntent) {
      const result = await searchDevicesForChat(queryText);
      relevantProducts = result.devices || [];
      recommendations = result.recommendations || [];
    }

    const productContext = relevantProducts.map(p => {
      const priceDay = p.rentPrice?.perDay ? p.rentPrice.perDay.toLocaleString() + " VNĐ" : "Liên hệ";

      let specsText = "Cơ bản";
      if (p.specs && p.specs instanceof Map) {
        specsText = JSON.stringify(Object.fromEntries(p.specs));
      } else if (typeof p.specs === 'object') {
        specsText = JSON.stringify(p.specs);
      }

      const supplierId = p?.supplierId?._id || p?.supplierId;

      return `
      - Tên: ${p.name}
      - Giá: ${priceDay}/ngày
      - Kho: ${(p.stockQuantity || 0) - (p.rentedQuantity || 0)} cái
      - Trạng thái: ${p.status}
      - Cấu hình: ${specsText}
      - Link sản phẩm: [Link sản phẩm](/device/${p._id})
      ${supplierId ? `- Link người bán: [Link nhà cung cấp](/supplier/${supplierId})` : ""}
      `;
    }).join("\n");

    // If Gemini key isn't configured, return a deterministic reply + recommendations
    if (!genAI) {
      return res.status(200).json({
        success: true,
        reply: productIntent
          ? buildFallbackReply(message, recommendations)
          : "Mình có thể hỗ trợ bạn về sản phẩm, thuê/đơn hàng, hoặc hướng dẫn sử dụng website. Bạn muốn hỏi gì nhỉ?",
        recommendations: productIntent ? recommendations : [],
        meta: { provider: "fallback" },
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: productIntent
                ? `Bạn là nhân viên tư vấn GearXpert.

DỮ LIỆU KHO HÀNG HIỆN TẠI:
${productContext}

KHÁCH HỎI: "${message}"

YÊU CẦU:
1) Tìm trong dữ liệu kho hàng xem có món khách cần không.
2) Nếu có: báo giá/1 ngày và số lượng còn lại.
3) Nếu KHÔNG có: gợi ý sản phẩm gần giống trong danh sách.
4) Trả lời ngắn gọn, thân thiện, dễ đọc, có icon.
5) Khi đưa link, hãy dùng định dạng Markdown chính xác: [Link sản phẩm](/device/ID) và [Link nhà cung cấp](/supplier/ID).`
                : `Bạn là trợ lý GearXpert.

KHÁCH HỎI: "${message}"

YÊU CẦU:
1) Trả lời ngắn gọn, thân thiện, dễ đọc (có icon).
2) Không đưa danh sách sản phẩm/link người bán nếu người dùng không hỏi về sản phẩm.`,
            },
          ],
        },
      ],
    });

    let text = "";
    try {
      const result = await chat.sendMessage(message);
      text = result.response.text();
    } catch (e) {
      console.error("[AI] Gemini error, fallback:", e?.message || e);
      text = productIntent
        ? buildFallbackReply(message, recommendations)
        : "Mình gặp lỗi khi xử lý. Bạn thử lại giúp mình nhé.";
    }

    return res.status(200).json({
      success: true,
      reply: text || buildFallbackReply(message, recommendations),
      recommendations: productIntent ? recommendations : [],
      meta: { provider: "gemini-1.5-flash" },
    });

  } catch (error) {
    console.error("LỖI AI:", error);
    return res.status(500).json({
      success: false,
      reply: "Hệ thống đang bảo trì AI, bạn vui lòng quay lại sau!",
      error: error.message
    });
  }
};

module.exports = { handleAIChat };
