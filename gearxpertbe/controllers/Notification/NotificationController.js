const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { getUsers } = require('../../utils/socketUser');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const pageRaw = req.query.page;
    const usePaged =
      pageRaw !== undefined && pageRaw !== null && String(pageRaw).trim() !== '';

    if (!usePaged) {
      const notifications = await Notification.find({ receiverId: userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
      return res.status(200).json(notifications);
    }

    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { receiverId: userId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.read === 'unread') filter.isRead = false;
    else if (req.query.read === 'read') filter.isRead = true;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ receiverId: userId, isRead: false }),
    ]);

    res.status(200).json({
      notifications,
      total,
      page,
      limit,
      unreadCount,
    });
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

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
    }

    const users = await User.find({ _id: { $ne: req.user.id } }).select('_id').lean();
    if (users.length === 0) {
      return res.status(200).json({ success: true, message: 'Không có người dùng nào', sent: 0 });
    }

    const notifications = users.map((u) => ({
      senderId: req.user.id,
      receiverId: u._id,
      type: 'ADMIN_BROADCAST',
      title,
      message,
      image: '',
      link: link || '',
    }));

    const saved = await Notification.insertMany(notifications);

    // Real-time push to all online users
    const io = req.app.get('io');
    if (io) {
      const onlineUsers = getUsers();
      saved.forEach((notif) => {
        const userSocket = onlineUsers.find((u) => u.userId === notif.receiverId.toString());
        if (userSocket) {
          io.to(userSocket.socketId).emit('newNotification', {
            _id: notif._id,
            senderId: notif.senderId,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            image: notif.image,
            link: notif.link,
            isRead: false,
            createdAt: notif.createdAt,
          });
        }
      });
    }

    res.status(201).json({ success: true, message: 'Đã gửi thông báo đến toàn hệ thống', sent: saved.length });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};