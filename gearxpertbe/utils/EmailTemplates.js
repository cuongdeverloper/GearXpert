/**
 * Email Templates Module
 * Centralizes all email HTML structures for GearXpert
 */

const escapeHtml = (s) => {
  if (s == null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

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
        <p>Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
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

/**
 * Supplier onboarding: đăng ký NCC được admin phê duyệt
 */
const supplierOnboardingApprovedTemplate = (fullName) => {
  const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const supplierUrl = baseUrl ? `${baseUrl}/supplier` : "#";
  const safeName = escapeHtml(fullName || "Quý khách");
  return baseTemplate(`
        <h2 style="color: #1a1a1a; margin-top: 0;">Đăng ký nhà cung cấp được phê duyệt</h2>
        <p>Xin chào <strong>${safeName}</strong>,</p>
        <p>Yêu cầu trở thành nhà cung cấp của bạn đã được <strong style="color:#16a34a;">phê duyệt</strong>.</p>
        <p>Tài khoản của bạn đã được nâng cấp thành <strong>Nhà cung cấp</strong>. Bạn có thể đăng thiết bị, quản lý cửa hàng và nhận đơn thuê trên GearXpert.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${supplierUrl}" style="background: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Vào khu vực nhà cung cấp</a>
        </div>
        <p style="font-size: 13px; color: #718096;">Trân trọng,<br><strong>Đội ngũ GearXpert</strong></p>
    `);
};

/**
 * Supplier onboarding: đăng ký NCC bị từ chối
 */
const supplierOnboardingRejectedTemplate = (fullName, rejectionReason) => {
  const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const profileUrl = baseUrl ? `${baseUrl}/profile` : "#";
  const safeName = escapeHtml(fullName || "Quý khách");
  const safeReason = escapeHtml(rejectionReason || "");
  return baseTemplate(`
        <h2 style="color: #1a1a1a; margin-top: 0;">Kết quả duyệt đăng ký nhà cung cấp</h2>
        <p>Xin chào <strong>${safeName}</strong>,</p>
        <p>Rất tiếc, yêu cầu trở thành nhà cung cấp của bạn <strong style="color:#dc2626;">chưa được chấp nhận</strong> tại thời điểm này.</p>
        <div style="background: #fef2f2; padding: 16px 18px; border-radius: 10px; border-left: 4px solid #ef4444; margin: 22px 0;">
            <p style="margin:0; font-size: 12px; font-weight: bold; color: #991b1b; text-transform: uppercase;">Lý do</p>
            <p style="margin: 8px 0 0; color: #334155; line-height: 1.5;">${safeReason}</p>
        </div>
        <p style="color: #4b5563;">Bạn có thể cập nhật thông tin và gửi lại yêu cầu khi đã chuẩn bị đầy đủ hồ sơ.</p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="${profileUrl}" style="background: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Về trang cá nhân</a>
        </div>
        <p style="font-size: 13px; color: #718096;">Trân trọng,<br><strong>Đội ngũ GearXpert</strong></p>
    `);
};

/**
 * Blog Status Templates
 */
const blogStatusTemplate = (authorName, postTitle, status, reason = "") => {
    let title = "";
    let color = "";
    let message = "";
    let buttonHtml = "";
    let reasonHtml = "";

    if (status === "approved") {
        title = "Bài viết đã được xuất bản!";
        color = "#16a34a"; // emerald-600
        message = `Chúc mừng! Bài viết "<strong>${postTitle}</strong>" của bạn đã chính thức được phê duyệt và xuất bản trên GearXpert. Bây giờ mọi người đã có thể đọc và tương tác với bài viết của bạn.`;
        buttonHtml = `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/blog" style="background: #16a34a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.2);">Xem bài viết ngay</a>
            </div>
        `;
    } else if (status === "rejected") {
        title = "Kết quả duyệt bài viết";
        color = "#dc2626"; // red-600
        message = `Chào ${authorName}, bài viết "<strong>${postTitle}</strong>" của bạn đã được quản trị viên xem xét, nhưng rất tiếc nó chưa đáp ứng đủ tiêu chuẩn để xuất bản tại thời điểm này.`;
        reasonHtml = `
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; border-left: 5px solid #ef4444; margin: 25px 0;">
                <p style="margin: 0; font-weight: bold; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Lý do từ chối:</p>
                <p style="margin: 10px 0 0 0; color: #333; line-height: 1.5;">${reason}</p>
            </div>
            <p style="font-size: 14px; color: #666;">Bạn có thể chỉnh sửa lại nội dung dựa trên lý do trên và gửi lại yêu cầu duyệt bài.</p>
        `;
    } else if (status === "deleted") {
        title = "Thông báo gỡ bài viết";
        color = "#e11d48"; // rose-600
        message = `Chúng tôi rất tiếc phải thông báo rằng bài viết "<strong>${postTitle}</strong>" của bạn đã bị gỡ khỏi hệ thống GearXpert do vi phạm chính sách nội dung hoặc yêu cầu từ quản trị viên.`;
        reasonHtml = `
            <div style="background-color: #fff1f2; padding: 20px; border-radius: 12px; border-left: 5px solid #fb7185; margin: 25px 0;">
                <p style="margin: 0; font-weight: bold; color: #881337; font-size: 14px;">Lý do gỡ bài:</p>
                <p style="margin: 10px 0 0 0; color: #333; line-height: 1.5;">${reason}</p>
            </div>
        `;
    }

    return baseTemplate(`
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 12px 24px; border-radius: 50px; background: ${color}15; color: ${color}; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                ${status === 'approved' ? '✓ Success' : status === 'rejected' ? '✕ Review' : '⚠ Alert'}
            </div>
            <h2 style="color: #1a1a1a; margin: 15px 0 0; font-size: 24px;">${title}</h2>
        </div>
        
        <p>Xin chào <strong>${authorName}</strong>,</p>
        <p style="color: #4b5563;">${message}</p>
        
        ${reasonHtml}
        ${buttonHtml}
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af;">
            Nếu bạn có bất kỳ thắc mắc nào về quyết định này, vui lòng liên hệ với ban quản trị qua trung tâm hỗ trợ của chúng tôi.
        </p>
    `);
};

/**
 * Comment Deleted Template
 */
const commentDeletedTemplate = (userName, postTitle, commentContent, reason = "Vi phạm tiêu chuẩn cộng đồng") => {
    return baseTemplate(`
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 12px 24px; border-radius: 50px; background: #e11d4815; color: #e11d48; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                ⚠ Cảnh báo nội dung
            </div>
            <h2 style="color: #1a1a1a; margin: 15px 0 0; font-size: 24px;">Bình luận của bạn đã bị gỡ</h2>
        </div>
        
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p style="color: #4b5563;">Hệ thống GearXpert xin thông báo: Bình luận của bạn trong bài viết "<strong>${postTitle}</strong>" đã bị gỡ bỏ bởi quản trị viên.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 25px 0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase;">Nội dung bình luận:</p>
            <p style="margin: 10px 0 0 0; color: #334155; font-style: italic; line-height: 1.5;">"${commentContent}"</p>
        </div>

        <div style="background-color: #fff1f2; padding: 20px; border-radius: 12px; border-left: 5px solid #fb7185; margin: 25px 0;">
            <p style="margin: 0; font-weight: bold; color: #881337; font-size: 14px;">Lý do gỡ bỏ:</p>
            <p style="margin: 10px 0 0 0; color: #333; line-height: 1.5;">${reason}</p>
        </div>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af;">
            Vui lòng tuân thủ quy tắc cộng đồng để xây dựng môi trường chia sẻ lành mạnh. Nếu bạn có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ.
        </p>
    `);
};

/**
 * Shop Report Status Template
 */
const shopReportStatusTemplate = (reporterName, shopName, status, adminNotes = "") => {
    let title = "Cập nhật tiến độ xử lý báo cáo";
    let color = "#6366f1"; // indigo-500
    let message = "";
    let statusLabel = "";

    if (status === "RECEIVED") {
        statusLabel = "ĐÃ TIẾP NHẬN";
        color = "#6366f1";
        message = `Cảm ơn bạn đã phản hồi. Quản trị viên GearXpert đã tiếp nhận báo cáo của bạn về cửa hàng <strong>${shopName}</strong> và đang tiến hành xác minh xử lý.`;
    } else if (status === "RESOLVED") {
        statusLabel = "ĐÃ XỬ LÝ XONG";
        color = "#10b981"; // emerald-500
        message = `Cảm ơn bạn rất nhiều! Báo cáo của bạn về cửa hàng <strong>${shopName}</strong> đã được chúng tôi xử lý hoàn tất. Những đóng góp của bạn là vô cùng quý giá để giúp xây dựng cộng đồng GearXpert uy tín và minh bạch.`;
    } else if (status === "REJECTED") {
        statusLabel = "BÁC BỎ BÁO CÁO";
        color = "#f43f5e"; // rose-500
        message = `Sau khi xem xét các bằng chứng mà bạn cung cấp về cửa hàng <strong>${shopName}</strong>, quản trị viên quyết định bác bỏ báo cáo này do chưa đủ căn cứ hoặc không vi phạm chính sách.`;
    }

    return baseTemplate(`
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 10px 20px; border-radius: 50px; background: ${color}15; color: ${color}; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${color}30;">
                ${statusLabel}
            </div>
            <h2 style="color: #1a1a1a; margin: 15px 0 0; font-size: 22px;">${title}</h2>
        </div>
        
        <p>Xin chào <strong>${reporterName}</strong>,</p>
        <p style="color: #4b5563;">${message}</p>
        
        ${adminNotes ? `
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 16px; border-left: 5px solid ${color}; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <p style="margin: 0; font-weight: 800; color: ${color}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Phản hồi từ Admin:</p>
                <div style="margin: 12px 0 0 0; color: #334155; line-height: 1.6; font-size: 15px;">${adminNotes}</div>
            </div>
        ` : ""}
        
        <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #f3f4f6;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ:</p>
            <div style="display: flex; gap: 15px; font-size: 13px;">
                <span style="color: #1a1a1a;"><strong>Hotline:</strong> 1900 8888</span>
                <span style="color: #1a1a1a;"><strong>Email:</strong> support@gearxpert.com</span>
            </div>
        </div>
    `);
};

/**
 * Shop Report Notification for Supplier (Shop Owner) Template
 */
const shopReportNotificationForSupplierTemplate = (supplierName, shopName, reportReason, reportDescription) => {
    return baseTemplate(`
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 10px 20px; border-radius: 50px; background: #f59e0b15; color: #f59e0b; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #f59e0b30;">
                ⚠ THÔNG BÁO BÁO CÁO
            </div>
            <h2 style="color: #1a1a1a; margin: 15px 0 0; font-size: 22px;">Cửa hàng của bạn vừa bị báo cáo</h2>
        </div>
        
        <p>Xin chào <strong>${supplierName}</strong>,</p>
        <p style="color: #4b5563;">Hệ thống GearXpert xin thông báo: Cửa hàng <strong>${shopName}</strong> của bạn vừa nhận được một báo cáo từ người dùng với nội dung như sau:</p>
        
        <div style="background-color: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <p style="margin: 0; font-weight: 800; color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Lý do báo cáo:</p>
            <p style="margin: 8px 0 15px 0; color: #dc2626; font-weight: bold; font-size: 15px;">${reportReason}</p>
            
            <p style="margin: 15px 0 0 0; font-weight: 800; color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Chi tiết phản ánh:</p>
            <div style="margin: 8px 0 0 0; color: #334155; line-height: 1.6; font-size: 15px; font-style: italic;">"${reportDescription}"</div>
        </div>
        
        <div style="background-color: #fffbeb; padding: 20px; border-radius: 12px; border-left: 5px solid #fbbf24; margin-top: 25px;">
            <p style="margin: 0; font-weight: bold; color: #92400e; font-size: 14px;">Bạn cần làm gì?</p>
            <p style="margin: 8px 0 0; color: #b45309; font-size: 13px; line-height: 1.5;">Vui lòng <strong>phản hồi (reply) trực tiếp email này</strong> kèm theo các hình ảnh, tài liệu và thông tin cần thiết để chứng minh cho uy tín của shop hoặc đối chứng với các nội dung bị báo cáo. Việc phản hồi sớm sẽ giúp ban quản trị GearXpert có căn cứ xử lý chính xác và bảo vệ quyền lợi hợp pháp của bạn.</p>
        </div>
        
        <p style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af;">
            Đây là thông báo tự động từ hệ thống quản trị rủi ro GearXpert. Vui lòng không trả lời email này trực tiếp.
        </p>
    `);
};

/**
 * Order Confirmation Template
 * Used for both Wallet and Bank Checkout
 */
const orderConfirmationTemplate = (fullName, rentals, orderCode) => {
    const safeName = escapeHtml(fullName || "Quý khách");
    const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    
    let totalAll = 0;
    let itemsHtml = "";

    rentals.forEach((rental, idx) => {
        totalAll += rental.totalAmount || 0;
        
        // Header for each shop/supplier if multiple
        if (rentals.length > 1) {
            itemsHtml += `
            <div style="margin-top: 20px; padding: 10px; background: #f8fafc; border-radius: 8px; font-weight: bold; color: #1a1a1a; font-size: 14px;">
                Cửa hàng #${idx + 1}: ${escapeHtml(rental.supplierName || 'Nhà cung cấp')}
            </div>`;
        }

        itemsHtml += `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr style="border-bottom: 2px solid #f1f1f1; text-align: left;">
                    <th style="padding: 12px 8px; font-size: 12px; color: #666; text-transform: uppercase;">Thiết bị</th>
                    <th style="padding: 12px 8px; font-size: 12px; color: #666; text-transform: uppercase; text-align: center;">SL</th>
                    <th style="padding: 12px 8px; font-size: 12px; color: #666; text-transform: uppercase; text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
        `;

        rental.items.forEach(item => {
            const itemName = escapeHtml(item.name || "Thiết bị");
            const itemPrice = (item.totalAmount || item.rentPrice || 0).toLocaleString('vi-VN');
            itemsHtml += `
                <tr style="border-bottom: 1px solid #f9f9f9;">
                    <td style="padding: 12px 8px;">
                        <div style="font-weight: 600; color: #333;">${itemName}</div>
                        <div style="font-size: 11px; color: #999;">Từ ngày ${new Date(item.rentalStartDate).toLocaleDateString('vi-VN')}</div>
                    </td>
                    <td style="padding: 12px 8px; text-align: center; color: #666;">${item.quantity}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1a1a1a;">${itemPrice}đ</td>
                </tr>
            `;
        });

        itemsHtml += `
            </tbody>
        </table>
        `;
        
        // Subtotal for this rental
        itemsHtml += `
        <div style="text-align: right; padding: 10px 8px; font-size: 13px; color: #666;">
            Cọc & Phí: <span style="color: #333;">${((rental.depositAmount || 0) + (rental.deliveryFee || 0)).toLocaleString('vi-VN')}đ</span>
        </div>
        `;
    });

    return baseTemplate(`
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 8px 16px; border-radius: 50px; background: #16a34a15; color: #16a34a; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                ✓ Đã thanh toán
            </div>
            <h2 style="color: #1a1a1a; margin: 15px 0 5px; font-size: 24px;">Cảm ơn bạn đã đặt hàng!</h2>
            <p style="color: #666; margin: 0; font-size: 14px;">Mã đơn hàng: <strong style="color: #1a1a1a;">${orderCode || 'GXP-' + Date.now()}</strong></p>
        </div>
        
        <p>Xin chào <strong>${safeName}</strong>,</p>
        <p style="color: #4b5563;">Đơn hàng của bạn đã được xác nhận thành công. Dưới đây là tóm tắt thông tin thuê thiết bị của bạn:</p>
        
        ${itemsHtml}
        
        <div style="margin-top: 30px; padding: 20px; background: #1a1a1a; border-radius: 12px; color: #ffffff;">
            <table style="width: 100%;">
                <tr>
                    <td style="font-size: 14px; opacity: 0.8;">Tổng cộng thanh toán</td>
                    <td style="text-align: right; font-size: 22px; font-weight: 800;">${totalAll.toLocaleString('vi-VN')}đ</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin: 35px 0;">
            <a href="${rentals.length === 1 ? `${baseUrl}/my-rentals/${rentals[0]._id}` : `${baseUrl}/my-rentals`}" style="background: #e67e22; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Quản lý đơn thuê</a>
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 25px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #1a1a1a; font-size: 14px;">Lưu ý quan trọng:</p>
            <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 13px; color: #4b5563; line-height: 1.6;">
                <li>Nhà cung cấp sẽ xác nhận đơn hàng trong vòng 24h.</li>
                <li>Hợp đồng điện tử đã được tạo và lưu trữ trên hệ thống.</li>
                <li>Vui lòng giữ điện thoại để nhân viên giao hàng liên lạc.</li>
            </ul>
        </div>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af; text-align: center;">
            Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ hotline 1900 8888 hoặc email support@gearxpert.online
        </p>
    `);
};

module.exports = {
    registrationTemplate,
    passwordResetTemplate,
    otpPasswordChangeTemplate,
    accountStatusChangeTemplate,
    supplierOnboardingApprovedTemplate,
    supplierOnboardingRejectedTemplate,
    blogStatusTemplate,
    commentDeletedTemplate,
    shopReportStatusTemplate,
    shopReportNotificationForSupplierTemplate,
    orderConfirmationTemplate
};
