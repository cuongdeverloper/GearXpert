const OperationLog = require("../../models/OperationLog");

// POST /api/operation-logs
// Body: { action, targetType, targetId, details }
const logAction = async (req, res) => {
  try {
    const staffId = req.user.id;
    const { action, targetType, targetId, details } = req.body;

    if (!action || !targetType || !targetId) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    const log = await OperationLog.create({
      staffId,
      action,
      targetType,
      targetId,
      details: details || {},
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({ message: "Đã ghi log thành công.", log });
  } catch (err) {
    console.error("Lỗi ghi OperationLog:", err);
    return res.status(500).json({ message: "Lỗi server." });
  }
};

// GET /api/operation-logs/my
// Query: page, limit
const getMyLogs = async (req, res) => {
  try {
    const staffId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      OperationLog.find({ staffId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OperationLog.countDocuments({ staffId }),
    ]);

    return res.status(200).json({ logs, total, page, limit });
  } catch (err) {
    console.error("Lỗi lấy OperationLog:", err);
    return res.status(500).json({ message: "Lỗi server." });
  }
};

module.exports = { logAction, getMyLogs };
