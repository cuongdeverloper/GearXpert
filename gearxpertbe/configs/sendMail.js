const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true, // Duy trì kết nối để tránh bị Gmail chặn khi gửi nhiều
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5, // Giới hạn 5 mail mỗi giây để tránh spam filter
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const sendMail = async (to, subject, html, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const mailOptions = {
                from: `"GearXpert" <${process.env.MAIL_USERNAME}>`,
                to: to,
                subject: subject,
                html: html,
            };

            const info = await transporter.sendMail(mailOptions);
            return info;

        } catch (error) {
            console.error(`[Mail Attempt ${attempt}/${retries}] Lỗi khi gửi tới ${to}:`, error.message);

            // Nếu lỗi do xác thực hoặc lỗi nghiêm trọng không thể thử lại
            if (error.responseCode && (error.responseCode === 535 || error.responseCode === 550)) {
                console.error(`[Mail Critical Error] Lỗi cấu hình hoặc tài khoản, không thử lại.`);
                break;
            }

            if (attempt === retries) {
                console.error(`[Mail Final Failure] Thất bại sau ${retries} lần thử.`);
                return null;
            }

            // Chờ trước khi thử lại (tăng dần thời gian chờ)
            const waitTime = attempt * 2000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

module.exports = { sendMail };