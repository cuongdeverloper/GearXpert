const { Resend } = require('resend');
require('dotenv').config();

// Khởi tạo Resend với API Key từ .env
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Gửi email sử dụng Resend (Thay thế Nodemailer để đạt độ ổn định 99%+)
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung email dạng HTML
 */
const sendMail = async (to, subject, html) => {
    try {
        console.log(`[Resend] Đang gửi email tới: ${to}`);

        // Lưu ý: Nếu chưa verify domain trên Resend, bạn chỉ có thể gửi từ 'onboarding@resend.dev'
        // và người nhận phải là email bạn đã đăng ký với Resend.
        // Sau khi verify domain, hãy đổi địa chỉ 'from' thành email của domain đó (vđ: info@gearxpert.vn)
        const { data, error } = await resend.emails.send({
            from: 'GearXpert <no-reply@gearxpert.online>', // Đổi thành 'GearXpert <your-email@your-domain.com>' sau khi verify
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error(`[Resend] Lỗi khi gửi email tới ${to}:`);
            console.error(`Mã lỗi: ${error.name}`);
            console.error(`Thông báo: ${error.message}`);
            return null;
        }

        console.log(`[Resend] Email gửi thành công! ID: ${data.id}`);
        return data;
    } catch (error) {
        console.error(`[Resend] Lỗi hệ thống khi gửi email tới ${to}:`, error.message);
        return null;
    }
};

module.exports = { sendMail };