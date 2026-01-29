const DamageReport = require("../../models/DamageReport");
const Rental = require("../../models/Rental");

exports.createDamageReport = async (req, res) => {
    try {
      const {
        rentalId,
        rentalItemId,
        deviceId,
        description,
        severity,
      } = req.body;
  
      const rental = await Rental.findById(rentalId);
      if (!rental) {
        return res.status(404).json({ message: "Rental not found" });
      }
  
      if (rental.status !== "RENTING") {
        return res.status(400).json({
          message: "Damage report only allowed during renting",
        });
      }
  
      const images = req.files?.map((file) => file.path) || [];
  
      const report = await DamageReport.create({
        rentalId,
        rentalItemId,
        deviceId,
        customerId: req.user.id,
        description,
        severity,
        images,
      });
  
      res.status(201).json({
        message: "Damage reported successfully",
        data: report,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  

exports.getDamageReportsByRental = async (req, res) => {
  const reports = await DamageReport.find({
    rentalId: req.params.rentalId,
  }).populate("deviceId");
  res.json(reports);
};
