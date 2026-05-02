const Favorite = require('../../models/Favorite');
const Device = require('../../models/Device');
const DeviceItem = require('../../models/DeviceItem');
const mongoose = require('mongoose');
const NotificationConfig = require('../../configs/NotificationConfig');

/**
 * POST /api/favorites/toggle
 * Toggle favorite status for a device
 */
exports.toggleFavorite = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.user.id;
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ message: 'Device ID is required' });
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(deviceId)) {
            return res.status(400).json({ message: 'Invalid Device ID format' });
        }

        // Check if device exists
        const device = await Device.findById(deviceId);
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        // Check if favorite already exists
        const existingFavorite = await Favorite.findOne({ userId, deviceId });

        if (existingFavorite) {
            // Remove favorite
            await Favorite.deleteOne({ _id: existingFavorite._id });
            return res.json({
                isFavorited: false
            });
        } else {
            // Add favorite
            const newFavorite = await Favorite.create({ userId, deviceId });

            // Notify supplier
            try {
                await NotificationConfig.sendNotification({
                    senderId: userId,
                    receiverId: device.supplierId,
                    type: 'LIKE',
                    title: 'Yêu thích mới',
                    message: `Một người dùng đã yêu thích thiết bị "${device.name}" của bạn.`,
                    link: `/products/${device.slug}`,
                });
            } catch (notifErr) {
                console.error('Notify like error:', notifErr);
            }

            return res.json({
                isFavorited: true,
                favorite: newFavorite
            });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/favorites
 * Get all favorites for current user
 */
exports.getUserFavorites = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.user.id;
        const { page = 1, limit = 12 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const favorites = await Favorite.find({ userId })
            .populate({
                path: 'deviceId',
                select: 'name slug description rentPrice ratingAvg reviewCount location images category status discountPrice discountReason discountExpiry'
            })
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Filter out favorites where device was deleted
        const validFavorites = favorites.filter(fav => fav.deviceId !== null);

        // Compute availableQuantity for each device via DeviceItem
        const deviceIds = validFavorites.map(fav => fav.deviceId._id);
        const availability = await DeviceItem.aggregate([
            { $match: { deviceId: { $in: deviceIds }, status: 'AVAILABLE' } },
            { $group: { _id: '$deviceId', availableCount: { $sum: 1 } } }
        ]);
        const availMap = {};
        availability.forEach(a => { availMap[a._id.toString()] = a.availableCount; });

        const favoritesWithAvailability = validFavorites.map(fav => ({
            ...fav.toObject(),
            deviceId: {
                ...fav.deviceId.toObject(),
                availableQuantity: availMap[fav.deviceId._id.toString()] || 0
            }
        }));

        const total = await Favorite.countDocuments({ userId });

        res.json({
            favorites: favoritesWithAvailability,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/favorites/check/:deviceId
 * Check if a device is favorited by current user
 */
exports.checkIsFavorite = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.user.id;
        const { deviceId } = req.params;

        if (!deviceId) {
            return res.status(400).json({ message: 'Device ID is required' });
        }

        // Validate ObjectId - if invalid format, it can't be a valid favorite
        if (!mongoose.Types.ObjectId.isValid(deviceId)) {
            return res.json({ isFavorited: false });
        }

        const favorite = await Favorite.findOne({ userId, deviceId });

        res.json({ isFavorited: !!favorite });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/favorites/list
 * Get list of device IDs that are favorited by current user
 */
exports.getFavoriteDeviceIds = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.user.id;

        const favorites = await Favorite.find({ userId }).select('deviceId');
        const deviceIds = favorites.map(fav => fav.deviceId.toString());

        res.json({ deviceIds });
    } catch (error) {
        console.error('Get favorite IDs error:', error);
        res.status(500).json({ message: error.message });
    }
};
