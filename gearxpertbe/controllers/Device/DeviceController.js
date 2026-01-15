const Device = require('../../models/Device');

/**
 * GET /devices
 * Get list of available devices with optional filters
 */
exports.getDevices = async (req, res) => {
  try {
    const { category, limit = 12, page = 1 } = req.query;
    
    const query = { 
      status: 'AVAILABLE',
      isAddon: false 
    };
    
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const devices = await Device.find(query)
      .select('name rentPrice ratingAvg reviewCount location images category')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ ratingAvg: -1, reviewCount: -1 });

    const total = await Device.countDocuments(query);

    res.json({
      devices,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /devices/:id
 */
exports.getDeviceDetail = async (req, res) => {
  const device = await Device.findById(req.params.id)
    .populate('supplierId', 'fullName avatar');

  if (!device) {
    return res.status(404).json({ message: 'Device not found' });
  }

  res.json(device);
};
/**
 * GET /devices/:id/addons
 */
exports.getDeviceAddons = async (req, res) => {
    const deviceId = req.params.id;
  
    const addons = await Device.find({
      isAddon: true,
      compatibleWith: deviceId,
      status: 'AVAILABLE'
    }).select('name rentPrice images');
  
    res.json(addons);
  };
/**
 * GET /devices/:id/related
 */
exports.getRelatedDevices = async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: 'Device not found' });
  
    const related = await Device.find({
      _id: { $ne: device._id },
      category: device.category,
      status: 'AVAILABLE'
    })
      .limit(4)
      .select('name rentPrice ratingAvg location images');
  
    res.json(related);
  };
    