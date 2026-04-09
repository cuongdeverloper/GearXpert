const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const sendMail = async (to, subject, html) => {
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
        console.error(`[Mail Error] Lỗi khi gửi mail tới ${to}:`, error.message);
        return null;
    }
};

module.exports = { sendMail };