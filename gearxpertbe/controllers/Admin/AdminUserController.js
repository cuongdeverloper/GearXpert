const User = require('../../models/User');
const { sendMail } = require('../../configs/sendMail');
const { accountStatusChangeTemplate } = require('../../utils/EmailTemplates');

const getAllUsers = async (req, res) => {
    try {
        // Find all users except ADMIN
        const users = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách người dùng"
        });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userRecord = await User.findById(id);

        if (!userRecord) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        if (userRecord.role === 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: "Không thể khóa tài khoản Admin"
            });
        }

        const newStatus = userRecord.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        userRecord.status = newStatus;
        await userRecord.save();

        // Gửi mail thông báo chuyên nghiệp
        try {
            const emailContent = accountStatusChangeTemplate(userRecord.fullName, newStatus);
            const subject = newStatus === 'BLOCKED'
                ? 'Thông báo: Tài khoản GearXpert của bạn đã bị khóa'
                : 'Thông báo: Chúc mừng! Tài khoản GearXpert của bạn đã được mở khóa';

            await sendMail(userRecord.email, subject, emailContent);
        } catch (mailError) {
            console.error("Mail sending error after status toggle:", mailError);
            // We don't want to fail the status change if only the email fails
        }

        return res.status(200).json({
            success: true,
            message: `Đã ${newStatus === 'ACTIVE' ? 'mở khóa' : 'khóa'} người dùng thành công`,
            data: { id: userRecord._id, status: newStatus }
        });
    } catch (error) {
        console.error("Toggle user status error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật trạng thái người dùng"
        });
    }
};

const getAdmins = async (req, res) => {
    try {
        const admins = await User.find(
            { role: 'ADMIN' },
            { password: 0 }
        ).sort({ fullName: 1 });

        res.status(200).json({
            success: true,
            admins: admins.map((a) => ({
                _id: a._id,
                fullName: a.fullName,
                role: a.role,
            })),
        });
    } catch (error) {
        console.error("Get admins error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách admin",
        });
    }
};

module.exports = {
    getAllUsers,
    toggleUserStatus,
    getAdmins,
};
