const Notification = require('../../models/Notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ receiverId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, receiverId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { receiverId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};