const Contract = require("../../models/Contract");
const ContractFile = require("../../models/ContractFile");

exports.uploadContractFile = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { fileUrl, fileType } = req.body;

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    await ContractFile.create({
      contractId,
      fileUrl,
      fileType,
      uploadedBy: req.user._id,
    });

    // đánh dấu đã ký ngoài đời
    contract.status = "SIGNED";
    contract.signedByCustomer = true;
    contract.signedByStaff = true;
    contract.signedAt = new Date();

    await contract.save();

    res.json({ message: "Contract uploaded & signed" });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
};
exports.getContractByRental = async (req, res) => {
    const { rentalId } = req.params;
  
    const contract = await Contract.findOne({ rentalId });
    if (!contract) {
      return res.status(404).json({ message: "No contract found" });
    }
  
    const items = await ContractItem.find({ contractId: contract._id })
      .populate("deviceId");
  
    const files = await ContractFile.find({ contractId: contract._id });
  
    res.json({
      contract,
      items,
      files,
    });
  };
  
  