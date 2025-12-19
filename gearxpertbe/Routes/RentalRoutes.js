const express = require('express');
const rentalRouter = express.Router();
const { checkoutRental } = require('../controllers/Rental/RentalController');
const { checkAccessToken } = require('../middleware/JWTAction');

rentalRouter.post('/checkout', checkAccessToken, checkoutRental);

module.exports = rentalRouter;
