const nodemailer = require('nodemailer');
require('dotenv').config();

// Cấu hình transporter cho Gmail
// Nên sử dụng cổng 465 cho SSL hoặc 587 cho STARTTLS
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use true for port 465, false for all other ports
    auth: {
        user: process.env.MAIL_USERNAME, 
        pass: process.env.MAIL_PASSWORD, // Mật khẩu ứng dụng 16 ký tự
    },
});

/**
 * Gửi email sử dụng Nodemailer
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung email dạng HTML
 */
const sendMail = async (to, subject, html) => {
    const mailOptions = {
        from: `"GearXpert" <${process.env.MAIL_USERNAME}>`,
        to: to,
        subject: subject,
        html: html,
    };

    try {
        console.log(`[Nodemailer] Đang gửi email tới: ${to}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Nodemailer] Email gửi thành công: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[Nodemailer] Lỗi khi gửi email tới ${to}:`);
        console.error(`Mã lỗi: ${error.code}`);
        console.error(`Thông báo: ${error.message}`);
        
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            console.error('=> Gợi ý: Server deploy của bạn đang chặn cổng SMTP. Hãy kiểm tra lại firewall.');
        }

        return null;
    }
};

module.exports = { sendMail };