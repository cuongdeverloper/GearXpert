const express = require('express');
const rentalRouter = express.Router();
const { checkoutRental, hasRentedDevice, verifyRentalPayment, getSupplierRentals, approveRental, rejectRental, getSupplierRevenue } = require('../controllers/Rental/RentalController');
const { checkAccessToken } = require('../middleware/JWTAction');

rentalRouter.post('/checkout', checkAccessToken, checkoutRental);
rentalRouter.get('/has-rented/:deviceId', checkAccessToken, hasRentedDevice);
rentalRouter.get('/verify-payment', checkAccessToken, verifyRentalPayment);
rentalRouter.get('/supplier/:supplierId', checkAccessToken, getSupplierRentals);
rentalRouter.get('/supplier/:supplierId/revenue', checkAccessToken, getSupplierRevenue);
// Approve rental
rentalRouter.patch("/:rentalId/approve", checkAccessToken, approveRental);
// Reject rental
rentalRouter.patch("/:rentalId/reject", checkAccessToken, rejectRental);

module.exports = rentalRouter;
