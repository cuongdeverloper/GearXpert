const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            required: true,
        },
        adsType: [
            {
                type: String,
                enum: ["BANNER", "POPUP"],
                required: true,
            },
        ],
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
            default: "PENDING",
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        dailyBudget: {
            type: Number,
            required: true,
            min: 10000, // Minimum 10k VND per day
        },
        totalCost: {
            type: Number,
            required: true,
        },
        paidAmount: {
            type: Number,
            default: 0,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Advertisement", advertisementSchema);
