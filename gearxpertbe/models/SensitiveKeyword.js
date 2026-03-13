const mongoose = require("mongoose");

const sensitiveKeywordSchema = new mongoose.Schema({
    keyword: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    createdBy: {
        type: String, // Admin name or email
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("SensitiveKeyword", sensitiveKeywordSchema);
