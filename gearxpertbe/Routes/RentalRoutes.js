const express = require('express');
const rentalRouter = express.Router();
const { checkoutRental, hasRentedDevice } = require('../controllers/Rental/RentalController');
const { checkAccessToken } = require('../middleware/JWTAction');

rentalRouter.post('/checkout', checkAccessToken, checkoutRental);
rentalRouter.get('/has-rented/:deviceId', checkAccessToken, hasRentedDevice);
module.exports = rentalRouter;
