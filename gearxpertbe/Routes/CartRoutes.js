const routerCart = require('express').Router();
const cartController = require('../controllers/Cart/CartController');
const { checkAccessToken } = require('../middleware/JWTAction');

routerCart.get('/', checkAccessToken, cartController.getCart);
routerCart.post('/items', checkAccessToken, cartController.addToCart);
routerCart.post('/instant', checkAccessToken, cartController.instantBuy);

module.exports = routerCart;
