/**
 * Email Templates Module
 * Centralizes all email HTML structures for GearXpert
 */

const baseTemplate = (content) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #1a1a1a; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px;">GEARXPERT</h1>
            <p style="margin: 5px 0 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Professional Equipment Rental</p>
        </div>
        <div style="padding: 40px; background: #ffffff; color: #333333; line-height: 1.6;">
            ${content}
        </div>
        <div style="padding: 24px; background: #f9fafb; border-top: 1px solid #eeeeee; text-align: center; color: #999999; font-size: 12px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} GearXpert Team. All rights reserved.</p>
            <p style="margin: 5px 0 0;">Dịch vụ thuê thiết bị công nghệ hàng đầu Việt Nam.</p>
        </div>
    </div>
`;

/**
 * Registration Verification Template
 */
const registrationTemplate = (fullName, verifyLink) => {
    return baseTemplate(`
        <h2 style="color: #1a1a1a; margin-top: 0;">Xác thực tài khoản</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Chào mừng bạn đến với <strong>GearXpert</strong>! Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi.</p>
        <p>Để hoàn tất quá trình đăng ký, vui lòng xác nhận địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p>
        <div style="text-align: center; margin: 35px 0;">
            <a href="${verifyLink}" style="background: #e67e22; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background 0.3s ease;">Xác thực ngay</a>
        </div>
        <p style="font-size: 13px; color: #666; background: #fff8e1; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn trong vòng <strong>5 phút</strong>.
        </p>
        <p style="margin-top: 25px;">Nếu bạn không đăng ký tài khoản tại GearXpert, vui lòng bỏ qua email này.</p>
    `);
};

/**
 * Password Reset Template
 */
const passwordResetTemplate = (fullName, resetLink) => {
    return baseTemplate(`
        <h2 style="color: #1a1a1a; margin-top: 0;">Yêu cầu đặt lại mật khẩu</h2>
        <p>Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản GearXpert của bạn.</p>
        <p>Vui lòng nhấn vào nút bên dưới để tiến hành đặt mật khẩu mới:</p>
        <div style="text-align: center; margin: 35px 0;">
            <a href="${resetLink}" style="background: #1a1a1a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Đặt lại mật khẩu</a>
        </div>
        <p style="font-size: 13px; color: #666; background: #fff5f5; padding: 10px; border-radius: 6px; border-left: 4px solid #f56565;">
            <strong>Cảnh báo:</strong> Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng liên hệ hỗ trợ ngay lập tức vì tài khoản của bạn có thể đang gặp rủi ro.
        </p>
        <p style="margin-top: 25px; font-size: 12px; color: #999;">Email này được gửi tự động, vui lòng không trả lời.</p>
    `);
};

/**
 * OTP for Password Change Template
 */
const otpPasswordChangeTemplate = (fullName, otp) => {
    return baseTemplate(`
        <h2 style="color: #1a1a1a; margin-top: 0;">Mã xác thực đổi mật khẩu</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Bạn đã yêu cầu đổi mật khẩu tại trang Cá nhân. Vui lòng sử dụng mã OTP dưới đây để xác thực:</p>
        <div style="text-align: center; margin: 35px 0;">
            <div style="background: #f4f4f5; color: #1a1a1a; padding: 20px 40px; font-size: 36px; font-weight: 800; letter-spacing: 10px; border-radius: 12px; display: inline-block; border: 1px dashed #d1d5db;">
                ${otp}
            </div>
        </div>
        <p style="color: #e53e3e; font-weight: bold; text-align: center;">Mã OTP này sẽ hết hạn sau 5 phút.</p>
        <p style="margin-top: 25px; font-size: 13px; color: #666;">
            Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên GearXpert để bảo vệ tài khoản của bạn.
        </p>
    `);
};

/**
 * Account Status Change Template (Ban/Unban)
 */
const accountStatusChangeTemplate = (fullName, newStatus) => {
    const isBlocked = newStatus === 'BLOCKED';
    const statusText = isBlocked ? 'BỊ KHÓA' : 'ĐÃ ĐƯỢC MỞ KHÓA';
    const statusColor = isBlocked ? '#e53e3e' : '#38a169';
    const message = isBlocked
        ? 'Chúng tôi rất tiếc phải thông báo rằng tài khoản của bạn đã bị tạm khóa do vi phạm điều khoản dịch vụ hoặc phát hiện hoạt động bất thường.'
        : 'Chúc mừng! Tài khoản của bạn đã được quản trị viên kiểm tra và mở khóa thành công. Bây giờ bạn có thể tiếp tục sử dụng tất cả dịch vụ của GearXpert.';

    return baseTemplate(`
        <h2 style="color: #1a1a1a; margin-top: 0;">Thông báo trạng thái tài khoản</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Hệ thống GearXpert xin thông báo về sự thay đổi trạng thái tài khoản của bạn:</p>
        
        <div style="text-align: center; margin: 30px 0; padding: 20px; border-radius: 12px; background: ${statusColor}10; border: 1px solid ${statusColor}30;">
            <span style="font-size: 18px; font-weight: bold; color: ${statusColor};">${statusText}</span>
        </div>

        <p style="color: #4a5568;">${message}</p>

        ${isBlocked ? `
            <div style="background: #fff5f5; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #c53030; font-weight: bold;">Bạn cần làm gì?</p>
                <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 13px; color: #742a2a;">
                    <li>Kiểm tra lại các giao dịch hoặc hoạt động gần đây.</li>
                    <li>Liên hệ với bộ phận hỗ trợ qua email <a href="mailto:support@gearxpert.com" style="color: #c53030;">support@gearxpert.com</a> để khiếu nại hoặc yêu cầu giải trình.</li>
                </ul>
            </div>
        ` : `
            <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL}" style="background: #1a1a1a; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Quay lại GearXpert</a>
            </div>
        `}

        <p style="margin-top: 25px; font-size: 13px; color: #718096; border-top: 1px solid #edf2f7; pt: 15px;">
            Trân trọng,<br>
            <strong>Đội ngũ Quản trị viên GearXpert</strong>
        </p>
    `);
};

module.exports = {
    registrationTemplate,
    passwordResetTemplate,
    otpPasswordChangeTemplate,
    accountStatusChangeTemplate
};
