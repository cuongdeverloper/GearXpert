const express = require("express");
const ContractRouter = express.Router();
const contractController = require("../controllers/Contract/ContractController");
const { checkAccessToken } = require("../middleware/JWTAction");

// Test endpoint for debugging
ContractRouter.post(
  "/test-preview",
  checkAccessToken,
  contractController.testPreview
);

// Preview contract with rental data (no rentalId required)
ContractRouter.post(
  "/preview-data",
  checkAccessToken,
  contractController.previewContractWithData
);

// Preview contract with rentalId
ContractRouter.get(
  "/preview/:rentalId",
  checkAccessToken,
  contractController.previewContract
);

ContractRouter.post(
  "/generate/:rentalId",
  checkAccessToken,
  contractController.generateContract
);

ContractRouter.get(
  "/:rentalId",
  checkAccessToken,
  contractController.getContractByRental
);

ContractRouter.post(
  "/:contractId/upload",
  checkAccessToken,
  contractController.uploadContractFile
);

module.exports = ContractRouter;
