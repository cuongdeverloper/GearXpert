const express = require('express');
const rentalRouter = express.Router();
const { checkoutRental, hasRentedDevice, verifyRentalPayment } = require('../controllers/Rental/RentalController');
const { checkAccessToken } = require('../middleware/JWTAction');

rentalRouter.post('/checkout', checkAccessToken, checkoutRental);
rentalRouter.get('/has-rented/:deviceId', checkAccessToken, hasRentedDevice);
rentalRouter.get('/verify-payment', checkAccessToken, verifyRentalPayment);
module.exports = rentalRouter;
