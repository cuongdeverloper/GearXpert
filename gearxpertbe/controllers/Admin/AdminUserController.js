const User = require('../../models/User');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');
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

const getOperationStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'OPERATION_STAFF' }).sort({ createdAt: -1 });
        
        // Count tasks for each staff
        const staffWithTaskCount = await Promise.all(staff.map(async (s) => {
            const taskCount = await Rental.countDocuments({
                assignedOperationStaffId: s._id,
                status: { $in: ['APPROVED', 'DELIVERING', 'RETURNING', 'INSPECTING'] }
            });
            return {
                ...s.toObject(),
                activeTaskCount: taskCount
            };
        }));

        res.status(200).json({
            success: true,
            staff: staffWithTaskCount
        });
    } catch (error) {
        console.error("Get operation staff error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách nhân viên vận hành"
        });
    }
};

const getStaffTasks = async (req, res) => {
    try {
        const { id } = req.params;
        const rentals = await Rental.find({ assignedOperationStaffId: id })
            .populate('customerId', 'fullName email phone')
            .sort({ updatedAt: -1 });

        const tasks = await Promise.all(rentals.map(async (rental) => {
            const rentalItem = await RentalItem.findOne({ rentalId: rental._id })
                .populate('deviceId', 'name images');
            
            return {
                _id: rental._id,
                orderCode: rental.orderCode,
                status: rental.status,
                customerName: rental.customerId?.fullName || 'N/A',
                customerPhone: rental.phoneNumber || rental.customerId?.phone || 'N/A',
                address: rental.deliveryAddress?.fullAddress || 'N/A',
                deviceName: rentalItem?.deviceId?.name || 'Thiết bị',
                deviceImage: rentalItem?.deviceId?.images?.[0] || '',
                rentalStartDate: rentalItem?.rentalStartDate,
                rentalEndDate: rentalItem?.rentalEndDate,
                type: (rental.status === 'APPROVED' || rental.status === 'DELIVERING') ? 'DELIVERY' : 'RETURN'
            };
        }));

        res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error("Get staff tasks error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách nhiệm vụ của nhân viên"
        });
    }
};

module.exports = {
    getAllUsers,
    toggleUserStatus,
    getAdmins,
    getOperationStaff,
    getStaffTasks
};
