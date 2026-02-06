const express = require("express");
const ContractRouter = express.Router();
const contractController = require("../controllers/Contract/ContractController");

ContractRouter.get(
  "/rental/:rentalId",
  contractController.getContractByRental
);

ContractRouter.post(
  "/:contractId/upload-file",
  contractController.uploadContractFile
);

module.exports = ContractRouter;
