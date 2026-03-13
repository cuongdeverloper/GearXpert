const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ["CAMERA", "DRONE", "LIGHTING", "AI_TECH", "AUDIO", "CINEMATOGRAPHY", "ACCESSORIES", "INDUSTRY_NEWS"],
            required: true,
        },
        coverImage: {
            type: String,
            required: true,
        },
        author: {
            name: { type: String, required: true },
            avatar: { type: String },
        },
        readTime: {
            type: Number,
            default: 5,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        images: [String],
        views: {
            type: Number,
            default: 0,
        },
        savedBy: [String], // Array of usernames/emails
        likes: {
            type: [String], // Array of user emails/usernames
            default: [],
        },
        comments: [
            {
                user: { type: String, required: true },
                avatar: { type: String },
                text: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
    },
    { timestamps: true }
);

blogSchema.index({ title: "text", description: "text", category: "text", status: "text" });

module.exports = mongoose.model("Blog", blogSchema);
