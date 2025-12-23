const Device = require('../../models/Device');

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
    