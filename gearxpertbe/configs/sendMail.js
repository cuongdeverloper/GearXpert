const nodemailer = require('nodemailer');
require('dotenv').config();

const sendMail = async (to, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', 
            auth: {
                user: process.env.MAIL_USERNAME, // Email của bạn (ví dụ: gearxpert@gmail.com)
                pass: process.env.MAIL_PASSWORD, // Mật khẩu ứng dụng 16 ký tự
            },
        });

        const mailOptions = {
            from: `"GearXpert" <${process.env.MAIL_USERNAME}>`,
            to: to,
            subject: subject,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;

    } catch (error) {
        return null;
    }
};

module.exports = { sendMail };