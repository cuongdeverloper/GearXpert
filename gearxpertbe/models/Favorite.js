const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
        index: true
    }
}, { timestamps: true });

// Composite unique index to prevent duplicate favorites
favoriteSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
